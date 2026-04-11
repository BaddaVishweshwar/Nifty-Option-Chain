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

        // 1. Get available expiries from option contracts
        const contractsRes = await upstox.getOptionContracts(instrumentKey);
        if (contractsRes.status !== 'success' || !contractsRes.data || contractsRes.data.length === 0) {
            throw new Error(`No option expiries found for ${instrumentKey}`);
        }
        
        // Extract unique expiry dates from contract objects, sorted chronologically
        const expiries = [...new Set(contractsRes.data.map(c => c.expiry || c.expiry_date))]
            .filter(Boolean)
            .sort((a, b) => new Date(a) - new Date(b));
            
        const nearestExpiry = expiries[0];
        console.log(`[Upstox] Using nearest expiry: ${nearestExpiry} for ${instrumentKey}`);

        // 2. Fetch Put/Call Option Chain (v2) - already includes option_greeks natively
        const fullChainResponse = await upstox.getOptionChain(instrumentKey, nearestExpiry);
        if (fullChainResponse.status !== 'success') {
            throw new Error(`Upstox Chain API Error: ${JSON.stringify(fullChainResponse)}`);
        }
        const rawData = fullChainResponse.data || [];

        // 3. Get spot price directly from chain data (already embedded by Upstox)
        const spot = rawData[0]?.underlying_spot_price || 0;
        console.log(`[Upstox] Spot price from chain: ${spot}, Total strikes: ${rawData.length}`);

        const normalizeTheta = (val) => Math.abs(val) > 200 ? val / 365 : val;
        const extractIv = (greekObj) => {
            const val = greekObj?.iv ?? 0;
            return val > 1 ? val : val * 100;
        };

        const normalizedChain = rawData.map(item => {
            const ce = item.call_options;
            const pe = item.put_options;
            const ceG = ce?.option_greeks || {};
            const peG = pe?.option_greeks || {};

            return {
                strike: item.strike_price,
                ce: {
                    symbol: ce?.instrument_key || '',
                    ltp: ce?.market_data?.ltp || 0,
                    oi: ce?.market_data?.oi || 0,
                    oiChange: (ce?.market_data?.oi || 0) - (ce?.market_data?.prev_oi || 0),
                    iv: extractIv(ceG),
                    delta: ceG.delta || 0,
                    theta: normalizeTheta(ceG.theta || 0),
                    gamma: ceG.gamma || 0,
                    vega: ceG.vega || 0
                },
                pe: {
                    symbol: pe?.instrument_key || '',
                    ltp: pe?.market_data?.ltp || 0,
                    oi: pe?.market_data?.oi || 0,
                    oiChange: (pe?.market_data?.oi || 0) - (pe?.market_data?.prev_oi || 0),
                    iv: extractIv(peG),
                    delta: peG.delta || 0,
                    theta: normalizeTheta(peG.theta || 0),
                    gamma: peG.gamma || 0,
                    vega: peG.vega || 0
                }
            };
        });

        return {
            underlyingLtp: spot,
            optionsChain: normalizedChain
        };

    } catch (error) {
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error("Upstox Chain Error:", detail);
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
