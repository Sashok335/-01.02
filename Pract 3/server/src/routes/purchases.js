const router = require('express').Router();
const ctrl = require('../controllers/purchases');
const { requireAuth } = require('../middleware/auth');

router.get('/',   requireAuth, ctrl.history);
router.post('/',  requireAuth, ctrl.checkout);

module.exports = router;
