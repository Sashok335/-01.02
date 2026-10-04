require('dotenv').config();
const app = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`[server] запущен на http://localhost:${PORT}`);
  console.log('[server] проверка:');
  console.log(`  GET http://localhost:${PORT}/api/health`);
  console.log(`  GET http://localhost:${PORT}/api/products`);
});

// Аккуратно гасим сервер: сначала перестаём принимать запросы,
// потом закрываем пул, иначе процесс зависнет на открытых соединениях.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n[server] получен ${signal}, останавливаюсь`);
    server.close(async () => {
      await pool.end();
      console.log('[server] соединения с БД закрыты');
      process.exit(0);
    });
  });
}
