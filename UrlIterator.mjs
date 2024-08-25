import axios from "axios";

const getAll = async (urls) => {
  let results = {};
  for (const urlData of urls) {
    const r = await axios.get(urlData.url);
    results[urlData.key] = r.data.results;
  }
  return results;
};

const wait = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(1), 5000);
  });
};
const createUrlIterator = (dataList, urlFn) => {
  const AsynUrlIterator = {
    processList: [...dataList],
    async *[Symbol.asyncIterator]() {
      while (this.processList.length) {
        const data = this.processList.pop();
        const urls = data.map((d) => {
          const url = urlFn(d);
          return { url, key: d.key };
        });
        let results = await getAll(urls);
        await wait();
        yield { fnData: data, res: { ...results } };
      }
    },
  };
  return AsynUrlIterator;
};

export default createUrlIterator;
