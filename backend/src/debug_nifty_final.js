const fyers = require("fyers-api-v3");
const tokenStore = require("./auth/tokenStore");
require('dotenv').config({ path: '../.env' });

const test = async () => {
    const token = tokenStore.getAccessToken();
    const fyersModel = new fyers.fyersModel();
    fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
    fyersModel.setAccessToken(token);

    const sym = "NSE:NIFTY-INDEX";
    console.log("\n--- Testing Symbol: " + sym + " ---");
    try {
        const res = await fyersModel.getOptionChain({
            symbol: sym,
            strikecount: 10
        });
        console.log("Status: " + res.s + ", Msg: " + (res.message || "SUCCESS"));
        if (res.s === "ok") {
            console.log("Sample Data:", JSON.stringify(res.data.expiryData[0] || {}, null, 2).substring(0, 200));
        }
    } catch (err) {
        console.log("Error:", err.message);
    }
};

test();
