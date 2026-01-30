# RAG Prompts

This folder holds **RAG-specific system prompts** and user-prompt prefixes for the Multi-RAG AI Workspace.

## Files

- **`index.js`** – Exports `getPromptForRag(ragType)` and `BY_RAG`.
- **`redirects.js`** – Shared text for when the user’s intent belongs to another RAG (friendly redirect messages).
- **`support.prompts.js`** – Support RAG: answer **only** from uploaded company/support docs; suggest General RAG for general questions.
- **`resume.prompts.js`** – Resume RAG: summaries, improvements, and **scoring against a job profile** (overall score, criteria breakdown, strengths, gaps).
- **`expense.prompts.js`** – Expense RAG: **structured expense analysis** (summary, breakdown, insights, optional recommendations) from CSV data.
- **`general.prompts.js`** – General RAG: general Q&A; suggest Support/Resume/Expense RAG when the user is asking about their own documents.

## Behavior

- Each RAG has a **system prompt** (role + scope + redirect rules) and a **user prefix** (how to use context and history).
- **Out-of-scope**: If the user asks about expenses in Resume RAG, or general knowledge in Support RAG, the model is instructed to **not** invent answers and to **suggest the right RAG** in a short, friendly way.
- **Resume scoring**: When the user asks to “score this resume against [job]”, the resume prompt instructs the model to return an overall score, criteria-based breakdown, strengths, and gaps.
- **Expense**: Responses are structured (summary, breakdown, insights, optional recommendations).

## Editing

Change `*_SYSTEM` and `*_USER_PREFIX` (or `userPrefix`) in the relevant file, then re-run the app. No separate “training” step is required.
