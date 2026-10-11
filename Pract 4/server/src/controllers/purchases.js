const checkoutModel = require('../models/checkout');
const ordersModel = require('../models/orders');
const cartModel = require('../models/cart');
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
      throw httpError(400, 'В корзине указан некорректный дом');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw httpError(400, 'Количество должно быть целым положительным числом');
    }
    if (quantity > 10) {
      throw httpError(400, 'Нельзя заказать больше 10 единиц одной позиции');
    }

    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

// Дата приходит строкой вида YYYY-MM-DD.
function parseDeliveryDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw httpError(400, 'Укажите дату доставки', { deliveryDate: 'Укажите дату доставки' });
  }
  const date = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, 'Некорректная дата доставки', { deliveryDate: 'Некорректная дата' });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    throw httpError(400, 'Дата доставки не может быть в прошлом', {
      deliveryDate: 'Дата не может быть в прошлом',
    });
  }
  return date.toISOString().slice(0, 10);
}

async function history(req, res) {
  res.json(await ordersModel.listForUser(req.user.id, req.query.limit));
}

async function checkout(req, res) {
  const body = req.body ?? {};

  const items = parseItems(body.items);

  const couponCode = typeof body.couponCode === 'string'
    ? body.couponCode.trim().toUpperCase() || null
    : null;

  const shippingAddress = typeof body.shippingAddress === 'string'
    ? body.shippingAddress.trim()
    : '';
  if (shippingAddress.length < 3) {
    throw httpError(400, 'Укажите адрес доставки', {
      shippingAddress: 'Укажите адрес доставки',
    });
  }
  if (shippingAddress.length > 300) {
    throw httpError(400, 'Адрес — не более 300 символов', {
      shippingAddress: 'Адрес — не более 300 символов',
    });
  }

  const deliveryDate = parseDeliveryDate(body.deliveryDate);

  const created = await checkoutModel.checkout({
    userId: req.user.id,
    items,
    couponCode,
    shippingAddress,
    deliveryDate,
  });

  // Заказ оформлен — корзина больше не нужна.
  await cartModel.clear(req.user.id);

  res.status(201).json(created);
}

module.exports = { history, checkout };
