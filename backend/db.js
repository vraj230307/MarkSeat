const Database = require('better-sqlite3');
const db = new Database(process.env.DB_FILE || 'tickets.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  verified INTEGER NOT NULL DEFAULT 0,
  otp_hash TEXT,
  otp_expires_at INTEGER,
  otp_sent_at INTEGER,
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  jti TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  queue_state TEXT NOT NULL DEFAULT 'open' CHECK (queue_state IN ('open','drawn')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','held','booked')),
  held_by INTEGER REFERENCES users(id),
  hold_expires_at INTEGER,
  booking_id INTEGER,
  UNIQUE (event_id, label)
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  position INTEGER,                         -- NULL until the draw
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','admitted','done','expired')),
  joined_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  admitted_at INTEGER,
  admission_expires_at INTEGER,
  UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  seat_count INTEGER NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','cancelled')),
  expires_at INTEGER NOT NULL,
  payment_ref TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  seat_id INTEGER NOT NULL UNIQUE REFERENCES seats(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid',      -- valid | revoked | used (Member 4 / gate)
  version INTEGER NOT NULL DEFAULT 1,
  signature TEXT,                            -- filled by Member 4's crypto layer
  issued_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Append-only; Member 4 fills prev_hash/hash to build the chain.
CREATE TABLE IF NOT EXISTS booking_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  event_type TEXT NOT NULL,
  user_id INTEGER, event_id INTEGER, seat_id INTEGER, booking_id INTEGER,
  payload TEXT,
  prev_hash TEXT,
  hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_seats_event ON seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_seats_booking ON seats(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pending ON bookings(status, expires_at);
`);

const now = () => Math.floor(Date.now() / 1000);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function logEvent(type, { userId, eventId, seatId, bookingId, payload } = {}) {
  return db.prepare(
    `INSERT INTO booking_log (event_type,user_id,event_id,seat_id,booking_id,payload)
     VALUES (?,?,?,?,?,?)`
  ).run(type, userId ?? null, eventId ?? null, seatId ?? null, bookingId ?? null,
        payload ? JSON.stringify(payload) : null);
}

module.exports = { db, logEvent, now, HttpError };
