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
let FeedRequest = null;

const loadProto = async () => {
    if (upstoxProto) return { MarketDataFeed: upstoxProto, FeedRequest };
    const root = await protobuf.load(path.join(__dirname, "upstox-market-data.proto"));
    upstoxProto = root.lookupType("com.upstox.marketdata.model.v3.MarketDataFeed");
    FeedRequest = root.lookupType("com.upstox.marketdata.model.v3.FeedRequest");
    return { MarketDataFeed: upstoxProto, FeedRequest };
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
        const { MarketDataFeed: protoType } = await loadProto();
        
        // 1. Authorize Market Data Feed (v3)
        const authRes = await axios.get("https://api.upstox.com/v3/feed/market-data-feed/authorize", {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        const wsUrl = authRes.data.data.authorized_redirect_uri;
        console.log("[Upstox v3] Authorized WS URL obtained");
        socket = new WebSocket(wsUrl, { followRedirects: true });

        socket.on("open", () => {
            console.log("Upstox v3 WebSocket connected");
            if (io) io.emit("connection_status", { connected: true });
            
            // Re-subscribe if we have active symbols
            // (The gateway handles this via 'subscribe' messages usually)
        });

        socket.on("message", (data) => {
            try {
                // Ignore non-binary messages (like 'ready')
                if (typeof data === 'string') return;

                const decoded = protoType.decode(data);
                const result = protoType.toObject(decoded, { longs: String, enums: String, bytes: String });
                
                if (!result.data) return;

                const ticks = Object.entries(result.data).map(([symbol, detail]) => {
                    const greeks = detail.option_greeks || detail.optionGreeks || {};
                    const details = detail.full_details || detail.marketFullDetails || detail.extended_feed || detail.extendedFeed || {};
                    const ltp = detail.ltpc?.last_price || details.last_price || 0;
                    
                    const ivRaw = (greeks.iv !== undefined) ? greeks.iv : 0;
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
                console.error("Upstox Protobuf Decode Error:", err.message);
            }
        });

        socket.on("error", (err) => console.error("Upstox v3 WS Error:", err));
        socket.on("close", () => {
            console.log("Upstox v3 WS Closed");
            if (io) io.emit("connection_status", { connected: false });
        });

    } catch (err) {
        const errData = err.response?.data;
        console.error("Upstox v3 WS Init Error:", errData || err.message);
        
        // Auto-clear invalid/expired tokens to prevent phantom authentication loops
        if (err.response?.status === 401 || errData?.errors?.[0]?.errorCode === 'UDAPI100050') {
            console.log("[Upstox] Token expired or invalid. Auto-clearing session.");
            tokenStore.clear();
            if (io) io.emit("auth_error", { message: "Session expired. Please login again." });
            if (io) io.emit("connection_status", { connected: false });
        }
    }
};

const subscribeSymbols = async (symbols) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const { FeedRequest: RequestProto } = await loadProto();
        
        // Map common keys to Upstox specific instrument keys
        const symbolMap = {
            "NSE:NIFTY50-INDEX": "NSE_INDEX|Nifty 50",
            "NSE:NIFTYBANK-INDEX": "NSE_INDEX|Nifty Bank",
            "NSE:FINNIFTY-INDEX": "NSE_INDEX|Nifty Fin Service",
            "BSE:SENSEX-INDEX": "BSE_INDEX|SENSEX"
        };
        const mappedSymbols = symbols.map(s => symbolMap[s] || s);

        const payload = {
            guid: "guid_" + Date.now(),
            method: "sub",
            data: { mode: "full", instrumentKeys: mappedSymbols }
        };

        // v3 requires BINARY FeedRequest
        const errMsg = RequestProto.verify(payload);
        if (errMsg) throw Error(errMsg);

        const buffer = RequestProto.encode(RequestProto.create(payload)).finish();
        socket.send(buffer);
        console.log(`[Upstox v3] Sent binary subscription for ${mappedSymbols.length} symbols`);
    }
};

const unsubscribeSymbols = async (symbols) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const { FeedRequest: RequestProto } = await loadProto();
        
        const payload = {
            guid: "guid_" + Date.now(),
            method: "unsub",
            data: { mode: "full", instrumentKeys: symbols }
        };

        const buffer = RequestProto.encode(RequestProto.create(payload)).finish();
        socket.send(buffer);
    }
};

module.exports = {
    initWebSocket,
    subscribeSymbols,
    unsubscribeSymbols
};
