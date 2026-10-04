const router = require('express').Router();
const pool = require('../db/pool');

const health = require('express').Router();
const categories = require('./categories');
const products = require('./products');
const auth = require('./auth');
const purchases = require('./purchases');
const coupons = require('./coupons');
const users = require('./users');
const addresses = require('./addresses');

// Без этого префикса адреса были бы /products, а не /api/products —
// и фронт ловил бы 404 на каждом запросе.
router.use('/categories', categories);
router.use('/products',   products);
router.use('/auth',       auth);
router.use('/purchases',  purchases);
router.use('/coupons',    coupons);
router.use('/users',      users);
router.use('/addresses',  addresses);

// Проверка живости сервера + живости базы. Фронт дергает это перед
// показом страницы: если БД недоступна, честнее сказать об этом сразу.
router.get('/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now');
    res.json({ status: 'ok', database: 'up', time: rows[0].now });
  } catch (e) {
    res.status(503).json({ status: 'degraded', database: 'down', error: e.message });
  }
});

module.exports = router;
