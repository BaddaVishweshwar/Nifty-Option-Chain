const ticks = new Map();

const setTick = (symbol, tick) => {
  ticks.set(symbol, {
    ...tick,
    lastUpdated: new Date()
  });
};

const getTick = (symbol) => ticks.get(symbol);

const getAllTicks = () => Array.from(ticks.values());

module.exports = {
  setTick,
  getTick,
  getAllTicks
};
