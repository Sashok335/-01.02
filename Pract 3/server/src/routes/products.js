const router = require('express').Router();
const ctrl = require('../controllers/products');
const { requireAuth, requireRole } = require('../middleware/auth');

const admin = [requireAuth, requireRole('admin')];

router.get('/admin/all', ...admin, ctrl.listAll);
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getOne);

router.post('/',            ...admin, ctrl.create);
router.patch('/:id',        ...admin, ctrl.update);
router.delete('/:id',       ...admin, ctrl.remove);

module.exports = router;
