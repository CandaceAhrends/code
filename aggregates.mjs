import { historicalURL } from "../config.mjs";
import { DATE_FORMAT } from "../config.mjs";
import { createMarketStatus } from "./marketStatus.mjs";
import axios from "axios";
import dayjs from "dayjs";

const AVE_VOL_DAYS_BACK = 14;
const DAYS_AVAILABLE = 5;

class Aggregates {
  static #instance;
  static async initialize() {
    this.marketStatus = await createMarketStatus();
  }
  static generateAggregateRequests(ticker) {
    try {
      let beginDate = dayjs();
      let urls = [];
      for (
        let i = DAYS_AVAILABLE;
        i < AVE_VOL_DAYS_BACK + DAYS_AVAILABLE;
        i += DAYS_AVAILABLE
      ) {
        const dates = this.marketStatus.getLastNMarketDays(
          beginDate,
          DAYS_AVAILABLE
        );

        const day = dates.slice(-1)[0].format(DATE_FORMAT);
        const url = historicalURL({
          ticker,
          to: day,
          from: day,
          timespan: "minute",
          multiple: 60,
        });

        urls.push(url);
        beginDate = dates.slice(-1)[0];
      }

      return urls.map((url) => axios.get(url));
    } catch (err) {
      console.log("generating agg request failed", err);
    }
  }
  constructor() {
    if (!Aggregates.#instance) {
      this.tickers = new Map();
      Aggregates.#instance = this;
    }
    return Aggregates.#instance;
  }

  async load(ticker) {
    if (!this.tickers.has(ticker)) {
      const requests = Aggregates.generateAggregateRequests(ticker);
      const res = await Promise.all(requests);
      const results = res.map((r) => r.data.results).flatMap((r) => r);
      this.tickers.set(ticker, results);
    }
    return this.tickers.get(ticker);
  }
  findByDate({ ticker, date = dayjs() }) {
    if (!this.tickers.has(ticker)) {
      throw new Error("aggs not loaded for ticker");
    }
    return [...this.tickers.get(ticker).values()].filter((txn) => {
      return date.isSame(dayjs(txn.t), "day");
    });
  }
}

export const createAggregates = async () => {
  try {
    await Aggregates.initialize();
    const aggregates = await new Aggregates();
    return aggregates;
  } catch (err) {
    return {
      err,
    };
  }
};

// const test = await createAggregates();
// const r = test.load("AMC");
