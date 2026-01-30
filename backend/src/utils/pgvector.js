const toPgVector = (arr) => {
  if (!Array.isArray(arr)) return null;
  return `[${arr.join(",")}]`;
};

module.exports = { toPgVector };
