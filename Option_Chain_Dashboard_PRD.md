# Option Chain Live Dashboard — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** March 2026  
**Status:** Ready for Development

---

## 1. Executive Summary

This document defines the requirements for a real-time Option Chain Dashboard that streams live derivatives data (NSE/BSE options) using a free broker API (Fyers or Upstox), displays a professional-grade options chain UI, and supports key analytical overlays like OI, PCR, IV, and Greeks. The system must handle WebSocket-based data streaming, token-authenticated API sessions, and a React-based frontend with sub-second visual updates.

---

## 2. Goals and Non-Goals

### Goals
- Authenticate with a free broker API (Fyers or Upstox) using OAuth2
- Stream live option chain data via WebSocket for NIFTY, BANKNIFTY, FINNIFTY, SENSEX
- Display strike-wise CE/PE data: LTP, OI, Volume, IV, Greeks (Delta, Gamma, Theta, Vega)
- Show real-time PCR (Put-Call Ratio), Max Pain, and OI change heatmaps
- Support expiry switching and underlying symbol selection
- Store session state, snapshots, and OI history in a lightweight backend

### Non-Goals
- Order placement or trading execution
- Historical backtesting engine
- Multi-user authentication (single-user or small team use)
- Paid API tiers or third-party data vendors

---

## 3. Broker API Selection

### Recommended: Fyers API v3 (Free Tier)

| Feature | Fyers | Upstox |
|---|---|---|
| Free API access | Yes (Demat required) | Yes (Demat required) |
| WebSocket streaming | Yes (FyersSocket v3) | Yes (MarketDataStreamer) |
| Option Chain endpoint | Yes (`/data/quotes`) | Yes (`/market-quote/ltp`) |
| Rate limit (free) | 10 req/s REST, unlimited WS | 25 req/s REST, unlimited WS |
| Documentation quality | Good | Excellent |
| SDK availability | Python, Node.js | Python, Node.js, Java |

**Decision: Use Fyers API v3** as primary. Upstox as fallback. Both are free with a Demat account.

### Fyers Free API Key Registration
1. Open Demat account at fyers.in
2. Visit `myapi.fyers.in` → Create App → get `client_id` and `secret_key`
3. Complete daily OAuth2 token refresh (mandatory for live data)

---

## 4. System Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                        USER BROWSER                           │
│   React Dashboard ←── WebSocket ──→ Backend WS Gateway        │
└────────────────────────────┬──────────────────────────────────┘
                             │ HTTP + WS
┌────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Node.js / FastAPI)               │
│  Auth Service | WS Proxy | Data Aggregator | Snapshot Store   │
└────────────────────────────┬──────────────────────────────────┘
                             │ OAuth2 + WebSocket
┌────────────────────────────▼──────────────────────────────────┐
│                   BROKER API (Fyers v3)                       │
│   REST: Option Chain, Quote Snapshot, OI, Expiry List         │
│   WebSocket: Real-time tick stream (LTP, OI, Volume, etc.)    │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### Backend

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 LTS | Primary backend runtime |
| Framework | Express.js + Socket.io | REST API + client WebSocket relay |
| Broker WS Client | `fyers-api-v3` npm package | Consume Fyers market data stream |
| Auth | Fyers OAuth2 + daily token cron | Session token management |
| Database | SQLite (better-sqlite3) | OI history, session snapshots, strike cache |
| Cache | Node.js in-memory Map | LTP / tick data (< 1s latency) |
| Job Scheduler | node-cron | Token refresh at 8:30 AM IST daily |
| Environment | dotenv | Secrets management |

**Alternative backend (Python):** FastAPI + `fyers-apiv3` pip package + `python-socketio`. Use if you prefer Python.

### Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + Vite | Fast builds, HMR dev experience |
| Language | TypeScript | Type safety for option data structures |
| State Management | Zustand | Lightweight, reactive store for ticks |
| WebSocket client | socket.io-client | Real-time tick subscription |
| Styling | Tailwind CSS v4 | Utility-first, dark mode support |
| Charts | Recharts or ApexCharts | OI bar charts, PCR gauge, IV curve |
| Table | TanStack Table v8 | Virtualized option chain table |
| Build Tool | Vite 5 | Fast dev server and production bundler |

