import ActiveSocket from "./ActiveSocket.mjs";
import { WebSocketServer } from "ws";
import {
  getInitialChartStocks,
  updateChartByMinute,
  getCandle,
  appendCandle,
  updateLiveChart,
} from "./utils.mjs";
import chartTransactions from "./chartTransactions.mjs";
import redis from "redis";

const CHARTS_WS_URI = "ws://www.stockmarketviz.com/socket";
const PORT = 8777;
const REDIS_STREAM = "chartCandles";
let chartMap = new Map();

const stockDataMap = ["TSLA"];

chartMap = new Map(getInitialChartStocks(stockDataMap));

//******** REDIS */
(async () => {
  const client = redis.createClient();
  client.on("error", (err) => console.error("Redis Client Error", err));
  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe("volume", (message) => {
    const { id, highestVolume } = JSON.parse(message);
    const allStocks = highestVolume.map(([k, v]) => {
      return {
        ticker: k,
        volume: v,
      };
    });
    const stocks = allStocks
      .sort((a, b) => {
        const av = a.volume;
        const bv = b.volume;
        if (av < bv) {
          return 1;
        } else if (av > bv) {
          return -1;
        }
        return 0;
      })
      .slice(0, 5)
      .map((s) => s.ticker);

    stocks.forEach((symbol) => {
      if (!chartMap.has(symbol)) {
        console.log("volume symbol from chart manager", symbol);
        chartMap.set(symbol, []);
      }
    });
  });

  setInterval(async () => {
    const data = chartTransactions.getLiveChart();
    const jsonObject = Object.fromEntries(data);

    await redisClient.xAdd(REDIS_STREAM, "*", {
      type: "chartCandles",
      data: JSON.stringify(jsonObject),
    });
    console.log(`Added stock data for  to the stream.`);
  }, 1000);
  setInterval(async () => {
    entries.forEach(([key, messages]) => {
      console.log(`Stream: ${key}`);
      messages.forEach((message) => {
        console.log(`  - ${message.id}: ${message.data}`);
      
    });
  }, 5000);
})();

//******** */

const wss = new WebSocketServer({ port: PORT });

let chartDate = new Map();
let chartTime = new Map();
let collectedCandles = new Map();
let activeCandles = new Map();

wss.on("connection", async function connection(ws) {
  setInterval(() => {
    const data = chartTransactions.getLiveChart();
    const jsonObject = Object.fromEntries(data);
    ws.send(JSON.stringify(jsonObject));
  }, 1000);
  ws.on("message", async (data) => {
    const symbols = JSON.parse(data.toString("utf8"));

    symbols.forEach((symbol) => {
      if (!chartMap.has(symbol)) {
        chartMap.set(symbol, []);
      }
    });
  });
  wss.on("close", () => {
    console.log("Client disconnected");
  });

  wss.onerror = function () {
    console.log("Some Error occurred");
  };
});

setInterval(async () => {
  const updatedMap = updateLiveChart({
    collectedCandles,
    chartMap,
    activeCandles,
    chartDate,
  });
  if (updatedMap.size === 0) return;
  chartTransactions.setLiveChart(updatedMap);
}, 1000);

const processMarketData = (data) => {
  const symbol = data.symbol;
  if (chartMap.get(symbol)) {
    let candleChartTime = chartDate.get(symbol);
    const lastSymbolTime = chartTime.get(symbol);
    if (data.time !== lastSymbolTime) {
      candleChartTime = updateChartByMinute({
        data,
        collectedCandles,
        chartTime,
        chartMap,
        chartDate,
        activeCandles,
      });
    }
    const candle = getCandle(data, candleChartTime);
    appendCandle({ collectedCandles, candle, symbol });
  }
};

const connection = await ActiveSocket(processMarketData, CHARTS_WS_URI);

if (connection.connected) {
  console.log("Active charts started successfully");
}
