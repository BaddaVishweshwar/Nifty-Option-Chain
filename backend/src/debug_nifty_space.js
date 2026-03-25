const fyers = require("fyers-api-v3");
const tokenStore = require("./auth/tokenStore");
require('dotenv').config({ path: '../.env' });

const test = async () => {
    const token = tokenStore.getAccessToken();
    const fyersModel = new fyers.fyersModel();
    fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
    fyersModel.setAccessToken(token);

    const symbols = ["NSE:NIFTY 50-INDEX", "NSE:NIFTY50-INDEX", "NSE:NIFTY-INDEX"];
    for (const sym of symbols) {
        console.log("\n--- Testing Symbol: '" + sym + "' ---");
        try {
            const res = await fyersModel.getOptionChain({
                symbol: sym,
                strikecount: 10,
                timestamp: ""
            });
            console.log("Status: " + res.s + ", Msg: " + (res.message || "SUCCESS"));
        } catch (err) {
            console.log("Error:", err.message);
        }
    }
};

test();
