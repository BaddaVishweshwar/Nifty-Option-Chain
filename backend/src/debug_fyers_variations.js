const fyers = require("fyers-api-v3");
const tokenStore = require("./auth/tokenStore");
require('dotenv').config({ path: '../.env' });

const test = async () => {
    const token = tokenStore.getAccessToken();
    const fyersModel = new fyers.fyersModel();
    fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
    fyersModel.setAccessToken(token);

    const symbols = ["NSE:NIFTY50-INDEX", "NSE:NIFTYBANK-INDEX"];
    
    for (const sym of symbols) {
        console.log("\n--- Testing Symbol: " + sym + " ---");
        try {
            const chain = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10
                // Omit timestamp
            });
            console.log("Result (no timestamp):", chain.s === "ok" ? "SUCCESS" : chain.message);

            const chain2 = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10,
                timestamp: ""
            });
            console.log("Result (timestamp ''):", chain2.s === "ok" ? "SUCCESS" : chain2.message);
        } catch (err) {
            console.log("Error for " + sym + ":", err.message);
        }
    }
};

test();
