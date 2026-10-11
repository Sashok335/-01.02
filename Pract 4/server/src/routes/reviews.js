const router = require('express').Router();
const ctrl = require('../controllers/reviews');
const { requireAuth, requireRole } = require('../middleware/auth');

const admin = [requireAuth, requireRole('admin')];

// Список и удаление отзывов — только для администратора.
router.get('/',     ...admin, ctrl.listAll);
router.delete('/:id', ...admin, ctrl.remove);

module.exports = router;
