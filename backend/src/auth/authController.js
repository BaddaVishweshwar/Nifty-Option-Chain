const tokenStore = require("./tokenStore");
const { getUpstoxModel } = require("../market/upstoxClient");
require('dotenv').config();

const getUpstoxAuthUrl = (req, res) => {
  const upstox = getUpstoxModel();
  const url = upstox.getGenerateAuthUrl();
  res.json({ url });
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
const logout = async (req, res) => {
    tokenStore.clear();
    res.json({ success: true, message: "Logged out from all providers" });
};

const getStatus = (req, res) => {
  const token = tokenStore.getAccessToken();
  res.json({ 
    authenticated: !!token, 
    provider: "upstox" 
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
  getUpstoxAuthUrl,
  handleUpstoxCallback,
  logout,
  getStatus,
  getPrivacyStatus,
  verifyCredentials
};
