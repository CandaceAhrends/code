import axios from "axios";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dayjs from "dayjs";
import redis from "redis";
import csv from "csv-parser";

let emaDB = new Map();

const AGG_API_URL = "https://api.polygon.io/v2/aggs/ticker";
const POLYGON_NEWS_URL = "https://api.polygon.io/v2/reference/news";
const POLYGON_DETAIL_URL =
  "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers";
const POLYGON_TICKER_URL =
  "https://api.polygon.io/v3/reference/tickers?market=stocks&active=true&limit=1";

const RELATED_COMPANIES_URL = (ticker) =>
  `https://api.polygon.io/v1/related-companies/${ticker}?apiKey=${process.env.POLYGON_APIKEY}`;

const today = dayjs().format("YYYY-MM-DD");
const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

const getEMA9 = (symbol) =>
  `https://api.polygon.io/v1/indicators/ema/${symbol}?timestamp=${yesterday}&timespan=day&adjusted=true&window=9&series_type=close&order=desc&limit=10&apiKey=${process.env.POLYGON_APIKEY}`;

const getEMA21 = (symbol) =>
  `https://api.polygon.io/v1/indicators/ema/${symbol}?timestamp=${yesterday}&timespan=day&adjusted=true&window=21&series_type=close&order=desc&limit=10&apiKey=${process.env.POLYGON_APIKEY}`;

const getAggApi = ({ symbol, date }) =>
  `${AGG_API_URL}/${symbol}/range/1/minute/${date}/${date}?adjusted=true&sort=asc&apiKey=${process.env.POLYGON_APIKEY}`;

//******** REDIS */
console.log("creating redis client");
var publisher = await redis.createClient();

// kube********************************
// var publisher = await redis.createClient({
//   socket: {
//     host: "redis-server", // Service name in Kubernetes
//     port: 6379, // Default Redis port
//   },
// });
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
app.get("/news/:symbol", async (req, res) => {
  const url = `${POLYGON_NEWS_URL}?ticker=${req.params.symbol}&order=desc&limit=10&apiKey=${process.env.POLYGON_APIKEY}`;
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

app.post("/ema", async (req, res) => {
  const { symbols } = req.body;
  const requestEmaData = symbols.map((symbol) => {
    const ema9 = getEMA9(symbol);
    const ema21 = getEMA21(symbol);
    console.log(ema9);
    console.log(ema21);
    return {
      symbol,
      ema9,
      ema21,
    };
  });

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let collection = [];
  for (const data of requestEmaData) {
    const emaSet = emaDB.get(data.symbol);
    console.log("already set", emaSet);
    if (emaSet) {
      console.log("pushing from db");
      collection.push(emaSet);
    } else {
      console.log("pushing from api");
      const { symbol, ema9, ema21 } = data;
      await delay(1000); // 1 second delay
      const {
        data: {
          results: { values: ema9Data },
        },
      } = await axios.get(ema9);
      const {
        data: {
          results: { values: ema21Data },
        },
      } = await axios.get(ema21);
      const [ema9Result] = ema9Data;
      const [ema21Result] = ema21Data;

      const isGreen =
        Number.parseFloat(ema9Result.value) >
        Number.parseFloat(ema21Result.value);
      console.log(
        Number.parseFloat(ema9Result.value),
        Number.parseFloat(ema21Result.value)
      );
      emaDB.set(symbol, {
        symbol,
        ema9Result,
        ema21Result,
        isGreen,
      });

      collection.push({
        symbol,
        ema9Result,
        ema21Result,
        isGreen,
      });
    }
  }
  res.json({ collection });
});

app.listen(7007, () => {
  console.log("Server is running on port 7007");
});
