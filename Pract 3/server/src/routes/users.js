const router = require('express').Router();
const ctrl = require('../controllers/users');
const { requireAuth, requireRole } = require('../middleware/auth');

// Список людей видит только тот, кто управляет товарами: это внутренний
// список для админских форм, а не публичные данные магазина.
router.get('/', requireAuth, requireRole('canManageUsers'), ctrl.list);

module.exports = router;
