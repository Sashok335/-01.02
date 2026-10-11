const router = require('express').Router();
const ctrl = require('../controllers/orders');
const { requireAuth, requireRole } = require('../middleware/auth');

const admin = [requireAuth, requireRole('admin')];

// Заказы доступны только администратору.
router.get('/',             ...admin, ctrl.listAll);
router.patch('/:id/status', ...admin, ctrl.updateStatus);

module.exports = router;
