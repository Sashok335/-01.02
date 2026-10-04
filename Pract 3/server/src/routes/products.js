const router = require('express').Router();
const ctrl = require('../controllers/products');
const { requireAuth, requireRole } = require('../middleware/auth');

const canManageGoods = [requireAuth, requireRole('canManageGoods')];

router.get('/admin/all', ...canManageGoods, ctrl.listAll);
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getOne);

router.post('/',            ...canManageGoods, ctrl.create);
router.patch('/:id',        ...canManageGoods, ctrl.update);
router.delete('/:id',       ...canManageGoods, ctrl.remove);

module.exports = router;
