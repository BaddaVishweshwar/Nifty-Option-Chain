const { getFyersModel } = require("./fyersClient");
const { getUpstoxModel } = require("./upstoxClient");
const tokenStore = require("../auth/tokenStore");

const getOptionChain = async (symbol, strikecount = 10) => {
  const provider = tokenStore.getProvider();
  
  if (provider === 'upstox') {
      return getUpstoxOptionChain(symbol, strikecount);
  } else {
      return getFyersOptionChain(symbol, strikecount);
  }
};

const getUpstoxOptionChain = async (symbol, strikecount) => {
    const upstox = getUpstoxModel();
    const token = tokenStore.getAccessToken();
    if (!token) throw new Error("Not authenticated with Upstox");
    upstox.setAccessToken(token);

    try {
        // Map symbol to Upstox instrument key
        const symbolMap = {
            "NSE:NIFTY50-INDEX": "NSE_INDEX|Nifty 50",
            "NSE:NIFTYBANK-INDEX": "NSE_INDEX|Nifty Bank",
            "NSE:FINNIFTY-INDEX": "NSE_INDEX|Nifty Fin Service",
            "BSE:SENSEX-INDEX": "BSE_INDEX|SENSEX"
        };
        const instrumentKey = symbolMap[symbol] || symbol;

        // 1. Fetch Chain (v2)
        const fullChainResponse = await upstox.getOptionChain(instrumentKey, '');
        if (fullChainResponse.status !== 'success') throw new Error("Failed to fetch Upstox chain");
        const rawData = fullChainResponse.data;

        // 2. Fetch High-Precision Greeks (v3) for all symbols in the chain
        const allInstrumentKeys = [];
        rawData.forEach(item => {
            if (item.call_options?.instrument_key) allInstrumentKeys.push(item.call_options.instrument_key);
            if (item.put_options?.instrument_key) allInstrumentKeys.push(item.put_options.instrument_key);
        });

        let v3GreeksMap = {};
        if (allInstrumentKeys.length > 0) {
            try {
                // Upstox v3 endpoint for greeks
                const greeksRes = await upstox.getOptionGreeks(allInstrumentKeys);
                if (greeksRes.status === 'success') {
                    v3GreeksMap = greeksRes.data;
                }
            } catch (err) {
                console.warn("[Upstox v3] Failed to fetch precision greeks, falling back to v2 chain greeks:", err.message);
            }
        }

        const spot = rawData[0]?.underlying_key ? (await upstox.getMarketQuote([instrumentKey])).data[instrumentKey].last_price : 0;

        const normalizedChain = rawData.map(item => {
            const ce = item.call_options;
            const pe = item.put_options;
            
            // Priority: v3 Greeks > v2 Greeks (inside option object) > v2 Greeks (at root? no, v2 is inside)
            const ceGreeks = v3GreeksMap[ce?.instrument_key] || ce?.option_greeks || {};
            const peGreeks = v3GreeksMap[pe?.instrument_key] || pe?.option_greeks || {};
            
            // Correct IV extraction (v3 greeks have iv at root of the object in map)
            const ceIv = ceGreeks.iv !== undefined ? ceGreeks.iv : (ce?.option_greeks?.iv || 0);
            const peIv = peGreeks.iv !== undefined ? peGreeks.iv : (pe?.option_greeks?.iv || 0);

            return {
                strike: item.strike_price,
                ce: {
                    symbol: ce?.instrument_key || '',
                    ltp: ce?.market_data?.last_price || 0,
                    oi: ce?.market_data?.oi || 0,
                    oiChange: 0,
                    iv: ceIv * 100,
                    delta: ceGreeks.delta || 0,
                    theta: ceGreeks.theta || 0,
                    gamma: (ceGreeks.gamma || 0) * 100,
                    vega: ceGreeks.vega || 0
                },
                pe: {
                    symbol: pe?.instrument_key || '',
                    ltp: pe?.market_data?.last_price || 0,
                    oi: pe?.market_data?.oi || 0,
                    oiChange: 0,
                    iv: peIv * 100,
                    delta: peGreeks.delta || 0,
                    theta: peGreeks.theta || 0,
                    gamma: (peGreeks.gamma || 0) * 100,
                    vega: peGreeks.vega || 0
                }
            };
        });

        return {
            underlyingLtp: spot,
            optionsChain: normalizedChain
        };

    } catch (error) {
        console.error("Upstox Chain Error:", error);
        throw error;
    }
};

const getFyersOptionChain = async (symbol, strikecount) => {
  const fyersModel = getFyersModel();
  const token = tokenStore.getAccessToken();
  if (!token) throw new Error("Not authenticated");
  fyersModel.setAccessToken(token);

  try {
    let response = await fyersModel.getOptionChain({
      symbol,
      strikecount,
      timestamp: ""
    });

    if (response.s === "ok") {
      let { underlyingLtp, underlying_ltp, optionsChain } = response.data;
      let spot = underlyingLtp || underlying_ltp || 0;

      const { normalizeOptionsChain } = require("../utils/normalizer");
      
      let expiryDate = null;
      if (response.data.expiryData && response.data.expiryData.length > 0) {
        const dateStr = response.data.expiryData[0].date;
        if (dateStr) {
          const parts = dateStr.split('-');
          expiryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }

      const normalizedChain = normalizeOptionsChain(optionsChain, spot, expiryDate);
      return {
        underlyingLtp: spot,
        optionsChain: normalizedChain
      };
    } else {
      throw new Error(response.message || "Failed to fetch Fyers chain");
    }
  } catch (error) {
    console.error("Fyers Chain Error:", error);
    throw error;
  }
};

const getSymbols = (req, res) => {
  const provider = tokenStore.getProvider();
  let symbols = [];
  
  if (provider === 'upstox') {
      symbols = [
        { label: "NIFTY 50", value: "NSE:NIFTY50-INDEX" },
        { label: "BANK NIFTY", value: "NSE:NIFTYBANK-INDEX" },
        { label: "FIN NIFTY", value: "NSE:FINNIFTY-INDEX" },
        { label: "SENSEX", value: "BSE:SENSEX-INDEX" }
      ];
  } else {
      symbols = [
        { label: "NIFTY 50", value: "NSE:NIFTY50-INDEX" },
        { label: "BANK NIFTY", value: "NSE:NIFTYBANK-INDEX" },
        { label: "FIN NIFTY", value: "NSE:FINNIFTY-INDEX" },
        { label: "SENSEX", value: "BSE:SENSEX-INDEX" }
      ];
  }
  res.json(symbols);
};

module.exports = {
  getOptionChain,
  getSymbols
};
