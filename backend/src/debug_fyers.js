const fyers = require("fyers-api-v3");
const tokenStore = require("./auth/tokenStore");
const db = require("./oi/db");
require('dotenv').config({ path: '../.env' });

const test = async () => {
    const token = tokenStore.getAccessToken();
    if (!token) {
        console.log("No token found in DB");
        return;
    }

    const fyersModel = new fyers.fyersModel();
    fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
    fyersModel.setAccessToken(token);

    console.log("Testing with Symbol: NSE:NIFTY50-INDEX");
    try {
        const quotes = await fyersModel.getQuotes(["NSE:NIFTY50-INDEX"]);
        console.log("Quotes result:", JSON.stringify(quotes, null, 2));

        const chain = await fyersModel.getOptionChain({
            symbol: "NSE:NIFTY50-INDEX",
            strikecount: 10
        });
        console.log("Chain result:", JSON.stringify(chain, null, 2));
    } catch (err) {
        console.error("Test failed:", err);
    }
};

test();