### Infrastructure (local/self-hosted)

| Layer | Technology |
|---|---|
| Hosting | Local machine or VPS (Ubuntu 22.04) |
| Reverse Proxy | Nginx (if deployed) |
| Process Manager | PM2 |
| Environment | Node.js + Docker optional |

---

## 6. Authentication Flow

### Fyers OAuth2 Daily Flow

```
Day Start (8:30 AM IST)
       │
       ▼
Generate Auth URL → Open in browser manually
       │
       ▼
User logs in → Fyers redirects to redirect_uri with auth_code
       │
       ▼
Backend POST /api/auth/callback with auth_code
       │
       ▼
Exchange auth_code → access_token (valid 24 hrs)
       │
       ▼
Store access_token in SQLite + env
       │
       ▼
All Fyers API calls use Bearer token
```

**Token Refresh:** Fyers tokens expire daily. A node-cron job runs at 8:30 AM IST to alert the developer to re-authenticate. Automate with a headless Playwright script if desired.

### Environment Variables (.env)

```env
FYERS_CLIENT_ID=XXXX-100
FYERS_SECRET_KEY=your_secret
FYERS_REDIRECT_URI=http://localhost:3001/api/auth/callback
ACCESS_TOKEN=           # populated after daily login
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## 7. Backend — Detailed Module Design

### 7.1 Auth Module (`/src/auth/`)

**Files:**
- `authController.js` — generates auth URL, handles callback, stores token
- `tokenStore.js` — reads/writes access token from SQLite

**Endpoints:**
```
GET  /api/auth/login     → returns Fyers auth URL (open in browser)
GET  /api/auth/callback  → receives auth_code, exchanges for token
GET  /api/auth/status    → returns { authenticated: true/false, expiry }
```

### 7.2 Market Data Module (`/src/market/`)

**Files:**
- `fyersClient.js` — initializes Fyers SDK with token
- `optionChainService.js` — fetches option chain snapshot via REST
- `websocketManager.js` — manages Fyers WebSocket subscription
- `tickStore.js` — in-memory Map of symbol → latest tick

**Fyers Option Chain REST Call:**
```javascript
// GET full option chain for NIFTY nearest expiry
const response = await fyersClient.getOptionChain({
  symbol: "NSE:NIFTY50-INDEX",
  strikecount: 10,    // 10 strikes each side of ATM
  timestamp: ""
});
```

**WebSocket Subscription Logic:**
```javascript
// Subscribe to all strike symbols for CE + PE
const symbols = optionChain.map(strike => [
  `NSE:NIFTY${expiry}${strike}CE`,
  `NSE:NIFTY${expiry}${strike}PE`
]).flat();

