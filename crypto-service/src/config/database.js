const Database = require('better-sqlite3');
const config = require('./env');

const db = new Database(config.DB_PATH);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  // Tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      event_name TEXT NOT NULL,
      section TEXT NOT NULL,
      row TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      buyer_identity_hash TEXT NOT NULL,
      totp_secret TEXT NOT NULL,
      jwt_token TEXT NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      issued_at TEXT NOT NULL,
      revoked_at TEXT
    );
  `);

  // Tamper-evident Audit Hash Chain table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_hash_chain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_index INTEGER NOT NULL UNIQUE,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      details TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      current_hash TEXT NOT NULL
    );
  `);

  console.log(`[Database Init] SQLite database initialized at ${config.DB_PATH}`);
}

initDatabase();

module.exports = db;
