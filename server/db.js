const Database = require('better-sqlite3');
const db = new Database('crash.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 10000,
    reset_token TEXT,
    reset_token_expires TEXT
  );

  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    round_id TEXT NOT NULL,
    amount REAL NOT NULL,
    cashout_multiplier REAL,
    payout REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;