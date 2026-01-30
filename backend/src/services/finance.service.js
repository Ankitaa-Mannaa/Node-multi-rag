const { finnhubApiKey, finageApiKey } = require("../config/env");

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const FINAGE_BASE = "https://api.finage.co.uk";

const FINANCE_KEYWORDS =
  /(stock|stocks|equity|price|quote|market|index|nasdaq|nyse|s&p|dow|sensex|nifty|ftse|dax|nikkei|crypto|bitcoin|btc|eth)/i;

const STOP_TOKENS = new Set([
  "I",
  "A",
  "AN",
  "THE",
  "AND",
  "OR",
  "FOR",
  "TO",
  "IN",
  "ON",
  "AT",
  "BY",
  "OF",
  "US",
  "USA",
  "UK",
  "EU",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "NYSE",
  "NASDAQ",
  "S&P",
  "DOW",
  "ETF",
]);

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Finance API error ${res.status}: ${text}`);
  }
  return res.json();
};

const extractSymbols = (message) => {
  if (!message) return [];
  const symbols = new Set();
  const explicit = message.match(/\$([A-Z]{1,6})\b/g);
  if (explicit) {
    explicit.forEach((m) => symbols.add(m.replace("$", "")));
  }

  const tokens = message.split(/[^A-Za-z0-9]/).filter(Boolean);
  tokens.forEach((t) => {
    if (t.length < 2 || t.length > 6) return;
    if (t !== t.toUpperCase()) return;
    if (STOP_TOKENS.has(t)) return;
    symbols.add(t);
  });

  return Array.from(symbols).slice(0, 3);
};

const detectMarketStatusRequest = (message) => {
  return /(market status|market open|is the market open|market hours|trading hours)/i.test(
    message || ""
  );
};

const detectRegion = (message) => {
  const text = (message || "").toLowerCase();
  if (/india|nifty|sensex/.test(text)) return "IN";
  if (/uk|united kingdom|london|ftse/.test(text)) return "UK";
  if (/europe|eu|dax/.test(text)) return "EU";
  if (/japan|nikkei/.test(text)) return "JP";
  if (/canada/.test(text)) return "CA";
  if (/australia|asx/.test(text)) return "AU";
  return "US";
};

const getQuote = async (symbol) => {
  if (!finnhubApiKey) return null;
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(
    symbol
  )}&token=${encodeURIComponent(finnhubApiKey)}`;
  return fetchJson(url);
};

const getMarketStatus = async (country) => {
  if (!finageApiKey) return null;
  const url = `${FINAGE_BASE}/marketstatus?country=${encodeURIComponent(
    country
  )}&apikey=${encodeURIComponent(finageApiKey)}`;
  return fetchJson(url);
};

const shouldFetchFinanceData = (message) => {
  return FINANCE_KEYWORDS.test(message || "");
};

const getFinanceData = async (message) => {
  if (!shouldFetchFinanceData(message)) return null;

  const symbols = extractSymbols(message);
  const wantsStatus = detectMarketStatusRequest(message);
  const region = detectRegion(message);

  const result = {
    quotes: [],
    market_status: null,
    notes: [],
  };

  if (symbols.length === 0 && !wantsStatus) {
    return null;
  }

  if (symbols.length > 0) {
    if (!finnhubApiKey) {
      result.notes.push("Live quotes unavailable: FINNHUB_API_KEY not set.");
    } else {
      for (const symbol of symbols) {
        try {
          const quote = await getQuote(symbol);
          result.quotes.push({ symbol, quote });
        } catch (err) {
          result.notes.push(`Quote error for ${symbol}: ${err.message}`);
        }
      }
    }
  }

  if (wantsStatus) {
    if (!finageApiKey) {
      result.notes.push("Market status unavailable: FINAGE_API_KEY not set.");
    } else {
      try {
        result.market_status = await getMarketStatus(region);
      } catch (err) {
        result.notes.push(`Market status error: ${err.message}`);
      }
    }
  }

  if (result.quotes.length === 0 && !result.market_status && result.notes.length === 0) {
    return null;
  }

  return result;
};

module.exports = {
  getFinanceData,
};
