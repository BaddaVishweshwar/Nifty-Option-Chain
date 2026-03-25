const { getUpstoxModel } = require("./upstoxClient");
const tokenStore = require("../auth/tokenStore");

const getOptionChain = async (symbol, strikecount = 10) => {
  return getUpstoxOptionChain(symbol, strikecount);
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
            // Upstox v3 IV is usually decimal (0.28), but we want percentage (28.0)
            const extractIv = (greekObj, fallbackObj) => {
                const val = greekObj.iv !== undefined ? greekObj.iv : (fallbackObj?.option_greeks?.iv || 0);
                return val > 1 ? val : val * 100;
            };
            const ceIv = extractIv(ceGreeks, ce);
            const peIv = extractIv(peGreeks, pe);

            // Upstox v3 Theta appears to be annualized in some contexts or raw points.
            // If Theta > 200, it's definitely annual. 
            const normalizeTheta = (val) => Math.abs(val) > 200 ? val / 365 : val;

            return {
                strike: item.strike_price,
                ce: {
                    symbol: ce?.instrument_key || '',
                    ltp: ce?.market_data?.last_price || 0,
                    oi: ce?.market_data?.oi || 0,
                    oiChange: 0,
                    iv: ceIv,
                    delta: ceGreeks.delta || 0,
                    theta: normalizeTheta(ceGreeks.theta || 0),
                    gamma: (ceGreeks.gamma || 0) * 100,
                    vega: ceGreeks.vega || 0
                },
                pe: {
                    symbol: pe?.instrument_key || '',
                    ltp: pe?.market_data?.last_price || 0,
                    oi: pe?.market_data?.oi || 0,
                    oiChange: 0,
                    iv: peIv,
                    delta: peGreeks.delta || 0,
                    theta: normalizeTheta(peGreeks.theta || 0),
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
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Upstox Chain Error Detail:", detail);
        throw new Error(`Upstox API Error: ${detail}`);
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
