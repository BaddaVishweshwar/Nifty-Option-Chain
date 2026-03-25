const { calculateGreeks } = require("./greeks");

const normalizeOptionsChain = (rawChain, spotPrice = 0, expiryDate = null) => {
  const strikesMap = new Map();
  const riskFreeRate = 0.07; // 7% standard for India
  
  // Calculate time to expiry in years
  let timeToExpiry = 0.00001;
  if (expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    // Set expiry to end of day (3:30 PM IST is typically 10:00 AM UTC, but let's just use end of day)
    expiry.setHours(15, 30, 0, 0); 
    const diffMs = expiry.getTime() - now.getTime();
    // Use a floor of 1 hour (1/24/365 years) to prevent Greeks from blowing up
    const minTime = 1 / (24 * 365);
    timeToExpiry = Math.max(minTime, diffMs / (1000 * 60 * 60 * 24 * 365));
  }

  rawChain.forEach(item => {
    if (item.strike_price === -1) return; // Skip underlying index entry

    const strikePrice = item.strike_price;
    if (!strikesMap.has(strikePrice)) {
      strikesMap.set(strikePrice, {
        strike: strikePrice,
        ce: {},
        pe: {}
      });
    }

    const strike = strikesMap.get(strikePrice);
    
    // Check if Greeks are provided by API, otherwise calculate
    let delta = item.delta || 0;
    let gamma = item.gamma || 0;
    let theta = item.theta || 0;
    let vega = item.vega || 0;

    // Use API IV if present, otherwise fallback to 15% for analytical calculation
    const isFallbackIV = !(item.iv > 0);
    const calcIV = (isFallbackIV ? 15.0 : item.iv) / 100;

    if ((delta === 0 || theta === 0) && spotPrice > 0) {
      try {
        const calculated = calculateGreeks(
          item.option_type,
          spotPrice,
          strikePrice,
          timeToExpiry,
          riskFreeRate,
          calcIV
        );
        delta = calculated.delta;
        gamma = calculated.gamma;
        theta = calculated.theta;
        vega = calculated.vega;

        if (strikePrice === Math.round(spotPrice / 100) * 100) {
           console.log(`[ATM Greeks] ${item.option_type} S:${spotPrice} K:${strikePrice} IV:${calcIV} t:${timeToExpiry.toFixed(6)} -> D:${delta} T:${theta}`);
        }
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
      iv: isFallbackIV ? 15.0 : item.iv, // Show fallback IV in UI
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
