const router = require('express').Router();
const ctrl = require('../controllers/auth');
const { requireAuth } = require('../middleware/auth');

router.post('/login',    ctrl.login);
router.post('/register', ctrl.register);
router.get('/me',        requireAuth, ctrl.me);
router.patch('/me',      requireAuth, ctrl.updateMe);

module.exports = router;
