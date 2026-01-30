const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { parse } = require("csv-parse/sync");

const clampText = (text) => {
  const max = Number(process.env.MAX_DOC_CHARS) || 50000;
  if (text.length > max) {
    return text.slice(0, max);
  }
  return text;
};

const extractPdfText = async (filePath) => {
  const maxMb = Number(process.env.PDF_MAX_BUFFER_MB) || 4;
  const maxBytes = maxMb * 1024 * 1024;
  const stats = fs.statSync(filePath);
  if (stats.size > maxBytes) {
    throw new Error(
      `PDF too large for in-memory parse (${stats.size} bytes, max ${maxBytes})`
    );
  }

  const childMaxMb = Number(process.env.PDF_CHILD_MAX_MB) || 256;
  const timeoutMs = Number(process.env.PDF_PARSE_TIMEOUT_MS) || 30000;
  const childScript = path.join(__dirname, "..", "jobs", "pdf_parse_child.js");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      `--max-old-space-size=${childMaxMb}`,
      childScript,
      filePath,
    ]);

    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PDF parse timeout"));
    }, timeoutMs);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        return reject(new Error(stderr || "PDF parse failed"));
      }
      return resolve(clampText(stdout));
    });
  });
};

const extractCsvText = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const records = parse(content, { columns: true, skip_empty_lines: true });
  const text = records
    .map((row, idx) => `Row ${idx + 1}: ${JSON.stringify(row)}`)
    .join("\n");
  return clampText(text);
};

const extractPlainText = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return clampText(content);
};

module.exports = {
  extractPdfText,
  extractCsvText,
  extractPlainText,
};
