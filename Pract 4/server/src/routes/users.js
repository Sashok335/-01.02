const router = require('express').Router();
const ctrl = require('../controllers/users');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('admin'), ctrl.list);

module.exports = router;
