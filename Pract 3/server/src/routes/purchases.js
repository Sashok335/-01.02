const router = require('express').Router();
const ctrl = require('../controllers/purchases');
const { requireAuth, requireRole } = require('../middleware/auth');

// И история, и оформление — только для вошедшего, и только если роль
// позволяет заказывать (can_order). У гостя флага нет.
const buyer = [requireAuth, requireRole('canOrder')];

router.get('/',   ...buyer, ctrl.history);
router.post('/',  ...buyer, ctrl.checkout);

module.exports = router;
