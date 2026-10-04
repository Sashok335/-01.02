// Проверка связи с базой до написания сервера.
// node src/db/check.js
const pool = require('./pool');

pool.query('SELECT NOW() AS now', (err, res) => {
  if (err) {
    console.error('НЕ РАБОТАЕТ:', err.message);
    process.exit(1);
  }
  console.log('РАБОТАЕТ, время БД:', res.rows[0].now);
  pool.end();
});
