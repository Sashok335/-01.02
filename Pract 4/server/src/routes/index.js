const router = require('express').Router();
const pool = require('../db/pool');

const categories = require('./categories');
const products = require('./products');
const auth = require('./auth');
const purchases = require('./purchases');
const cart = require('./cart');
const orders = require('./orders');
const reviews = require('./reviews');
const coupons = require('./coupons');
const users = require('./users');
const addresses = require('./addresses');

// Проверка доступности сервера и базы.
router.get('/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.use('/categories', categories);
router.use('/products',   products);
router.use('/auth',       auth);
router.use('/purchases',  purchases);
router.use('/cart',       cart);
router.use('/orders',     orders);
router.use('/reviews',    reviews);
router.use('/coupons',    coupons);
router.use('/users',      users);
router.use('/addresses',  addresses);

module.exports = router;
