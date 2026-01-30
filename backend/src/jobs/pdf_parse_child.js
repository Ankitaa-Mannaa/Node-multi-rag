const fs = require("fs");
const pdfParse = require("pdf-parse");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Missing file path");
  process.exit(1);
}

const maxPages = Number(process.env.MAX_PDF_PAGES) || 6;
const maxChars = Number(process.env.MAX_DOC_CHARS) || 200000;

const clampText = (text) => {
  if (text.length > maxChars) {
    return text.slice(0, maxChars);
  }
  return text;
};

const run = async () => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer, { max: maxPages });
  const text = clampText(data.text || "");
  process.stdout.write(text);
};

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
