class ChartTransactions {
  static instance = null;
  liveChart = new Map();

  constructor() {
    if (ChartTransactions.instance) {
      return ChartTransactions.instance;
    }
    ChartTransactions.instance = this;
  }

  setLiveChart(chart) {
    this.liveChart = chart;
  }
  getLiveChart() {
    return this.liveChart;
  }
}

const chartTransactions = new ChartTransactions();
export default chartTransactions;
