const { calculateGreeks, calculateIV } = require("./greeks");

const normalizeOptionsChain = (rawChain, spotPrice = 0, expiryDate = null) => {
  const strikesMap = new Map();
  const riskFreeRate = 0.10; // 10% standard for India NSE
  
  // Calculate time to expiry in years (Force IST context)
  let timeToExpiry = 0.00001;
  if (expiryDate) {
    const now = new Date();
    // Convert current time to IST offset (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + istOffset);
    
    const expiry = new Date(expiryDate);
    // Expiry is end of day IST (3:30 PM)
    const expiryIst = new Date(expiry.getTime() + istOffset);
    expiryIst.setHours(15, 30, 0, 0); 
    
    const diffMs = expiryIst.getTime() - nowIst.getTime();
    const minTime = 1 / (24 * 365); // 1 hour min
    timeToExpiry = Math.max(minTime, diffMs / (1000 * 60 * 60 * 24 * 365));
  }

  rawChain.forEach(item => {
    if (item.strike_price === -1) return;

    const strikePrice = item.strike_price;
    if (!strikesMap.has(strikePrice)) {
      strikesMap.set(strikePrice, {
        strike: strikePrice,
        ce: {},
        pe: {}
      });
    }

    const strike = strikesMap.get(strikePrice);
    
    // Greeks Derivation
    let delta = 0, gamma = 0, theta = 0, vega = 0, iv = 0;

    if (spotPrice > 0 && item.ltp > 0) {
      try {
        // 1. Derive IV from LTP (Implied Volatility)
        iv = calculateIV(
          item.option_type,
          spotPrice,
          strikePrice,
          timeToExpiry,
          riskFreeRate,
          item.ltp
        );

        // 2. Calculate Greeks using the Derived IV
        const calculated = calculateGreeks(
          item.option_type,
          spotPrice,
          strikePrice,
          timeToExpiry,
          riskFreeRate,
          iv
        );
        delta = calculated.delta;
        gamma = calculated.gamma;
        theta = calculated.theta;
        vega = calculated.vega;
        iv = calculated.iv; // Return as percentage for UI
      } catch (e) {
        console.error(`[Greeks Error] ${item.option_type} strike ${strikePrice}:`, e.message);
      }
    }

    const data = {
      symbol: item.symbol,
      ltp: item.ltp || 0,
      prevLtp: item.ltp || 0,
      oi: item.oi || 0,
      oiChange: item.oich || 0,
      volume: item.volume || 0,
      iv: parseFloat(iv.toFixed(2)),
      delta,
      gamma,
      theta,
      vega,
      bidQty: item.bidQty || 0,
      askQty: item.askQty || 0,
      bid: item.bid || 0,
      ask: item.ask || 0
    };

    if (item.option_type === "CE") {
      strike.ce = data;
    } else if (item.option_type === "PE") {
      strike.pe = data;
    }
  });

  // Convert map to sorted array
  return Array.from(strikesMap.values()).sort((a, b) => a.strike - b.strike);
};

module.exports = { normalizeOptionsChain };
