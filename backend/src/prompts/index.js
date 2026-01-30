const support = require("./support.prompts");
const resume = require("./resume.prompts");
const expense = require("./expense.prompts");
const general = require("./general.prompts");

const BY_RAG = {
  support: { system: support.SUPPORT_SYSTEM, userPrefix: support.SUPPORT_USER_PREFIX },
  resume: { system: resume.RESUME_SYSTEM, userPrefix: resume.RESUME_USER_PREFIX },
  expense: { system: expense.EXPENSE_SYSTEM, userPrefix: expense.EXPENSE_USER_PREFIX },
  general: { system: general.GENERAL_SYSTEM, userPrefix: general.GENERAL_USER_PREFIX },
};

/**
 * @param {string} ragType - support | resume | expense | general
 * @returns {{ system: string, userPrefix: string }}
 */
function getPromptForRag(ragType) {
  const config = BY_RAG[ragType] || BY_RAG.general;
  return { system: config.system, userPrefix: config.userPrefix };
}

module.exports = { getPromptForRag, BY_RAG };
