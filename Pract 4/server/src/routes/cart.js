const router = require('express').Router();
const ctrl = require('../controllers/cart');
const { requireAuth } = require('../middleware/auth');

// Корзина хранится на сервере и доступна только вошедшему пользователю.
router.get('/',               requireAuth, ctrl.list);
router.post('/',              requireAuth, ctrl.add);
router.patch('/:productId',   requireAuth, ctrl.setQuantity);
router.delete('/:productId',  requireAuth, ctrl.removeItem);
router.delete('/',            requireAuth, ctrl.clear);

module.exports = router;
