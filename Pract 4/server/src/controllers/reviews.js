const reviewsModel = require('../models/reviews');
const productsModel = require('../models/products');
const { containsProfanity } = require('../utils/profanity');
const { httpError } = require('../utils/httpError');

// Удалённый админом отзыв отдаём без текста/оценки, но с пометкой,
// чтобы на странице было видно: «удалён за нарушение политики».
function present(review) {
  if (!review.isDeleted) return review;
  return { ...review, comment: null, rating: null };
}

async function listForProduct(req, res) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    throw httpError(400, 'Некорректный идентификатор дома');
  }

  const rows = await reviewsModel.listForProduct(productId);
  res.json(rows.map(present));
}

async function create(req, res) {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId < 1) {
    throw httpError(400, 'Некорректный идентификатор дома');
  }

  const product = await productsModel.findById(productId);
  if (!product || !product.isActive) throw httpError(404, `Дом ${productId} не найден`);

  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  const details = {};

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    details.rating = 'Оценка должна быть целым числом от 1 до 5';
  }
  if (comment.length < 5 || comment.length > 1000) {
    details.comment = 'Отзыв должен содержать от 5 до 1000 символов';
  } else if (containsProfanity(comment)) {
    details.comment = 'Отзыв содержит недопустимые выражения';
  }

  if (Object.keys(details).length) throw httpError(400, 'Проверьте отзыв', details);

  // Один отзыв на пользователя на дом.
  const existing = await reviewsModel.findByUserAndProduct(req.user.id, productId);
  if (existing) {
    const message = existing.isDeleted
      ? 'Ваш отзыв был удалён администрацией за нарушение политики, повторно оставить нельзя'
      : 'Вы уже оставляли отзыв на этот дом';
    throw httpError(409, message);
  }

  const created = await reviewsModel.create({ userId: req.user.id, productId, rating, comment });
  res.status(201).json(created);
}

// Удаление доступно только администратору. Отзыв не стирается физически,
// а помечается как удалённый за нарушение политики.
async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Некорректный идентификатор');

  const review = await reviewsModel.findById(id);
  if (!review) throw httpError(404, `Отзыв ${id} не найден`);
  if (review.isDeleted) throw httpError(409, 'Этот отзыв уже удалён');

  await reviewsModel.softDelete(id);
  res.json({ message: 'Отзыв удалён за нарушение политики' });
}

// Список всех отзывов для админки.
async function listAll(req, res) {
  res.json(await reviewsModel.listAll());
}

module.exports = { listForProduct, listAll, create, remove };
