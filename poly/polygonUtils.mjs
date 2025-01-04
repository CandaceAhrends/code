import dayjs from "dayjs";
import axios from "axios";
import { GROUPED_URL } from "./consts.mjs";

const getHistoricalData = async (date) => {
  try {
    const url = GROUPED_URL(date);
    const response = await axios.get(url);
    return response.status === 404 ? null : response?.data;
  } catch (error) {
    console.error(error);
    return null;
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

export const getSpyQqq = (prev, curr) => {
  const [currSpy] = normalizeData([curr.find((stock) => stock.T === "SPY")]);
  const [currQqq] = normalizeData([curr.find((stock) => stock.T === "QQQ")]);
  const [prevSpy] = normalizeData([prev.find((stock) => stock.T === "SPY")]);
  const [prevQqq] = normalizeData([prev.find((stock) => stock.T === "QQQ")]);
  const spy = {
    ...getClosingDetails({ prev: prevSpy, curr: currSpy }, currSpy),
  };
  const qqq = {
    ...getClosingDetails({ prev: prevQqq, curr: currQqq }),
    currQqq,
  };

  return [spy, qqq];
};

export const getTopVolume = (previousVolume, currTopVolume) => {
  const stocks = currTopVolume
    .map((stock) => {
      const prevStock = previousVolume.find((s) => s.T === stock.symbol);
      if (prevStock) {
        const [prev] = normalizeData([prevStock]);
        const txn = {
          ...getClosingDetails({ prev: prev, curr: stock }),
          ...stock,
        };
        return txn;
      } else {
        return null;
      }
    })
    .filter((s) => s);
  return stocks;
};

export const getPreviousTradingDate = (date) => {
  date = dayjs(date);
  let previousDate = date.subtract(1, "day");
  while (previousDate.day() === 0 || previousDate.day() === 6) {
    previousDate = previousDate.subtract(1, "day");
  }
  return previousDate;
};

export const fetchTradingAgg = async (date) => {
  return await getHistoricalData(date);
};

export const fetchPreviousTradingAgg = async (date) => {
  const previousDate = getPreviousTradingDate(date);
  const skipPreviousDate = getPreviousTradingDate(previousDate);
  let urlDate = previousDate.format("YYYY-MM-DD");
  let response = await getHistoricalData(urlDate);
  if (response.status === 404) {
    urlDate = skipPreviousDate.format("YYYY-MM-DD");
    response = await getHistoricalData(urlDate);
  }
  return response;
};

export const getClosingDetails = ({ prev, curr }) => {
  const prevClose = prev?.close;
  const currClose = curr?.close;
  const diff = currClose - prevClose;
  const percent = (diff / prevClose) * 100;
  const isPositive = currClose > prevClose;
  return { prevClose, currClose, diff, percent, isPositive };
};

export const checkPolyResults = (data) => {
  if (!data || !data.resultsCount) return [];
  const { resultsCount, results } = data;
  if (resultsCount === 0) return [];
  return results;
};

export const normalizeData = (list) => {
  return list.map(volumeMapper);
};
