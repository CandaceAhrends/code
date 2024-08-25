import { createAggregates } from "./aggregates.mjs";
import dayjs from "dayjs";
import { DATE_FORMAT } from "../config.mjs";
import { sortAggByDate } from "./sort.mjs";

const agg = await createAggregates();

function ATR() {
  this.tickers = [];
  this.getByDate = async (ticker) => {
    const txns = await agg.load(ticker);
    return txns.sort(sortAggByDate).reduce((byDate, txn) => {
      if (txn) {
        const day = dayjs(txn.t).format(DATE_FORMAT);
        if (!byDate.has(day)) {
          byDate.set(day, []);
        }
        byDate.set(day, [...byDate.get(day), txn]);
      } else {
        console.log("ADR not exists", txns);
      }
      return byDate;
    }, new Map());
  };
  this.getATR = async (ticker) => {
    const txnsByDate = await this.getByDate(ticker);

    const atrData = [...txnsByDate].reduce(
      (atrData, [k, v]) => {
        const sortedTxns = v.sort(sortAggByDate);
        const { low, high } = sortedTxns.reduce(
          (acc, txn) => {
            acc.low = Math.min(acc.low, txn.l);
            acc.high = Math.max(acc.high, txn.h);
            return acc;
          },
          { low: Infinity, high: 0 }
        );
        const pClose = atrData.prevClose;

        if (atrData.prevClose > 0) {
          atrData.prices.set(k, { high, low, pClose });
        }
        atrData.prevClose = sortedTxns.slice(-1)[0].vw;
        return atrData;
      },
      { prevClose: 0, prices: new Map() }
    );

    //'2023-05-01' => { high: 165, low: 158.83, pClose: 0 },
    //'2023-05-02' => { high: 165.49, low: 158.93, pClose: 160.9611 },
    const sumTR = [...atrData.prices].reduce((acc, [k, v]) => {
      const H_L = v.high - v.low;
      const H_pC = Math.abs(v.high - v.pClose);
      const L_pC = Math.abs(v.low - v.pClose);

      acc += Math.max(H_L, H_pC, L_pC);

      return acc;
    }, 0);

    return Number(sumTR * (1 / atrData.prices.size)).toFixed(2);
  };
}

const atr = new ATR();

export const getAtr = async (ticker) => {
  try {
    return await atr.getATR(ticker);
  } catch (err) {
    console.log(err);
    return 0;
  }
};
