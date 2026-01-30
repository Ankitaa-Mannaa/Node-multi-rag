const OpenAI = require("openai");
const {
  openrouterApiKey,
  openrouterBaseUrl,
  rerankerProvider,
  rerankerApiKey,
  rerankerModel,
  rerankerBaseUrl,
  rerankerTopK,
} = require("../config/env");

const toDocs = (candidates) => candidates.map((c) => c.content);

const rerankCohere = async (query, candidates) => {
  if (!rerankerApiKey || !rerankerModel) return candidates;
  const res = await fetch("https://api.cohere.com/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rerankerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: rerankerModel,
      query,
      documents: toDocs(candidates),
      top_n: Math.min(rerankerTopK, candidates.length),
    }),
  });
  if (!res.ok) return candidates;
  const data = await res.json();
  const results = data?.results || [];
  return results.map((r) => ({
    ...candidates[r.index],
    rerankScore: r.relevance_score,
  }));
};

const rerankVoyage = async (query, candidates) => {
  if (!rerankerApiKey || !rerankerModel) return candidates;
  const res = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rerankerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: rerankerModel,
      query,
      documents: toDocs(candidates),
      top_k: Math.min(rerankerTopK, candidates.length),
    }),
  });
  if (!res.ok) return candidates;
  const data = await res.json();
  const results = data?.data || [];
  return results.map((r) => ({
    ...candidates[r.index],
    rerankScore: r.relevance_score ?? r.score,
  }));
};

const rerankBge = async (query, candidates) => {
  if (!rerankerApiKey || !rerankerModel || !rerankerBaseUrl) return candidates;
  const res = await fetch(`${rerankerBaseUrl.replace(/\/$/, "")}/rerank`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rerankerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: rerankerModel,
      query,
      documents: toDocs(candidates),
      top_n: Math.min(rerankerTopK, candidates.length),
    }),
  });
  if (!res.ok) return candidates;
  const data = await res.json();
  const results = data?.results || data?.data || [];
  return results.map((r) => ({
    ...candidates[r.index],
    rerankScore: r.relevance_score ?? r.score,
  }));
};

const rerankOpenRouter = async (query, candidates) => {
  if (!openrouterApiKey || !rerankerModel) return candidates;
  const client = new OpenAI({
    apiKey: openrouterApiKey,
    baseURL: openrouterBaseUrl,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Multi-RAG AI Workspace",
    },
  });

  const docs = toDocs(candidates);
  const prompt = [
    "You are a reranker. Rank the following documents by relevance to the query.",
    "Return JSON: {\"order\":[{\"index\":number,\"score\":number}]} with highest relevance first.",
    "",
    `Query: ${query}`,
    "Documents:",
    ...docs.map((d, i) => `(${i}) ${d}`),
  ].join("\n");

  const res = await client.responses.create({
    model: rerankerModel,
    max_output_tokens: 300,
    input: [{ role: "user", content: prompt }],
  });
  const text = res.output_text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return candidates;
  try {
    const parsed = JSON.parse(match[0]);
    const order = parsed.order || [];
    return order
      .filter((o) => typeof o.index === "number")
      .map((o) => ({
        ...candidates[o.index],
        rerankScore: o.score,
      }));
  } catch {
    return candidates;
  }
};

const rerank = async (query, candidates) => {
  if (!candidates?.length) return candidates;
  switch ((rerankerProvider || "none").toLowerCase()) {
    case "cohere":
      return rerankCohere(query, candidates);
    case "voyage":
      return rerankVoyage(query, candidates);
    case "bge":
      return rerankBge(query, candidates);
    case "openai":
      return rerankOpenRouter(query, candidates);
    default:
      return candidates;
  }
};

module.exports = {
  rerank,
};