fyersSocket.subscribe(symbols);
fyersSocket.on("message", (ticks) => {
  ticks.forEach(tick => tickStore.set(tick.symbol, tick));
  io.emit("tick_update", ticks);  // relay to React clients
});
```

### 7.3 OI History Module (`/src/oi/`)

**Stores OI snapshots every 1 minute to SQLite:**
```sql
CREATE TABLE oi_snapshots (
  id INTEGER PRIMARY KEY,
  symbol TEXT,
  expiry TEXT,
  strike INTEGER,
  option_type TEXT,
  oi INTEGER,
  oi_change INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Powers OI Build-up chart, OI unwinding detection, and historical OI heatmaps.

### 7.4 Socket.io Gateway (`/src/gateway/`)

**Namespace:** `io` (default)

**Events emitted to client:**

| Event | Payload | Frequency |
|---|---|---|
| `tick_update` | `{ symbol, ltp, oi, volume, iv, delta }[]` | On every Fyers WS tick |
| `chain_snapshot` | Full option chain object | On symbol/expiry change |
| `pcr_update` | `{ pcr, totalCEOI, totalPEOI }` | Every 5 seconds |
| `max_pain_update` | `{ maxPainStrike }` | Every 30 seconds |
| `connection_status` | `{ connected: boolean }` | On WS connect/disconnect |

**Events received from client:**

| Event | Payload | Action |
|---|---|---|
| `subscribe` | `{ symbol, expiry }` | Re-subscribe WS to new strikes |
| `request_snapshot` | `{ symbol, expiry }` | Fetch fresh REST snapshot |

### 7.5 REST API Endpoints

```
GET  /api/symbols           → list of supported underlyings (NIFTY, BANKNIFTY, etc.)
GET  /api/expiries/:symbol  → list of available expiry dates
GET  /api/chain/:symbol/:expiry  → full option chain snapshot
GET  /api/oi-history/:symbol/:expiry/:strike  → historical OI for a strike
GET  /api/pcr/:symbol/:expiry   → current PCR value
GET  /api/max-pain/:symbol/:expiry → computed max pain strike
```

---

## 8. Frontend — Detailed Component Design

### 8.1 App Layout

```
┌────────────────────────────────────────────────────────────────┐
│  TOPBAR: Logo | Symbol Selector | Expiry Selector | Spot Price │
│          | Connection Status | Theme Toggle                    │
├──────────────┬──────────────────────────────────────────────── │
│  SIDEBAR     │  MAIN CONTENT AREA                              │
│  (optional)  │  ┌─────────────────────────────────────────┐   │
│              │  │  STATS ROW: PCR | Max Pain | ATM Strike  │   │
│              │  │             | IV Percentile | OI Change  │   │
│              │  ├─────────────────────────────────────────┤   │
│              │  │  OPTION CHAIN TABLE (main)              │   │
│              │  │  CE side | Strike | PE side              │   │
│              │  ├─────────────────────────────────────────┤   │
│              │  │  OI BAR CHART | PCR GAUGE | IV SKEW     │   │
│              │  └─────────────────────────────────────────┘   │
└──────────────┴─────────────────────────────────────────────────┘
```

### 8.2 Option Chain Table

**This is the core UI component.**

Columns (CE side, left to right):

| OI Chg | OI | Volume | IV | Delta | LTP | **STRIKE** | LTP | Delta | IV | Volume | OI | OI Chg |

**Table behavior:**
- ATM strike row highlighted in amber/yellow
- ITM strikes: light green background (CE side) / light red (PE side)
- OTM strikes: default background
- OI bar within each cell: colored bar proportional to max OI in chain (like Sensibull)
- LTP flashes green on uptick, red on downtick
- Entire row updates in < 500ms on tick arrival
- Sticky header, virtualized rows (TanStack Virtual for performance)

**TypeScript types:**
```typescript
interface OptionStrike {
  strike: number;
  ce: OptionLeg;
  pe: OptionLeg;
}

interface OptionLeg {
  symbol: string;
  ltp: number;
  prevLtp: number;   // for flash color
  oi: number;
  oiChange: number;
  volume: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  bidQty: number;
  askQty: number;
  bid: number;
  ask: number;
}
```

### 8.3 Stats Row (Top Cards)

| Card | Value | Update Frequency |
|---|---|---|
| Spot Price | Current index LTP | Every tick |
| PCR (OI) | Total PE OI / Total CE OI | Every 5s |
| Max Pain | Strike with max expiry loss | Every 30s |
| ATM Strike | Nearest to spot | Real-time |
| Total CE OI | Sum across all strikes | Every 5s |
| Total PE OI | Sum across all strikes | Every 5s |
| IV Rank | Current IV vs 52-week (if available) | On snapshot |

### 8.4 Charts Section

**OI Bar Chart (Recharts/ApexCharts):**
- X-axis: strike prices
- Two bar series: CE OI (red) + PE OI (blue)
- Overlay line: spot price marker
- Click on bar → scroll chain table to that strike

**PCR Gauge:**
- Semicircle gauge from 0 to 3
- Zones: Bearish (0–0.7), Neutral (0.7–1.3), Bullish (1.3+)
- Animated needle

**IV Skew Chart:**
- Line chart: CE IV vs PE IV across strikes
- Helps visualize skew and smile

### 8.5 Zustand Store Design

```typescript
interface OptionChainStore {
  // Config
  selectedSymbol: string;
  selectedExpiry: string;
  
  // Data
  chain: OptionStrike[];
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPain: number;
  
  // Connection
  connected: boolean;
  lastUpdate: Date | null;
  
  // Actions
  setSymbol: (symbol: string) => void;
  setExpiry: (expiry: string) => void;
  applyTick: (ticks: TickUpdate[]) => void;
  setChainSnapshot: (chain: OptionChain) => void;
}
```

### 8.6 WebSocket Hook

```typescript
// hooks/useMarketSocket.ts
export function useMarketSocket() {
  const socket = useRef<Socket>();
  const applyTick = useOptionChainStore(s => s.applyTick);

  useEffect(() => {
    socket.current = io(BACKEND_URL);
    
    socket.current.on("tick_update", (ticks: TickUpdate[]) => {
      applyTick(ticks);  // Zustand batch update
    });

    socket.current.on("pcr_update", ({ pcr }) => {
      useOptionChainStore.getState().setPCR(pcr);
    });

    return () => socket.current?.disconnect();
  }, []);
}
```

---

## 9. Data Flow — End to End

```
Fyers WebSocket
  ↓ (tick per symbol ~every 200ms)
Backend tickStore (in-memory Map, O(1) update)
  ↓ (batched every 100ms)
Socket.io broadcast to all connected React clients
  ↓
React applyTick() in Zustand
  ↓ (structural sharing, only changed rows re-render)
TanStack Table rows re-render (flash animation on LTP change)
  ↓
User sees update in < 300ms total latency
```

---

## 10. Performance Requirements

| Metric | Target |
|---|---|
| Tick-to-UI latency | < 500ms end-to-end |
| Table render time | < 16ms per frame (60fps) |
| Symbols subscribed simultaneously | Up to 200 (20 strikes × 2 × 5 underlyings) |
| Snapshot load time | < 2 seconds |
| Memory usage (backend) | < 200MB |
| CPU usage (backend idle) | < 5% |
| Browser memory | < 150MB |

---

## 11. Error Handling and Resilience

| Scenario | Handling Strategy |
|---|---|
| Fyers token expired | Show banner "Re-authenticate". Block data fetch. |
| WebSocket disconnected | Auto-reconnect with exponential backoff (1s → 2s → 4s → max 30s) |
| REST API 429 (rate limit) | Queue + retry with 1s delay |
| Market closed (no ticks) | Show "Market Closed" badge, serve last snapshot |
| Browser tab inactive | Pause animation, keep socket alive |
| Network drop | Show connection status in topbar, reconnect on restore |

---

## 12. Project Folder Structure

```
option-chain-dashboard/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── authController.js
│   │   │   └── tokenStore.js
│   │   ├── market/
│   │   │   ├── fyersClient.js
│   │   │   ├── optionChainService.js
│   │   │   ├── websocketManager.js
│   │   │   └── tickStore.js
│   │   ├── oi/
│   │   │   ├── oiSnapshotService.js
│   │   │   └── db.js (SQLite)
│   │   ├── gateway/
│   │   │   └── socketGateway.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── marketRoutes.js
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar/
│   │   │   ├── StatsRow/
│   │   │   ├── OptionChainTable/
│   │   │   │   ├── OptionChainTable.tsx
│   │   │   │   ├── StrikeRow.tsx
│   │   │   │   ├── OIBar.tsx
│   │   │   │   └── LTPCell.tsx
│   │   │   └── Charts/
│   │   │       ├── OIBarChart.tsx
│   │   │       ├── PCRGauge.tsx
│   │   │       └── IVSkewChart.tsx
│   │   ├── hooks/
│   │   │   ├── useMarketSocket.ts
│   │   │   └── useOptionChain.ts
│   │   ├── store/
│   │   │   └── optionChainStore.ts
│   │   ├── types/
│   │   │   └── optionChain.ts
│   │   ├── utils/
│   │   │   ├── computePCR.ts
│   │   │   ├── computeMaxPain.ts
│   │   │   └── formatters.ts
│   │   └── App.tsx
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
└── README.md
```

---

## 13. Key Calculations (Frontend Utils)

### PCR (Put-Call Ratio)
```typescript
const pcr = totalPEOI / totalCEOI;
// > 1.2 → bullish sentiment, < 0.8 → bearish
```

### Max Pain Strike
```typescript
// For each strike S, compute total loss if market expires at S:
// Loss = Σ(CE strikes < S) × (S - ceStrike) × OI
//      + Σ(PE strikes > S) × (peStrike - S) × OI
// Max Pain = strike with minimum total loss
```

### ATM Strike
```typescript
const atm = strikes.reduce((prev, curr) =>
  Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
);
```

### OI Change Color
```typescript
const oiChangeColor = oiChange > 0 ? "text-green-400" : "text-red-400";
```

---

## 14. Security Considerations

- Fyers `client_id` and `secret_key` must stay on backend only — never expose to frontend
- Access token stored only in backend SQLite + env, never sent to browser
- Socket.io connection from localhost or trusted origin only
- CORS restricted to frontend URL
- No user data collection; single-operator tool

---

## 15. Development Phases

### Phase 1 — Backend Core (Week 1)
- Fyers API registration and OAuth2 flow
- Token storage, daily refresh cron
- REST endpoints: symbols, expiries, option chain snapshot
- SQLite setup for OI snapshots

### Phase 2 — WebSocket Streaming (Week 2)
- Fyers WebSocket integration
- Tick normalization and in-memory store
- Socket.io gateway to relay ticks to clients
- PCR and max pain computation loop

### Phase 3 — Frontend Core (Week 3)
- React + Vite + Tailwind setup
- Zustand store + socket hook
- Option chain table with TanStack Table
- LTP flash animation, ITM/OTM coloring
- Stats row (PCR, max pain, spot)

### Phase 4 — Charts and Polish (Week 4)
- OI bar chart, PCR gauge, IV skew chart
- Symbol + expiry selector
- Dark mode
- Error banners, connection status
- Performance testing and optimization

---

## 16. Dependencies Summary

### Backend
```json
{
  "fyers-apiv3": "^1.x",
  "express": "^4.x",
  "socket.io": "^4.x",
  "better-sqlite3": "^9.x",
  "node-cron": "^3.x",
  "dotenv": "^16.x",
  "cors": "^2.x",
  "axios": "^1.x"
}
```

### Frontend
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "zustand": "^4.x",
  "socket.io-client": "^4.x",
  "@tanstack/react-table": "^8.x",
  "@tanstack/react-virtual": "^3.x",
  "recharts": "^2.x",
  "tailwindcss": "^4.x",
  "framer-motion": "^11.x"
}
```

---

## 17. Appendix — Fyers API Reference

### Get Option Chain (REST)
```
GET https://api-t1.fyers.in/data/options-chain?symbol=NSE:NIFTY50-INDEX&strikecount=10&timestamp=
Authorization: Bearer {access_token}
```

### WebSocket Subscription (FyersSocket v3)
```javascript
import { fyersSocketv3 } from "fyers-apiv3";
const socket = fyersSocketv3.getInstance();
socket.setAccessToken(token);
socket.symbol(["NSE:NIFTY2560024700CE", "NSE:NIFTY2560024700PE"]);
socket.connect();
socket.on("message", (msg) => console.log(msg));
```

### Tick Message Shape
```json
{
  "symbol": "NSE:NIFTY2560024700CE",
  "ltp": 142.50,
  "open": 130.00,
  "high": 155.00,
  "low": 118.00,
  "close": 138.00,
  "volume": 12340,
  "oi": 89045,
  "timestamp": 1711276800
}
```

---

*End of PRD — Version 1.0*
