const { calculateGreeks, calculateIV } = require("./greeks");

const normalizeOptionsChain = (rawChain, spotPrice = 0, expiryDate = null) => {
  const strikesMap = new Map();
  const riskFreeRate = 0.07;
  const dividendYield = 0.015;
  
  // 1. Calculate time to expiry with a 1-hour floor for stability
  let timeToExpiry = 1 / (24 * 365); 
  if (expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    // 3:30 PM IST is 10:00 AM UTC
    expiry.setUTCHours(10, 0, 0, 0); 
    const diffMs = expiry.getTime() - now.getTime();
    // Use 1 hour floor (to avoid div by zero/negatives right at the bell)
    const minTime = 1 / (24 * 365);
    timeToExpiry = Math.max(minTime, diffMs / (1000 * 60 * 60 * 24 * 365));
  }

  // First pass: Group by strike to find ATM
  rawChain.forEach(item => {
    if (item.strike_price === -1 || !item.symbol) return;
    const strikePrice = item.strike_price;
    if (!strikesMap.has(strikePrice)) {
      strikesMap.set(strikePrice, { strike: strikePrice, ce: {}, pe: {} });
    }
    const strike = strikesMap.get(strikePrice);
    if (item.option_type === "CE") strike.ce_raw = item;
    else if (item.option_type === "PE") strike.pe_raw = item;
  });

  // 2. Derive Synthetic Spot (Forward Price) from ATM
  let syntheticSpot = spotPrice;
  if (spotPrice > 0) {
    let atmStrike = null;
    let minDiff = Infinity;
    for (const [strikePrice, data] of strikesMap.entries()) {
      const diff = Math.abs(strikePrice - spotPrice);
      if (diff < minDiff && data.ce_raw?.ltp > 0 && data.pe_raw?.ltp > 0) {
        minDiff = diff;
        atmStrike = data;
      }
    }
    if (atmStrike) {
      // F = K + (C - P) * e^(r*t) -> Simplified to K + C - P for short t
      syntheticSpot = atmStrike.strike + (atmStrike.ce_raw.ltp - atmStrike.pe_raw.ltp);
    }
  }

  // Second pass: Calculate Greeks using Synthetic Spot
  for (const strike of strikesMap.values()) {
    ['ce', 'pe'].forEach(type => {
      const raw = strike[`${type}_raw`];
      if (!raw || raw.ltp === 0) return;

      let delta = 0, gamma = 0, theta = 0, vega = 0, iv = 0;
      try {
        iv = calculateIV(
          raw.option_type,
          syntheticSpot,
          strike.strike,
          timeToExpiry,
          riskFreeRate,
          raw.ltp,
          dividendYield
        );

        const g = calculateGreeks(
          raw.option_type,
          syntheticSpot,
          strike.strike,
          timeToExpiry,
          riskFreeRate,
          iv,
          dividendYield
        );
        delta = g.delta; gamma = g.gamma; theta = g.theta; vega = g.vega; iv = g.iv;
      } catch (e) {}

      strike[type] = {
        symbol: raw.symbol,
        ltp: raw.ltp,
        oi: raw.oi || 0,
        oiChange: raw.oich || 0,
        volume: raw.volume || 0,
        iv: parseFloat(iv.toFixed(2)),
        delta, gamma, theta, vega,
        bid: raw.bid || 0, ask: raw.ask || 0
      };
    });
    // Clean up raw data
    delete strike.ce_raw;
    delete strike.pe_raw;
  }

  return Array.from(strikesMap.values()).sort((a, b) => a.strike - b.strike);
};

module.exports = { normalizeOptionsChain };
