import dayjs from "dayjs";

export const formatDate = (date) => {
  return dayjs(date).format("ddd, MMM DD HH:mm A");
};

export const getDateForChart = (time) => {
  try {
    const [hour, minute] = time.split(":");
    const currentChartDate = dayjs()
      .set("hour", parseInt(hour))
      .set("minute", parseInt(minute))
      .set("second", 0);
    return currentChartDate;
  } catch (e) {
    throw new Error("Invalid time format");
  }
};
export const aggregateCandleData = ({ candles, lastCandle }) => {
  const [candle] = [
    candles.reduce((minuteCandle, { x, y }, index) => {
      const [open, high, low, close] = y;
      const validData = open && high && low && close;
      if (!validData) {
        return minuteCandle;
      }
      if (index === 0) {
        minuteCandle.open = open;
        minuteCandle.high = high;
        minuteCandle.low = low;
      }
      minuteCandle.high = Math.max(minuteCandle.high, high);
      minuteCandle.low = Math.min(minuteCandle.low, low);
      minuteCandle.close = close;
      return minuteCandle;
    }, {}),
  ].map((candle) => {
    return {
      x: lastCandle.x,
      y: [candle.open, candle.high, candle.low, candle.close],
    };
  });

  return candle;
};

export const getCandle = (data, candleTime) => {
  const candle = {
    x: candleTime,
    y: [data.open, data.high, data.low, data.close],
  };
  return candle;
};

export const appendCandle = ({ collectedCandles, candle, symbol }) => {
  const mchartData = collectedCandles.get(symbol) || [];
  mchartData.push(candle);
  collectedCandles.set(symbol, mchartData);
};

export const updateChartByMinute = ({
  data,
  collectedCandles,
  chartTime,
  chartMap,
  chartDate,
  activeCandles,
}) => {
  const candleDate = getDateForChart(data.time);
  chartTime.set(data.symbol, data.time);
  chartDate.set(data.symbol, candleDate);
  const activeCandle = activeCandles.get(data.symbol);
  if (activeCandle) {
    activeCandles.delete(data.symbol);
    const stockMapCandles = [...chartMap.get(data.symbol)];
    stockMapCandles.push(activeCandle);
    chartMap.set(data.symbol, stockMapCandles);
  } else {
    const firstCandle = getCandle(data, candleDate);
    chartMap.set(data.symbol, [firstCandle]);
  }
  collectedCandles.set(data.symbol, []);
  return candleDate;
};

export const updateLiveChart = ({
  collectedCandles,
  chartDate,
  chartMap,
  activeCandles,
}) => {
  const updatedMap = new Map();
  collectedCandles.forEach((candles, key) => {
    if (!chartMap.has(key)) return;
    const stockMapCandles = [...chartMap.get(key)];
    if (stockMapCandles.length) {
      const lastCandle = stockMapCandles.pop();
      lastCandle.x = chartDate.get(key);
      let candle = aggregateCandleData({ candles, lastCandle });

      stockMapCandles.push(candle);
      activeCandles.set(key, candle);
      updatedMap.set(key, stockMapCandles);
    }
  });
  return updatedMap;
};

export const getInitialChartStocks = (stockDataMap) => {
  return stockDataMap.map((stock) => {
    return [stock, []];
  });
};
