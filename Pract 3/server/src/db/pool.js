const { Pool } = require('pg');
require('dotenv').config();

// Один пул на всё приложение. Создаётся один раз при загрузке модуля —
// НИКОГДА не вызывай new Pool() внутри обработчика запроса.
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('connect', () => console.log('[db] подключение к PostgreSQL установлено'));
pool.on('error',   (err) => console.error('[db] ошибка соединения:', err.message));

module.exports = pool;
