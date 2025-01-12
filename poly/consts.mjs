export const AGG_API_URL = "https://api.polygon.io/v2/aggs/ticker";

export const GROUPED_URL = (date) =>
  `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&include_otc=false&apiKey=${process.env.POLYGON_APIKEY}`;

export const TIINGO_SYMBOLS_NEWS_URL = (symbolList) =>
  `https://api.tiingo.com/tiingo/news?tickers=${symbolList}&token=${process.env.TIINGO_APIKEY}`;

export const TIINGO_NEWS_URL = () =>
  `https://api.tiingo.com/tiingo/news?token=${process.env.TIINGO_APIKEY}`;

export const TIINGO_NEWS_DETAIL_URL = (symbol) =>
  `https://api.polygon.io/v3/reference/tickers/${symbol}?apiKey=${process.env.POLYGON_APIKEY}`;

export const getAggApi = ({ symbol, date }) =>
  `${AGG_API_URL}/${symbol}/range/1/minute/${date}/${date}?adjusted=true&sort=asc&apiKey=${process.env.POLYGON_APIKEY}`;

export const getAggTimeFrameApi = ({ symbol, date, timeframe }) =>
  `${AGG_API_URL}/${symbol}/range/${timeframe}/${date}/${date}?adjusted=true&sort=asc&apiKey=${process.env.POLYGON_APIKEY}`;

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
