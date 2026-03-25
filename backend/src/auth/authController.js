const fyers = require("fyers-api-v3");
const tokenStore = require("./tokenStore");
require('dotenv').config();

const fyersModel = new fyers.fyersModel();
fyersModel.setAppId(process.env.FYERS_CLIENT_ID);
fyersModel.setRedirectUrl(process.env.FYERS_REDIRECT_URI);

const getAuthUrl = (req, res) => {
  const authUrl = fyersModel.generateAuthCode();
  res.json({ url: authUrl });
};

const handleCallback = async (req, res) => {
  const { auth_code } = req.query;
  
  if (!auth_code) {
    return res.status(400).json({ error: "No auth code provided" });
  }

  try {
    console.log("Exchanging auth_code for access_token...");
    const response = await fyersModel.generate_access_token({
      secret_key: process.env.FYERS_SECRET_KEY,
      auth_code
    });

    console.log("Fyers Response Keys:", Object.keys(response));
    console.log("Fyers Response (Partial):", JSON.stringify({ ...response, access_token: response.access_token ? "PRESENT" : "MISSING" }, null, 2));

    const token = response.access_token || (response.data && response.data.access_token);
    console.log("Extracted Token:", token ? "FOUND" : "NOT FOUND");

    if (response.s === "ok" && token) {
      tokenStore.setAccessToken(token);
      console.log("Token saved successfully.");

      // Re-initialize WebSocket after login
      const { getIo } = require("../gateway/socketGateway");
      const { initWebSocket } = require("../market/websocketManager");
      const io = getIo();
      if (io) {
        console.log("Triggering WebSocket initialization after login...");
        initWebSocket(io);
      }

      res.redirect(`${process.env.FRONTEND_URL}/?auth=success`);
    } else {
      console.error("Token exchange failed or token missing:", response.message || "Unknown error");
      res.status(400).send(`Token exchange failed: ${response.message || "Token missing"}. Please try logging in again.`);
    }
  } catch (error) {
    console.error("Auth callback error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getStatus = (req, res) => {
  const token = tokenStore.getAccessToken();
  const staticToken = process.env.FYERS_ACCESS_TOKEN;
  res.json({ authenticated: !!(token || staticToken) });
};

const getPrivacyStatus = (req, res) => {
  res.json({ required: !!process.env.AUTH_PASSPHRASE });
};

const verifyPassphrase = (req, res) => {
  const { passphrase } = req.body;
  if (passphrase === process.env.AUTH_PASSPHRASE) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  getStatus,
  getPrivacyStatus,
  verifyPassphrase
};
