const Database = require('better-sqlite3');

const db = new Database('./database/tod.db');

console.log('📦 Banco SQLite conectado.');

db.prepare(`
    CREATE TABLE IF NOT EXISTS boss_logs (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        boss_name TEXT,
        kill_type TEXT,
        drop_status TEXT,

        tod TEXT,
        earliest TEXT,
        latest TEXT,

        alert_sent INTEGER DEFAULT 0

    )
`).run();

module.exports = db;