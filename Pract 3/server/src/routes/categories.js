const router = require('express').Router();
const ctrl = require('../controllers/categories');
const { requireAuth, requireRole } = require('../middleware/auth');

const canManageGoods = [requireAuth, requireRole('canManageGoods')];

router.get('/admin/all', ...canManageGoods, ctrl.listAll);
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getOne);

// Управление каталогом — только с правом canManageGoods
// (админ и менеджер; у покупателя этого флага нет).
router.post('/',            ...canManageGoods, ctrl.create);
router.patch('/:id',        ...canManageGoods, ctrl.update);
router.delete('/:id',       ...canManageGoods, ctrl.remove);

module.exports = router;
