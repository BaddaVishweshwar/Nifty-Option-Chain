const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cron = require("node-cron");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const marketRoutes = require("./routes/marketRoutes");
const { initGateway } = require("./gateway/socketGateway");
const { initWebSocket } = require("./market/websocketManager");
const { initSnapshotJob } = require("./oi/oiSnapshotService");
const tokenStore = require("./auth/tokenStore");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);

// Socket.io Gateway
const io = initGateway(server);

// Initialize OI Snapshot Service
initSnapshotJob(io);

// Initialize Fyers WebSocket if token exists
const token = tokenStore.getAccessToken();
if (token) {
  try {
    initWebSocket(io);
  } catch (err) {
    console.error("Failed to initialize WebSocket on startup:", err.message);
  }
}

// Daily token refresh alert at 8:30 AM IST
cron.schedule("30 8 * * *", () => {
  console.log("IMPORTANT: Refresh Fyers access token manually or via login flow.");
}, {
  timezone: "Asia/Kolkata"
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT} (0.0.0.0)`);
});
