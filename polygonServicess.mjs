import axios from "axios";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dayjs from "dayjs";
import redis from "redis";

const AGG_API_URL = "https://api.polygon.io/v2/aggs/ticker";
const POLYGON_NEWS_URL = "https://api.polygon.io/v2/reference/news";
const POLYGON_DETAIL_URL =
  "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers";
const POLYGON_TICKER_URL =
  "https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1";

const EXCLUDED = [
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
const URL = (date) =>
  `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&include_otc=false&apiKey=${process.env.POLYGON_APIKEY}`;

const RELATED_COMPANIES_URL = (ticker) =>
  `https://api.polygon.io/v1/related-companies/${ticker}?apiKey=${process.env.POLYGON_APIKEY}`;

const getAggApi = ({ symbol, date }) =>
  `${AGG_API_URL}/${symbol}/range/1/minute/${date}/${date}?adjusted=true&sort=asc&apiKey=${process.env.POLYGON_APIKEY}`;

//******** REDIS */
console.log("creating redis client");
var publisher = await redis.createClient();

await publisher.connect();

console.log("connected ");
const publish = async () => {
  const test = { publisher: "started" };
  await publisher.publish("config", JSON.stringify(test)); // Will receive the message from the subscriber
  console.log("start publisher");
};

await publish();
//******** REDIS */

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  res.json({ agg: "ok" });
});

app.post("/pubconfig", async (req, res) => {
  const { message } = req.body;
  await publisher.publish("config", JSON.stringify(message));
  res.json({ message: "published" });
});

app.get("/related/:symbol", async (req, res) => {
  const url = RELATED_COMPANIES_URL(req.params.symbol);
  console.log(url);
  const {
    data: { results },
  } = await axios.get(url);
  console.log("=====> related", results);
  res.json(results);
});

app.get("/agg/:symbol/:date", async (req, res) => {
  const reqData = {
    symbol: req.params.symbol,
    date: req.params.date,
  };
  const url = getAggApi(reqData);
  console.log(url);
  const {
    data: { results },
  } = await axios.get(url);
  res.json({ results });
});
app.get("/news/:symbol/:date", async (req, res) => {
  const url = `${POLYGON_NEWS_URL}?ticker=${req.params.symbol}&published_utc.lt=${req.params.date}&order=desc&limit=20&apiKey=${process.env.POLYGON_APIKEY}`;
  console.log(url);
  const {
    data: { results },
  } = await axios.get(url);
  res.json({ results });
});
app.get("/detail/:symbol", async (req, res) => {
  const url = `${POLYGON_DETAIL_URL}/${req.params.symbol}?apiKey=${process.env.POLYGON_APIKEY}`;
  console.log(url);
  const { data } = await axios.get(url);
  res.json({ ticker: data?.ticker });
});

app.get("/ticker/:symbol", async (req, res) => {
  const url = `${POLYGON_TICKER_URL}&ticker=${req.params.symbol}&apiKey=${process.env.POLYGON_APIKEY}`;
  console.log(url);
  const { data } = await axios.get(url);
  res.json(data);
});

const getHistoricalData = async (date) => {
  try {
    const url = URL(date);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const volumeMapper = (stock) => {
  return {
    symbol: stock.T,
    volume: stock.v,
    close: stock.c,
    open: stock.o,
    vw: stock.vw,
    transactions: stock.n,
  };
};

app.get("/topVolume/:date", async (req, res) => {
  const { date } = req.params;
  try {
    const { results } = await getHistoricalData(date);
    const spy = results.find((s) => s.T === "SPY");
    const qqq = results.find((s) => s.T === "QQQ");

    const market = [spy, qqq].map(volumeMapper);
    console.log(market);
    const topVolume = results
      .sort((a, b) => b.v - a.v)
      .filter((stock) => !EXCLUDED.includes(stock.T))
      .slice(0, 50);

    const topUnder20 = topVolume
      .filter((stock) => stock.o >= 1 && stock.o < 20)
      .map(volumeMapper);
    const topOver20 = topVolume
      .filter((stock) => stock.o >= 20 && stock.o <= 1000)
      .map(volumeMapper);

    res.json({ topOver20, topUnder20, market });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(7007, () => {
  console.log("Server is running on port 7007");
});
