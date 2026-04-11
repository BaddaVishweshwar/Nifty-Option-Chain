const sqlite3 = require('better-sqlite3');
const axios = require('axios');

const db = new sqlite3('./src/oi/data.db');
const row = db.prepare('SELECT value FROM config WHERE key = ?').get('access_token');
const token = row ? row.value : null;

if (!token) {
    console.error("No token found");
    process.exit(1);
}

const url = 'https://api.upstox.com/v2/option/contract?instrument_key=NSE_INDEX%7CNifty%20Bank';
axios.get(url, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
}).then(res => {
    console.log("Option Contracts Response:");
    console.log(JSON.stringify(res.data.data.slice(0, 2), null, 2));
}).catch(err => {
    console.error("Error:", err.response?.data || err.message);
});
