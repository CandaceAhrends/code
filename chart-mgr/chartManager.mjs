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

let chartMap = new Map();

const stockDataMap = ["TSLA", "NVDA", "SOUN", "RGTI"];

chartMap = new Map(getInitialChartStocks(stockDataMap));

//******** REDIS */
(async () => {
  const client = redis.createClient();

  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe("volume", (message) => {
    const { id, highestVolume } = JSON.parse(message);

    highestVolume.forEach((symbol) => {
      console.log("volume symbol from chart manager", symbol);
      if (!chartMap.has(symbol)) {
        chartMap.set(symbol, []);
      }
    });
  });
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

setInterval(() => {
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
