const checkoutModel = require('../models/checkout');
const purchasesModel = require('../models/purchases');
const { httpError } = require('../utils/httpError');

function parseItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw httpError(400, 'Корзина пуста');
  }
  if (raw.length > 50) {
    throw httpError(400, 'Слишком много позиций в корзине (максимум 50)');
  }

  const merged = new Map();

  for (const item of raw) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);

    if (!Number.isInteger(productId) || productId < 1) {
      throw httpError(400, 'В корзине указан некорректный товар');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw httpError(400, 'Количество должно быть целым положительным числом');
    }

    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

async function history(req, res) {
  res.json(await purchasesModel.historyForUser(req.user.id, req.query.limit));
}

async function checkout(req, res) {
  const body = req.body ?? {};

  const items = parseItems(body.items);

  const couponCode = typeof body.couponCode === 'string'
    ? body.couponCode.trim().toUpperCase() || null
    : null;

  const created = await checkoutModel.checkout({
    userId: req.user.id,
    items,
    couponCode,
    shippingAddress: typeof body.shippingAddress === 'string'
      ? body.shippingAddress.trim() || null
      : null,
  });

  res.status(201).json(created);
}

module.exports = { history, checkout };
