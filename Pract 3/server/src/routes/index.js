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

router.use('/categories', categories);
router.use('/products',   products);
router.use('/auth',       auth);
router.use('/purchases',  purchases);
router.use('/coupons',    coupons);
router.use('/users',      users);
router.use('/addresses',  addresses);

module.exports = router;
