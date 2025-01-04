export const GROUPED_URL = (date) =>
  `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&include_otc=false&apiKey=${process.env.POLYGON_APIKEY}`;

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
