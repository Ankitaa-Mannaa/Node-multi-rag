const aiService = require("./ai.service");
const vectorStore = require("./vectorStore.service");

const SCORE_KEYWORDS = /(score|match|fit|compare|ranking|rank|better|best)/i;
const JD_KEYWORDS = /(job description|responsibilities|requirements|qualifications|must have|nice to have|we are looking for)/i;
const GENERIC_KEYWORDS = /(generic|general|overall|format|structure|industry standard|industry standards|resume quality)/i;
const JOB_CHOICE_KEYWORDS = /(job|jd|description|role|position)/i;

const GENERIC_RUBRIC = [
  {
    id: "experience",
    label: "Work experience clarity",
    prompt: "Work experience section with roles, companies, dates, and responsibilities",
    weight: 0.25,
  },
  {
    id: "impact",
    label: "Quantified impact",
    prompt: "Quantified achievements with metrics, percentages, revenue, or performance improvements",
    weight: 0.2,
  },
  {
    id: "skills",
    label: "Skills coverage",
    prompt: "Skills section listing tools, technologies, programming languages, or frameworks",
    weight: 0.2,
  },
  {
    id: "education",
    label: "Education section",
    prompt: "Education section with degree, institution, and dates",
    weight: 0.15,
  },
  {
    id: "structure",
    label: "Structure and readability",
    prompt: "Clear summary or objective and well-structured sections with headings",
    weight: 0.2,
  },
];

const isScoringRequest = (message) => SCORE_KEYWORDS.test(message || "");

const looksLikeJobDescription = (message) => {
  if (!message) return false;
  const trimmed = message.trim();
  if (trimmed.length >= 120) return true;
  if (JD_KEYWORDS.test(trimmed)) return true;
  if (trimmed.split("\n").length >= 4) return true;
  return false;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const historyAskedScoreType = (history) => {
  if (!Array.isArray(history) || history.length === 0) return false;
  const lastAi = [...history].reverse().find((m) => m.role === "ai");
  if (!lastAi) return false;
  const text = lastAi.content || "";
  return (
    text.toLowerCase().includes("generic") &&
    text.toLowerCase().includes("job") &&
    text.toLowerCase().includes("description")
  );
};

const detectScoreChoice = (message, history) => {
  const text = (message || "").toLowerCase();
  if (GENERIC_KEYWORDS.test(text)) return "generic";
  if (JOB_CHOICE_KEYWORDS.test(text)) return "job";
  if (historyAskedScoreType(history)) {
    if (/^(generic|general|overall|format|structure|industry|standard)/i.test(text)) {
      return "generic";
    }
    if (/job|jd|description|role|position/i.test(text)) {
      return "job";
    }
  }
  return null;
};

async function computeGenericScore({ userId, ragType }) {
  const criteria = [];
  let weightedSum = 0;
  let weightTotal = 0;

  for (const item of GENERIC_RUBRIC) {
    const embedding = await aiService.createEmbedding(item.prompt);
    const matches = await vectorStore.listRelevantChunksWithScores(
      userId,
      ragType,
      embedding,
      5
    );
    const topScore = matches?.[0]?.score ?? 0;
    const normalized = clamp01(topScore);
    criteria.push({
      id: item.id,
      label: item.label,
      score: Math.round(normalized * 100),
    });
    weightedSum += normalized * item.weight;
    weightTotal += item.weight;
  }

  const average = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const overall = Math.round(clamp01(average) * 100);

  return {
    type: "generic",
    score: overall,
    similarity: Number(clamp01(average).toFixed(4)),
    criteria,
    note: "Generic score based on similarity to a resume quality rubric (structure, experience, skills, education, impact).",
  };
}

async function computeResumeScore({ userId, ragType, message, history }) {
  if (ragType !== "resume") return null;
  if (!isScoringRequest(message)) return null;

  const choice = detectScoreChoice(message, history);
  const hasJD = looksLikeJobDescription(message);
  if (hasJD) {
    // JD-based scoring
    const jdText = message.trim();
    const embedding = await aiService.createEmbedding(jdText);
    const matches = await vectorStore.listRelevantChunksWithScores(
      userId,
      ragType,
      embedding,
      10
    );

    if (!matches || matches.length === 0) {
      return {
        type: "job",
        score: 0,
        note: "No resume chunks found to score against the job description.",
        top_matches: [],
      };
    }

    const scores = matches
      .map((m) => (typeof m.score === "number" ? m.score : 0))
      .filter((n) => !Number.isNaN(n));
    const avg = scores.length
      ? scores.reduce((sum, n) => sum + n, 0) / scores.length
      : 0;
    const normalized = Math.round(clamp01(avg) * 100);

    return {
      type: "job",
      score: normalized,
      similarity: Number(clamp01(avg).toFixed(4)),
      note: "Score is based on vector similarity between resume chunks and the provided job description.",
      top_matches: matches.slice(0, 5).map((m) => ({
        file_name: m.fileName || null,
        chunk_index: typeof m.chunkIndex === "number" ? m.chunkIndex : null,
        score: Number(clamp01(m.score).toFixed(4)),
      })),
    };
  }

  if (choice === "generic") {
    return computeGenericScore({ userId, ragType });
  }

  if (choice === "job") {
    return {
      requires_job_description: true,
      note: "Job description is required for job-match scoring.",
    };
  }

  return {
    requires_score_choice: true,
    note: "Ask the user if they want a generic resume quality score or a job-match score.",
  };
}

module.exports = {
  computeResumeScore,
  isScoringRequest,
};
