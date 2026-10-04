const router = require('express').Router();
const ctrl = require('../controllers/coupons');
const { requireAuth, requireRole } = require('../middleware/auth');

// /mine — персональные купоны покупателя. Идёт ПЕРВЫМ: иначе строка
// '/mine' была бы разобрана как id в '/:id'.
router.get('/mine', requireAuth, ctrl.mine);

const canManageGoods = [requireAuth, requireRole('canManageGoods')];

router.get('/',      ...canManageGoods, ctrl.list);
router.post('/',     ...canManageGoods, ctrl.create);
router.patch('/:id', ...canManageGoods, ctrl.update);
router.delete('/:id', ...canManageGoods, ctrl.remove);

module.exports = router;
