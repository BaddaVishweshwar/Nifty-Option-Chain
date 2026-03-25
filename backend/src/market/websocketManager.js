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

    if (!token) return;

    initUpstoxWS(token);
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
                    const ltp = detail.ltp?.lastPrice || details.last_price || 0;
                    
                    const ivRaw = (detail.iv !== undefined) ? detail.iv : (greeks.iv || 0);
                    const iv = ivRaw > 1 ? ivRaw : ivRaw * 100;
                    const normalizeTheta = (val) => Math.abs(val) > 200 ? val / 365 : val;

                    const normalizedTick = {
                        symbol,
                        ltp,
                        oi: details.oi || 0,
                        oich: details.oich || 0,
                        iv: iv,
                        delta: greeks.delta || 0,
                        theta: normalizeTheta(greeks.theta || 0),
                        gamma: (greeks.gamma || 0) * 100,
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
    if (socket && socket.readyState === WebSocket.OPEN) {
        // Map common keys to Upstox specific instrument keys for subscription
        const symbolMap = {
            "NSE:NIFTY50-INDEX": "NSE_INDEX|Nifty 50",
            "NSE:NIFTYBANK-INDEX": "NSE_INDEX|Nifty Bank",
            "NSE:FINNIFTY-INDEX": "NSE_INDEX|Nifty Fin Service",
            "BSE:SENSEX-INDEX": "BSE_INDEX|SENSEX"
        };
        const mappedSymbols = symbols.map(s => symbolMap[s] || s);

        const request = {
            guid: "guid",
            method: "sub",
            data: { mode: "full", instrumentKeys: mappedSymbols }
        };
        socket.send(JSON.stringify(request));
    }
};

const unsubscribeSymbols = (symbols) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const request = {
            guid: "guid",
            method: "unsub",
            data: { mode: "full", instrumentKeys: symbols }
        };
        socket.send(JSON.stringify(request));
    }
};

module.exports = {
    initWebSocket,
    subscribeSymbols,
    unsubscribeSymbols
};
