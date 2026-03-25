const fyers = require("fyers-api-v3");
const tokenStore = require("./tokenStore");
const { getUpstoxModel } = require("../market/upstoxClient");
require('dotenv').config();

const fyersModel = new fyers.fyersModel();
fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
fyersModel.setRedirectUrl(process.env.FYERS_REDIRECT_URI);

const getAuthUrl = (req, res) => {
  const authUrl = fyersModel.generateAuthCode();
  res.json({ url: authUrl });
};

const getUpstoxAuthUrl = (req, res) => {
  const upstox = getUpstoxModel();
  const url = upstox.getGenerateAuthUrl();
  res.json({ url });
};

const handleCallback = async (req, res) => {
  const { auth_code } = req.query;
  
  if (!auth_code) {
    return res.status(400).json({ error: "No auth code provided" });
  }

  try {
    console.log("[Fyers] Exchanging auth_code for access_token...");
    const response = await fyersModel.generate_access_token({
      secret_key: process.env.FYERS_SECRET_KEY,
      auth_code
    });

    const token = response.access_token || (response.data && response.data.access_token);

    if (response.s === "ok" && token) {
      tokenStore.setAccessToken(token);
      tokenStore.setProvider("fyers");
      
      const { getIo } = require("../gateway/socketGateway");
      const { initWebSocket } = require("../market/websocketManager");
      const io = getIo();
      if (io) initWebSocket(io);

      res.redirect(`${process.env.FRONTEND_URL}/?auth=success`);
    } else {
      res.status(400).send(`Fyers Token exchange failed: ${response.message || "Token missing"}`);
    }
  } catch (error) {
    console.error("Fyers Auth callback error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const handleUpstoxCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "No auth code provided" });

    try {
        console.log("[Upstox] Exchanging code for access_token...");
        const upstox = getUpstoxModel();
        const response = await upstox.generateToken(code);

        if (response && response.access_token) {
            tokenStore.setAccessToken(response.access_token);
            tokenStore.setProvider("upstox");

            const { getIo } = require("../gateway/socketGateway");
            const { initWebSocket } = require("../market/websocketManager");
            const io = getIo();
            if (io) initWebSocket(io);

            res.redirect(`${process.env.FRONTEND_URL}/?auth=success&provider=upstox`);
        } else {
            res.status(400).send("Upstox Token exchange failed");
        }
    } catch (error) {
        console.error("Upstox Auth callback error:", error);
        res.status(500).send("Upstox Auth failed");
    }
};

const getStatus = (req, res) => {
  const token = tokenStore.getAccessToken();
  const provider = tokenStore.getProvider();
  res.json({ 
    authenticated: !!token, 
    provider: provider || "fyers" 
  });
};

const getPrivacyStatus = (req, res) => {
  res.json({ required: !!(process.env.APP_EMAIL && process.env.APP_PASSWORD) });
};

const verifyCredentials = (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.APP_EMAIL && password === process.env.APP_PASSWORD) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
};

module.exports = {
  getAuthUrl,
  getUpstoxAuthUrl,
  handleCallback,
  handleUpstoxCallback,
  getStatus,
  getPrivacyStatus,
  verifyCredentials
};
