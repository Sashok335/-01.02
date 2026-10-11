const router = require('express').Router();
const ctrl = require('../controllers/coupons');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/mine', requireAuth, ctrl.mine);

const admin = [requireAuth, requireRole('admin')];

router.get('/',      ...admin, ctrl.list);
router.post('/',     ...admin, ctrl.create);
router.patch('/:id', ...admin, ctrl.update);
router.delete('/:id', ...admin, ctrl.remove);

module.exports = router;
