const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'energy.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,              -- null for Google-only accounts
  google_id     TEXT UNIQUE,
  full_name     TEXT,
  phone         TEXT,
  country       TEXT,
  currency      TEXT DEFAULT 'EUR',
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  residents   INTEGER DEFAULT 1,
  devices     TEXT,                -- e.g. "fridge, A/C x2, water heater"
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  period_type  TEXT NOT NULL CHECK (period_type IN ('range','month','year')),
  start_date   TEXT NOT NULL,      -- YYYY-MM-DD
  end_date     TEXT NOT NULL,      -- YYYY-MM-DD
  kwh          REAL NOT NULL CHECK (kwh >= 0),
  amount_paid  REAL NOT NULL CHECK (amount_paid >= 0),
  notes        TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;
