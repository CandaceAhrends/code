const TOT_LETTERS = 26;
const START_CODE = 65;

const letters = [...Array(TOT_LETTERS)].map((_, idx) => {
  return String.fromCharCode(idx + START_CODE);
});

export const generateDistributerMap = (size = 5) => {
  if (size > TOT_LETTERS || size < 1) {
    throw new Error("invalid size");
  }
  return letters.reduce((buckets, letter, idx) => {
    buckets[letter] = idx % size;
    return buckets;
  }, {});
};

const test = generateDistributerMap(7);

console.log(test);
