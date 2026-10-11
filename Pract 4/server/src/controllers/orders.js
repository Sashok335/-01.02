const ordersModel = require('../models/orders');
const { httpError } = require('../utils/httpError');

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'refunded'];

async function listAll(req, res) {
  res.json(await ordersModel.listAll());
}

async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const status = req.body?.status;

  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Некорректный идентификатор');
  if (!STATUSES.includes(status)) throw httpError(400, 'Недопустимый статус заказа');

  const order = await ordersModel.updateStatus(id, status);
  if (!order) throw httpError(404, `Заказ ${id} не найден`);

  res.json(order);
}

module.exports = { listAll, updateStatus };
