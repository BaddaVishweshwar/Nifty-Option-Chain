const { getFyersModel } = require("./fyersClient");

const getOptionChain = async (symbol, strikecount = 10) => {
  const fyersModel = getFyersModel();
  if (!fyersModel) throw new Error("Not authenticated");

  try {
    let response = await fyersModel.getOptionChain({
      symbol,
      strikecount,
      timestamp: ""
    });

    // Fallback for NIFTY 50 if primary symbol fails
    if (response.s !== "ok" && symbol === "NSE:NIFTY50-INDEX") {
      console.log("NIFTY50 primary failed, trying fallback NSE:NIFTY-INDEX...");
      response = await fyersModel.getOptionChain({
        symbol: "NSE:NIFTY-INDEX",
        strikecount,
        timestamp: ""
      });
    }

    if (response.s === "ok") {
      let { underlyingLtp, underlying_ltp, optionsChain } = response.data;
      
      if (optionsChain && optionsChain.length > 0) {
        const firstOption = optionsChain.find(o => o.strike_price > 0);
        if (firstOption) {
          console.log("[RAW DATA DEBUG] First Option Item:", JSON.stringify(firstOption, null, 2));
        }
      }

      let spot = underlyingLtp || underlying_ltp || 0;

      // If spot is still 0, try to fetch it manually via Quotes
      if (spot === 0) {
        try {
          console.log(`[API] Spot 0 for ${symbol}, fetching manual quote...`);
          const quoteResponse = await fyersModel.getQuotes([symbol]);
          if (quoteResponse.s === "ok" && quoteResponse.d && quoteResponse.d[0]) {
            spot = quoteResponse.d[0].v.lp;
            console.log(`[API] Extracted manual spot for ${symbol}: ${spot}`);
          }
        } catch (quoteErr) {
          console.error("Error fetching manual quote:", quoteErr.message);
        }
      }

      const { normalizeOptionsChain } = require("../utils/normalizer");
      
      let expiryDate = null;
      if (optionsChain && optionsChain.length > 0) {
        // Find the first actual option symbol (skip the index symbol if present)
        const optionItem = optionsChain.find(item => 
          item.symbol.includes("CE") || item.symbol.includes("PE")
        );
        
        if (optionItem) {
          const fullSymbol = optionItem.symbol.replace("NSE:", "").replace("BSE:", "");
          
          // Fyers v3 date part is usually after the name and before the strike
          // regex to find 26MAR or 26326
          const dateMatch = fullSymbol.match(/[A-Z]+(\d{2}[A-Z]{3}|\d{5})/);
          if (dateMatch) {
            const datePart = dateMatch[1];
            console.log(`[Debug] Date Part found: ${datePart} from ${fullSymbol}`);
            
            if (datePart.length === 5 && !isNaN(datePart)) {
              // Weekly: YYMDD
              const year = "20" + datePart.substring(0, 2);
              const monthCode = datePart.substring(2, 3);
              const day = parseInt(datePart.substring(3, 5));
              const monthsMap = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5, "7": 6, "8": 7, "9": 8, "O": 9, "N": 10, "D": 11 };
              const month = monthsMap[monthCode];
              if (month !== undefined && !isNaN(day)) {
                expiryDate = new Date(parseInt(year), month, day);
              }
            } else if (datePart.length === 5) {
              // Monthly: YYMMM
              const year = "20" + datePart.substring(0, 2);
              const monthStr = datePart.substring(2, 5);
              const monthsMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
              const month = monthsMap[monthStr];
              if (month !== undefined) {
                const lastDay = new Date(parseInt(year), month + 1, 0);
                let lastThursday = lastDay.getDate();
                while (new Date(parseInt(year), month, lastThursday).getDay() !== 4) {
                   lastThursday--;
                }
                expiryDate = new Date(parseInt(year), month, lastThursday);
              }
            }
          }
        }
        
        if (!expiryDate) {
          console.warn(`[Expiry] FAILED TO PARSE SYMBOL. Using fallback.`);
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + ((4 + 7 - fallback.getDay()) % 7 || 7));
          expiryDate = fallback;
        }
      }

      const normalizedChain = normalizeOptionsChain(optionsChain, spot, expiryDate);
      console.log(`[Greeks] Result: ${optionsChain ? optionsChain.length : 0} items. Expiry: ${expiryDate ? expiryDate.toISOString().split('T')[0] : 'None'}`);
      
      return {
        underlyingLtp: spot,
        optionsChain: normalizedChain
      };
    } else {
      throw new Error(response.message || "Failed to fetch option chain");
    }
  } catch (error) {
    console.error("Error fetching option chain:", error);
    throw error;
  }
};

const getSymbols = (req, res) => {
  const symbols = [
    { label: "NIFTY 50", value: "NSE:NIFTY50-INDEX" },
    { label: "BANK NIFTY", value: "NSE:NIFTYBANK-INDEX" },
    { label: "FIN NIFTY", value: "NSE:FINNIFTY-INDEX" },
    { label: "SENSEX", value: "BSE:SENSEX-INDEX" }
  ];
  res.json(symbols);
};

module.exports = {
  getOptionChain,
  getSymbols
};
