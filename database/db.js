const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database/tod.db', (err) => {

    if (err) {
        console.error(err.message);
    } else {
        console.log('📦 Banco SQLite conectado.');
    }

});

db.serialize(() => {

    db.run(`
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
    `);

});

module.exports = db;