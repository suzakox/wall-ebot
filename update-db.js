const db = require('./database/db');

db.run(`
    ALTER TABLE boss_logs
    ADD COLUMN alert_sent INTEGER DEFAULT 0
`, (err) => {

    if (err) {
        console.log('Coluna já existe.');
    } else {
        console.log('✅ Coluna alert_sent adicionada.');
    }

});