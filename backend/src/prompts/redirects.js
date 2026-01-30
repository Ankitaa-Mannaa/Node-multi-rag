/**
 * Friendly redirect messages when user intent belongs to another RAG.
 * Used in system prompts so the model suggests the right place professionally.
 */

const RAG_DESCRIPTIONS = {
  support:
    "Support RAG — for questions about company documentation, policies, and internal knowledge you've uploaded.",
  resume:
    "Resume RAG — for resume analysis, scoring against job profiles, improvements, and career feedback.",
  expense:
    "Expense RAG — for expense reports, transaction analysis, categorization, and financial summaries from your CSV data.",
  general:
    "General RAG — for general questions, brainstorming, or topics not covered by your documents or other specialized RAGs.",
};

const REDIRECT_TEMPLATE = `If the user's question is outside this RAG's scope, do not make up an answer. Respond in a friendly, professional way and suggest they use the right place:

- For company docs / support questions → suggest "Support RAG" (upload docs there first if needed).
- For resume or job-related analysis → suggest "Resume RAG".
- For expenses or transactions → suggest "Expense RAG".
- For general or off-topic questions → suggest "General RAG" with: "I don't have data for this specific question here, but you can ask in the General RAG window for general help."

Keep the suggestion to 1–2 sentences. Example: "This sounds like a general question—you can get a better answer in the General RAG window. Is there anything I can help with using your [current RAG] data?"`;

module.exports = { RAG_DESCRIPTIONS, REDIRECT_TEMPLATE };
