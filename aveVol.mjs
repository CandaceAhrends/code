
import {createAggregates} from './aggregates.mjs'
import dayjs from 'dayjs'

const TIME_FORMAT = 'YYYY:HH:mm'
 
const agg = await createAggregates()

const reducer = (group, txn) => {
    const txnDate = dayjs(txn.t).format(TIME_FORMAT)
    if (!group.has(txnDate)) {
        group.set(txnDate, [])
    }
    group.set(txnDate, [...group.get(txnDate), txn])
    return group
}

function VolumeData() {
    this.tickers = []
    this.add = (ticker, volumes) => {
        this.tickers[ticker] = volumes
    }
    this.getAveVolByCurrentTime = ticker => {
        const currentTime = `${dayjs().format(TIME_FORMAT).slice(0,-2)}00`
        const volume = this.tickers[ticker].has(currentTime) ? this.tickers[ticker].get(currentTime) : this.tickers[ticker].entries().next().value.slice(-1)
        return volume
    }
    this.fetchVolumeData = async (ticker) => {
        if (!this.tickers[ticker]) {
            const txns = await agg.load(ticker)
            const aveVolPerHour = [...txns.reduce(reducer, new Map())].map(([k, v]) => {
                return [
                    k, v.reduce((acc, txn) => {
                        acc += txn.v
                        return acc
                    }, 0) / v.length
                ]
            })
            this.add(ticker, new Map(aveVolPerHour))
        }
    }
}

const volumeData = new VolumeData()

export const getAveVol = async ticker => {
    try {
        await volumeData.fetchVolumeData(ticker)
        return volumeData.getAveVolByCurrentTime(ticker)
    } catch (err) {
        console.log(err)
        return 0
    }

}

const t = await getAveVol('TSLA')
const de = await getAveVol('PLTR')

console.log(t, de)
