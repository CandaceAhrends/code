import axios from "axios"
import dayjs from 'dayjs'
import { MARKET_HOLIDAY_URL, DATE_FORMAT } from '../config.mjs'
import { isWeekend } from './dates.mjs'
/*
initializing market holidays
[
  { date: '2022-12-26', status: 'closed' },
  { date: '2022-12-26', status: 'closed' }
]
*/
const CLOSED = 'closed'

const market = {
        holidays: null,

        getHolidays: function () {
                return this.holidays
        },
        isMarketOpen: function (date = dayjs()) {
                const marketDate = date.format(DATE_FORMAT)
                const isClosed = this.holidays.has(marketDate) && this.holidays.get(marketDate) === CLOSED
                const isWeekDay = isWeekend(marketDate)
                return !isClosed && !isWeekDay
        },
        searchOpenDay: function (date, limit) {
                if (limit <= 0) {
                        return null
                }
                const marketDate = dayjs(date).subtract(1, 'day');                
                return this.isMarketOpen(marketDate) ? marketDate : this.searchOpenDay(marketDate, limit - 1)

        },
        getPreviousMarketDay: function (date = dayjs()) {
             //   console.log("get prev market day for ", date.format(DATE_FORMAT))
                const DAYS_TO_SEARCH = 4
                return this.searchOpenDay(date, DAYS_TO_SEARCH)
        },
        getLastNMarketDays: function (date = dayjs(), multiplier = 1) {
                return [...Array(multiplier)].reduce((list, _) => {
                        list.nextDay = this.getPreviousMarketDay(list.nextDay)
                        list.marketDayList.push(list.nextDay)
                        return list
                }, { nextDay: date, marketDayList: [] }).marketDayList

        },
        init: async function () {
                const res = await axios.get(MARKET_HOLIDAY_URL)

                this.holidays = res.data.reduce((holidays, day) => {
                        const holidayDate = dayjs(day.date).format(DATE_FORMAT)
                        holidays.set(holidayDate, day.status)
                        return holidays
                }, new Map())
                console.log("initializing market holidays", this.holidays)
        }
}

export const createMarketStatus = async () => {
        return new Promise(async (resolve, reject) => {
                try {
                        if (!market.holidays) {
                                await market.init()
                        }
                        resolve(market)
                } catch (err) {
                        reject(err)
                }

        })
}





