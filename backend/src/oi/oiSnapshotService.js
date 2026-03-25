const db = require("./db");
const cron = require("node-cron");
const tickStore = require("../market/tickStore");

const saveSnapshot = (symbol, expiry, strikesData) => {
  const insert = db.prepare(`
    INSERT INTO oi_snapshots (symbol, expiry, strike, option_type, oi, oi_change)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((data) => {
    data.forEach(item => {
      insert.run(symbol, expiry, item.strike, item.type, item.oi, item.oi_change);
    });
  });

  transaction(strikesData);
};

const calculatePCR = (strikesData) => {
  let totalCEOI = 0;
  let totalPEOI = 0;

  strikesData.forEach(strike => {
    totalCEOI += strike.ce_oi || 0;
    totalPEOI += strike.pe_oi || 0;
  });

  return {
    pcr: totalCEOI > 0 ? (totalPEOI / totalCEOI) : 0,
    totalCEOI,
    totalPEOI
  };
};

const calculateMaxPain = (strikesData) => {
  // Simple max pain calculation: strike with minimum total loss
  let minLoss = Infinity;
  let maxPainStrike = 0;

  const strikes = strikesData.map(s => s.strike);

  strikes.forEach(s => {
    let totalLoss = 0;
    strikesData.forEach(item => {
      // CE Loss: if strike > ce_strike, loss = (strike - ce_strike) * oi
      if (s > item.strike && item.ce_oi) {
        totalLoss += (s - item.strike) * item.ce_oi;
      }
      // PE Loss: if strike < pe_strike, loss = (pe_strike - strike) * oi
      if (s < item.strike && item.pe_oi) {
        totalLoss += (item.strike - s) * item.pe_oi;
      }
    });

    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = s;
    }
  });

  return maxPainStrike;
};

const initSnapshotJob = (io) => {
  // Every 1 minute during market hours (9:15 AM to 3:30 PM IST)
  cron.schedule("* 9-15 * * 1-5", () => {
    // This would typically iterate over current active subscriptions
    // For now, it's a placeholder for the logic to be called from the gateway or market service
    console.log("OI Snapshot job triggered - implementation depends on active symbols");
  }, {
    timezone: "Asia/Kolkata"
  });

  // Also emit PCR/Max Pain every 5s/30s
  setInterval(() => {
    // Logic to calculate and emit based on current in-memory data
    // This will be linked to the gateway
  }, 5000);
};

module.exports = {
  saveSnapshot,
  calculatePCR,
  calculateMaxPain,
  initSnapshotJob
};
