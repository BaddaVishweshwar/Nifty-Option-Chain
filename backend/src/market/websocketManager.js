const { fyersDataSocket } = require("fyers-api-v3");
const tokenStore = require("../auth/tokenStore");
const tickStore = require("./tickStore");
const protobuf = require("protobufjs");
const WebSocket = require("ws");
const axios = require("axios");
const path = require("path");
require('dotenv').config();

let socket = null;
let io = null;
let upstoxProto = null;

const loadProto = async () => {
    if (upstoxProto) return upstoxProto;
    const root = await protobuf.load(path.join(__dirname, "upstox-market-data.proto"));
    upstoxProto = root.lookupType("com.upstox.marketdata.model.v2.MarketDataFeed");
    return upstoxProto;
};

const closeSocket = () => {
    if (socket) {
        try {
            if (socket.close) socket.close();
            console.log("Existing WebSocket closed.");
        } catch (err) {
            console.error("Error closing socket:", err.message);
        }
        socket = null;
    }
};

const initWebSocket = async (socketIoInstance) => {
    closeSocket();
    io = socketIoInstance;
    const token = tokenStore.getAccessToken();
    const provider = tokenStore.getProvider();

    if (!token) return;

    if (provider === 'upstox') {
        initUpstoxWS(token);
    } else {
        initFyersWS(token);
    }
};

const initFyersWS = (token) => {
    try {
        const { fyersDataSocket } = require("fyers-api-v3");
        const fullToken = `${process.env.FYERS_CLIENT_ID}:${token}`;
        socket = new fyersDataSocket(fullToken);
        
        socket.on("connect", () => {
            console.log("Fyers WebSocket connected");
            if (io) io.emit("connection_status", { connected: true });
        });

        socket.on("message", (ticks) => {
            if (Array.isArray(ticks)) {
                ticks.forEach(t => tickStore.setTick(t.symbol, t));
                if (io) io.emit("tick_update", ticks);
            } else if (ticks) {
                tickStore.setTick(ticks.symbol, ticks);
                if (io) io.emit("tick_update", [ticks]);
            }
        });

        socket.on("error", (err) => console.error("Fyers WS Error:", err));
        socket.on("close", () => {
            console.log("Fyers WS Closed");
            if (io) io.emit("connection_status", { connected: false });
        });

        socket.connect();
    } catch (err) {
        console.error("Fyers WS Init Error:", err);
    }
};

const initUpstoxWS = async (token) => {
    try {
        const protoType = await loadProto();
        
        // 1. Authorize Market Data Feed
        const authRes = await axios.get("https://api.upstox.com/v2/feed/market-data-feed/authorize", {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        const wsUrl = authRes.data.data.authorized_redirect_uri;
        socket = new WebSocket(wsUrl, { followRedirects: true });

        socket.on("open", () => {
            console.log("Upstox WebSocket connected");
            if (io) io.emit("connection_status", { connected: true });
        });

        socket.on("message", (data) => {
            try {
                const decoded = protoType.decode(data);
                const result = protoType.toObject(decoded, { longs: String, enums: String, bytes: String });
                
                const ticks = Object.entries(result.data).map(([symbol, detail]) => {
                    const greeks = detail.optionGreeks || {};
                    const details = detail.marketFullDetails || detail.extendedFeed || {};
                    const ltp = detail.ltp?.lastPrice || details.lastPrice || 0;

                    const normalizedTick = {
                        symbol,
                        ltp,
                        oi: details.oi || 0,
                        oich: details.oich || 0,
                        iv: greeks.iv || 0,
                        delta: greeks.delta || 0,
                        theta: greeks.theta || 0,
                        gamma: greeks.gamma || 0,
                        vega: greeks.vega || 0
                    };
                    tickStore.setTick(symbol, normalizedTick);
                    return normalizedTick;
                });

                if (io) io.emit("tick_update", ticks);
            } catch (err) {
                console.error("Upstox Protobuf Decode Error:", err);
            }
        });

        socket.on("error", (err) => console.error("Upstox WS Error:", err));
        socket.on("close", () => {
            console.log("Upstox WS Closed");
            if (io) io.emit("connection_status", { connected: false });
        });

    } catch (err) {
        console.error("Upstox WS Init Error:", err);
    }
};

const subscribeSymbols = (symbols) => {
    const provider = tokenStore.getProvider();
    if (provider === 'upstox' && socket && socket.readyState === WebSocket.OPEN) {
        const request = {
            guid: "guid",
            method: "sub",
            data: { mode: "full", instrumentKeys: symbols }
        };
        socket.send(JSON.stringify(request));
    } else if (socket && socket.subscribe) {
        socket.subscribe(symbols);
        socket.mode(socket.mode.Full, symbols);
    }
};

const unsubscribeSymbols = (symbols) => {
    const provider = tokenStore.getProvider();
    if (provider === 'upstox' && socket && socket.readyState === WebSocket.OPEN) {
        const request = {
            guid: "guid",
            method: "unsub",
            data: { mode: "full", instrumentKeys: symbols }
        };
        socket.send(JSON.stringify(request));
    } else if (socket && socket.unsubscribe) {
        socket.unsubscribe(symbols);
    }
};

module.exports = {
    initWebSocket,
    subscribeSymbols,
    unsubscribeSymbols
};
