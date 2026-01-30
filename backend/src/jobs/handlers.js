const pool = require("../config/db");
const eventsService = require("../services/events.service");
const webhookDispatcher = require("./webhook.dispatcher");
const webhookDelivery = require("./webhook.delivery");
const fileProcessor = require("../services/fileProcessor.service");
const aiService = require("../services/ai.service");
const vectorStore = require("../services/vectorStore.service");
const { chunkText } = require("../utils/chunkText");

const setStatus = async (documentId, status) => {
  await pool.query("UPDATE documents SET status = $1 WHERE id = $2", [
    status,
    documentId,
  ]);
};

const processDocument = async ({ documentId, ragType }) => {
  await setStatus(documentId, "processing");
  console.log(`[jobs] processing ${ragType} doc ${documentId}`);

  try {
    const docRes = await pool.query(
      `
      SELECT id, user_id, rag_type, file_path, file_type, file_size
      FROM documents
      WHERE id = $1
      `,
      [documentId]
    );
    const doc = docRes.rows[0];
    if (!doc) {
      await setStatus(documentId, "uploaded");
      return;
    }

    const maxMb = Number(process.env.PDF_MAX_BUFFER_MB) || 4;
    const maxBytes = maxMb * 1024 * 1024;
    if (doc.file_type === "application/pdf" && doc.file_size > maxBytes) {
      await setStatus(documentId, "failed");
      await pool.query(
        "UPDATE documents SET error_message = $1 WHERE id = $2",
        [`PDF too large (max ${maxMb}MB)`, documentId]
      );
      console.log(`[jobs] failed ${documentId}: pdf too large`);
      return;
    }

    let text = "";
    if (ragType === "expense") {
      text = fileProcessor.extractCsvText(doc.file_path);
    } else {
      text = await fileProcessor.extractPdfText(doc.file_path);
    }

    if (!text.trim()) {
      console.log(`[jobs] no text extracted for ${documentId}`);
      await setStatus(documentId, "failed");
      await pool.query(
        "UPDATE documents SET error_message = $1 WHERE id = $2",
        ["No text extracted from document", documentId]
      );
      return;
    }

    await vectorStore.deleteByDocument(doc.id, doc.user_id, doc.rag_type);

    const chunkTexts = chunkText(text, {
      chunkSize: 900,
      overlap: 200,
      maxChunks: 40,
    });
    console.log(`[jobs] chunking ${documentId}: ${chunkTexts.length} chunks`);

    const chunksWithEmbeddings = [];
    for (let i = 0; i < chunkTexts.length; i++) {
      const embedding = await aiService.createEmbedding(chunkTexts[i]);
      chunksWithEmbeddings.push({
        content: chunkTexts[i],
        embedding,
        chunkIndex: i,
      });
    }
    await vectorStore.upsertChunks(
      doc.id,
      doc.user_id,
      doc.rag_type,
      chunksWithEmbeddings
    );

    await setStatus(documentId, "ready");
    await pool.query(
      "UPDATE documents SET error_message = NULL WHERE id = $1",
      [documentId]
    );
    console.log(
      `[jobs] ready ${documentId} (${chunksWithEmbeddings.length} chunks)`
    );
  } catch (err) {
    console.log(`[jobs] failed ${documentId}: ${err.message}`);
    await setStatus(documentId, "failed");
    await pool.query("UPDATE documents SET error_message = $1 WHERE id = $2", [
      err.message,
      documentId,
    ]);
    throw err;
  }
};

const processSupportDoc = async ({ documentId }) => {
  await processDocument({ documentId, ragType: "support" });
  await eventsService.publishEvent({
    type: "document_processed",
    payload: { document_id: documentId, rag_type: "support" },
  });
};

const processResume = async ({ documentId }) => {
  await processDocument({ documentId, ragType: "resume" });
  await eventsService.publishEvent({
    type: "resume_analysis_completed",
    payload: { document_id: documentId, rag_type: "resume" },
  });
};

const processExpenseCsv = async ({ documentId }) => {
  await processDocument({ documentId, ragType: "expense" });
  await eventsService.publishEvent({
    type: "monthly_expense_summary_ready",
    payload: { document_id: documentId, rag_type: "expense" },
  });
};

module.exports = {
  "process-support-doc": processSupportDoc,
  "process-resume": processResume,
  "process-expense-csv": processExpenseCsv,
  "dispatch-webhooks": webhookDispatcher.dispatch,
  "deliver-webhook": webhookDelivery.deliver,
};
