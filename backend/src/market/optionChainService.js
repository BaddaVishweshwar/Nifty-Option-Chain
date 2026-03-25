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

        // 1. Get Expiry Dates
        const metadata = await upstox.getMarketQuote([instrumentKey]);
        // Upstox provides option chain directly via a specialized endpoint
        // Let's use the /v2/option/chain endpoint which is better for full chain
        
        // Find closest expiry for index (usually fetched from quotes or metadata)
        // For simplicity, we'll fetch the chain for the underlying
        const fullChainResponse = await upstox.getOptionChain(instrumentKey, ''); // '' gets all or closest
        
        if (fullChainResponse.status !== 'success') {
            throw new Error(fullChainResponse.errors?.[0]?.message || "Failed to fetch Upstox chain");
        }

        const rawData = fullChainResponse.data;
        // Upstox v2 option chain format: Array of strikes with call_options and put_options
        // Each option object includes market_data and option_greeks
        
        const spot = rawData[0]?.underlying_key ? (await upstox.getMarketQuote([instrumentKey])).data[instrumentKey].last_price : 0;

        const normalizedChain = rawData.map(item => {
            const ce = item.call_options;
            const pe = item.put_options;
            const ceGreeks = ce?.option_greeks || {};
            const peGreeks = pe?.option_greeks || {};

            return {
                strike: item.strike_price,
                ce: {
                    symbol: ce?.instrument_key || '',
                    ltp: ce?.market_data?.last_price || 0,
                    oi: ce?.market_data?.oi || 0,
                    oiChange: 0, // Upstox v2 chain doesn't always show daily change here
                    iv: (ceGreeks.iv || 0) * 100,
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
                    iv: (peGreeks.iv || 0) * 100,
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
