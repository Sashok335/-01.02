const model = require('../models/addresses');
const { httpError } = require('../utils/httpError');

async function list(req, res) {
  res.json(await model.listForUser(req.user.id));
}

async function create(req, res) {
  const body = req.body ?? {};
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const details = {};

  if (label.length > 50) details.label = 'Название — не более 50 символов';
  if (address.length < 3 || address.length > 300) {
    details.address = 'Адрес должен содержать от 3 до 300 символов';
  }
  if (Object.keys(details).length) {
    throw httpError(400, 'Проверьте адрес', details);
  }

  res.status(201).json(await model.createForUser(req.user.id, {
    label: label || 'Другой адрес',
    address,
  }));
}

async function remove(req, res) {
  const addressId = Number(req.params.id);
  if (!Number.isInteger(addressId) || addressId < 1) {
    throw httpError(400, 'Некорректный адрес');
  }
  if (!(await model.removeForUser(req.user.id, addressId))) {
    throw httpError(404, 'Адрес не найден');
  }
  res.status(204).end();
}

module.exports = { list, create, remove };
