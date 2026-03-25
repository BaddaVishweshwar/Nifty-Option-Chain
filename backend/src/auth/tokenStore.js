const db = require('../oi/db');

const getAccessToken = () => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('access_token');
  return row ? row.value : null;
};

const setAccessToken = (token) => {
  if (!token) {
    console.error("Attempted to save empty/undefined token!");
    return;
  }
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('access_token', token);
};

module.exports = {
  getAccessToken,
  setAccessToken
};
