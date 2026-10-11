const cartModel = require('../models/cart');
const productsModel = require('../models/products');
const { httpError } = require('../utils/httpError');

// Сколько единиц дома можно положить в корзину:
// максимум 10 и не больше, чем есть в наличии.
function limitFor(product) {
  if (product.stock === null || product.stock === undefined) return cartModel.MAX_QUANTITY;
  return Math.min(cartModel.MAX_QUANTITY, product.stock);
}

async function summary(userId) {
  const items = await cartModel.listForUser(userId);
  const total = items.reduce((sum, i) => sum + Number(i.priceFinal) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, total: Math.round(total * 100) / 100, count };
}

async function getProductOr404(productId) {
  const product = await productsModel.findById(productId);
  if (!product || !product.isActive) throw httpError(404, `Дом ${productId} не найден`);
  return product;
}

async function list(req, res) {
  res.json(await summary(req.user.id));
}

async function add(req, res) {
  const productId = Number(req.body?.productId);
  const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);

  if (!Number.isInteger(productId) || productId < 1) {
    throw httpError(400, 'Некорректный идентификатор дома');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw httpError(400, 'Количество должно быть целым положительным числом');
  }

  const product = await getProductOr404(productId);
  const limit = limitFor(product);
  if (limit < 1) throw httpError(409, 'Этого дома нет в наличии');

  // Не разрешаем выйти за лимит: молча доводим до максимума.
  const current = await cartModel.getQuantity(req.user.id, productId);
  const next = Math.min(current + quantity, limit);
  await cartModel.upsert(req.user.id, productId, next);

  res.status(201).json(await summary(req.user.id));
}

async function setQuantity(req, res) {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body?.quantity);

  if (!Number.isInteger(productId) || productId < 1) {
    throw httpError(400, 'Некорректный идентификатор дома');
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw httpError(400, 'Количество должно быть целым неотрицательным числом');
  }

  if (quantity === 0) {
    await cartModel.removeItem(req.user.id, productId);
    return res.json(await summary(req.user.id));
  }

  const product = await getProductOr404(productId);
  const limit = limitFor(product);
  if (quantity > limit) throw httpError(400, `Максимум ${limit} шт. этой позиции`);

  await cartModel.upsert(req.user.id, productId, quantity);
  res.json(await summary(req.user.id));
}

async function removeItem(req, res) {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId < 1) {
    throw httpError(400, 'Некорректный идентификатор дома');
  }

  await cartModel.removeItem(req.user.id, productId);
  res.json(await summary(req.user.id));
}

async function clear(req, res) {
  await cartModel.clear(req.user.id);
  res.json(await summary(req.user.id));
}

module.exports = { list, add, setQuantity, removeItem, clear };
