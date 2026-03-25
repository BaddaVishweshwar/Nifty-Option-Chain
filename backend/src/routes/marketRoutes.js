const express = require('express');
const router = express.Router();
const { getSymbols, getOptionChain } = require('../market/optionChainService');

router.get('/symbols', getSymbols);

router.get('/chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { strikecount } = req.query;
    console.log(`[API] Fetching option chain for: ${symbol} (strikes: ${strikecount})`);
    const data = await getOptionChain(symbol, strikecount ? parseInt(strikecount) : 10);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
