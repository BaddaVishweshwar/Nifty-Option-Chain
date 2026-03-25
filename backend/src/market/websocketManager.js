const { fyersDataSocket } = require("fyers-api-v3");
const tokenStore = require("../auth/tokenStore");
const tickStore = require("./tickStore");
require('dotenv').config();

let socket = null;
let io = null;

const closeSocket = () => {
  if (socket) {
    try {
      socket.close();
      console.log("Existing Fyers WebSocket closed.");
    } catch (err) {
      console.error("Error closing socket:", err.message);
    }
    socket = null;
  }
};

const initWebSocket = (socketIoInstance) => {
  closeSocket();
  io = socketIoInstance;
  const token = tokenStore.getAccessToken();
  
  if (!token || typeof token !== 'string' || token.length < 10) {
    console.error("No valid access token found for WebSocket");
    return;
  }

  try {
    const fullToken = `${process.env.FYERS_CLIENT_ID}:${token}`;
    console.log(`Initializing FyersDataSocket with token (length: ${fullToken.length})...`);
    socket = new fyersDataSocket(fullToken);
    console.log("FyersDataSocket initialization completed.");
  } catch (err) {
    console.error("Error setting up Fyers Data Socket:", err.message);
    if (err.message.includes("expired")) {
      console.log("Token expired. Clearing token store...");
      // We can't easily clear it from here without risking circular dep or db direct
      // But we can at least log it. The next time the user loads the page, /api/auth/status should ideally check this.
    }
    return;
  }
  
  let isConnecting = false;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = () => {
    if (isConnecting) return;
    isConnecting = true;
    console.log(`[WebSocket] Connecting to Fyers (Attempt ${reconnectAttempts + 1})...`);
    socket.connect();
  };

  socket.on("connect", () => {
    console.log("Fyers WebSocket connected");
    isConnecting = false;
    reconnectAttempts = 0;
    if (io) io.emit("connection_status", { connected: true });
  });

  socket.on("message", (ticks) => {
    if (Array.isArray(ticks)) {
      ticks.forEach(tick => {
        tickStore.setTick(tick.symbol, tick);
      });
      if (io) io.emit("tick_update", ticks);
    } else if (ticks) {
      tickStore.setTick(ticks.symbol, ticks);
      if (io) io.emit("tick_update", [ticks]);
    }
  });

  socket.on("error", (err) => {
    console.error("Fyers WebSocket error:", err);
    isConnecting = false;
    handleReconnect();
  });

  socket.on("close", () => {
    console.log("Fyers WebSocket closed");
    isConnecting = false;
    if (io) io.emit("connection_status", { connected: false });
    handleReconnect();
  });

  const handleReconnect = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log(`[WebSocket] Retrying in ${delay / 1000}s...`);
      setTimeout(connect, delay);
    } else {
      console.error("[WebSocket] Max reconnect attempts reached.");
    }
  };

  connect();
};

const subscribeSymbols = (symbols) => {
  if (socket) {
    socket.subscribe(symbols);
    // Mode 1: Lite, Mode 2: Full
    socket.mode(socket.mode.Full, symbols);
  }
};

const unsubscribeSymbols = (symbols) => {
  if (socket) {
    socket.unsubscribe(symbols);
  }
};

module.exports = {
  initWebSocket,
  subscribeSymbols,
  unsubscribeSymbols
};
