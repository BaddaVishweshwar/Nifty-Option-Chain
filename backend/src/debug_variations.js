const fyers = require("fyers-api-v3");
const tokenStore = require("./auth/tokenStore");
require('dotenv').config({ path: '../.env' });

const test = async () => {
    const token = tokenStore.getAccessToken();
    const fyersModel = new fyers.fyersModel();
    fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
    fyersModel.setAccessToken(token);

    const symbols = [
        "NSE:NIFTY50-INDEX", 
        "NSE:NIFTYBANK-INDEX", 
        "NSE:FINNIFTY-INDEX"
    ];
    
    for (const sym of symbols) {
        console.log(`\n--- Testing Symbol: ${sym} ---`);
        try {
            // Test 1: No timestamp
            const res1 = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10
            });
            console.log(`[Test 1] Status: ${res1.s}`);
            if (res1.s === "ok" && res1.data.optionsChain) {
                console.log("Total entries:", res1.data.optionsChain.length);
                const strikes = res1.data.optionsChain.filter(s => s.strike_price > 0);
                console.log("Strikes found:", strikes.length);
                if (strikes.length > 0) {
                    console.log("First Strike Entry:", JSON.stringify(strikes[0], null, 2));
                } else {
                    console.log("No positive strikes found in first 10. Sample entry 1:", JSON.stringify(res1.data.optionsChain[1], null, 2));
                }
            }

            // Test 2: Timestamp ""
            const res2 = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10,
                timestamp: ""
            });
            console.log(`[Test 2 - TS ''] Status: ${res2.s}, Msg: ${res2.message}`);

            // Test 3: Timestamp null
             const res3 = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10,
                timestamp: null
            });
            console.log(`[Test 3 - TS null] Status: ${res3.s}, Msg: ${res3.message}`);

        } catch (err) {
            console.log(`Error for ${sym}:`, err.message);
        }
    }
};

test();
