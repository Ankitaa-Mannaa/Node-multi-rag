const chunkText = (text, options = {}) => {
  const chunkSize = options.chunkSize || 800;
  const overlap = options.overlap || 200;
  const maxChunks = options.maxChunks || 60;

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const slice = text.slice(start, end).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (chunks.length >= maxChunks) {
      break;
    }
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
};

module.exports = { chunkText };
