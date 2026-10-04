require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ПОРЯДОК middleware важен и не переставляется.

// 1. Чтение JSON из тела запроса. Без него req.body пустой.
// 2. CORS: фронт на 5173, сервер на 3001 — это разные источники,
//    браузер блокирует такие запросы без разрешения.
app.use(express.json());
app.use(cors());

// 3. Все маршруты под префиксом /api.
app.use('/api', routes);

// 4. Обработчик несуществующих адресов. Без него Express отвечает HTML
//    «Cannot GET /api/typo», и фронт не сможет прочитать error.
app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
});

// 5. Обработчик ошибок ВСЕГДА последний: до него доходит то, что
//    не обработали предыдущие слои.
app.use(errorHandler);

module.exports = app;
