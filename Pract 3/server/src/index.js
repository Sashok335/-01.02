require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const pool = require('./db/pool');

const app = express();

app.use(express.json());
app.use(cors());
app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`[server] запущен на http://localhost:${PORT}`);
  console.log('[server] проверка:');
  console.log(`  GET http://localhost:${PORT}/api/products`);
});

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
