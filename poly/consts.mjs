export const GROUPED_URL = (date) =>
  `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&include_otc=false&apiKey=${process.env.POLYGON_APIKEY}`;

export const TIINGO_SYMBOLS_NEWS_URL = (symbolList) =>
  `https://api.tiingo.com/tiingo/news?tickers=${symbolList}&token=${process.env.TIINGO_APIKEY}`;

export const TIINGO_NEWS_URL = () =>
  `https://api.tiingo.com/tiingo/news?token=${process.env.TIINGO_APIKEY}`;

export const EXCLUDED = [
  "TQQQ",
  "SQQQ",
  "SOXL",
  "X",
  "DOW",
  "SOXS",
  "IBIT",
  "TSLL",
  "EWZ",
  "FXI",
  "TLT",
  "TZA",
  "XLF",
  "YINN",
  "ETHU",
  "SLV",
  "SPY",
];
