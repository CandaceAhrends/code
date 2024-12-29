import { WebSocketServer } from "ws";
import axios from "axios";
import dayjs from "dayjs";

const mockPort = 8082;
console.log(`listening on port ${mockPort} before connecting to polygon`);
const wss = new WebSocketServer({ port: mockPort });
const APIKEY = process.env.POLYGON_APIKEY;
const aggUrl = ({ symbol, date }) =>
  `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/second/${date}/${date}?adjusted=true&sort=asc&limit=50000&apiKey=${APIKEY}`;

const getHistoricalData = async ({ symbol, date }) => {
  const response = await axios.get(aggUrl({ symbol, date }));
  return { symbol, data: response.data.results };
};

const parseData = (d, symbol) => {
  return {
    type: "TXN",
    ts: d.t,
    time: dayjs(d.t).format("HH:mm"),
    symbol,
    open: d.o,
    high: d.h,
    low: d.l,
    close: d.c,
    volume: d.v,
  };
};

const sortByTime = (a, b) => {
  const aTime = dayjs(a.ts);
  const bTime = dayjs(b.ts);
  if (aTime.isBefore(bTime)) {
    return -1;
  }
  if (aTime.isAfter(bTime)) {
    return 1;
  }
  return 0;
};

wss.on("connection", async function connection(ws) {
  console.log("Historical web socket 8082 started");

  let stocks = [];
  let stocksInterval = null;
  let intervalData = [];

  ws.on("message", async (data) => {
    const { date, symbols } = JSON.parse(data.toString("utf8"));
    stocks.push(...symbols);
    clearInterval(stocksInterval);

    const promises = symbols.map(async ({ symbol }) => {
      return getHistoricalData({ symbol, date });
    });
    const historicalData = await Promise.all(promises);
    historicalData.forEach((stock) => {
      const { symbol, data } = stock;
      const stockData = data.map((d) => parseData(d, symbol));
      if (stockData.length > 0) {
        const sortedData = stockData.sort(sortByTime);
        intervalData.push(sortedData);
      }
    });

    intervalData.forEach((stock) => {
      let [hour, minute] = dayjs(stock[0].ts).format("HH:mm").split(":");

      const [fastForwardHour, fastforwardMinute] = symbols
        .find((s) => s.symbol === stock[0].symbol)
        ?.time?.split(":");

      while (Number.parseInt(hour) < fastForwardHour) {
        const d = stock.shift();
        [hour] = dayjs(d.ts).format("HH:mm").split(":");
        console.log("removing data", d.time, hour);
      }
      while (Number.parseInt(minute) <= fastforwardMinute) {
        const d = stock.shift();
        [, minute] = dayjs(d.ts).format("HH:mm").split(":");
        console.log("removing data", d.time, minute);
      }
    });

    console.log("starting interval");
    stocksInterval = setInterval(() => {
      intervalData.forEach((stock) => {
        console.log("stock", stock.length);

        const d = stock.shift();
        if (d && d.ts) {
          const testTime = dayjs(d.ts).format("MM-DD-YYYY HH:mm:ss");
          console.log("sending data", d.time, testTime);
          ws.send(JSON.stringify(d));
        }
      });
    }, 1000);
  });

  wss.on("close", () => {
    console.log("Client disconnected");
  });

  wss.onerror = function () {
    console.log("Some Error occurred");
  };
});
