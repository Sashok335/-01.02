const model = require('../models/coupons');
const { httpError } = require('../utils/httpError');

function present(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw httpError(400, 'id должен быть целым числом');
  return n;
}

// Главное правило выдачи купона: привязка ровно одна —
// либо к человеку, либо к товару.
function validateCoupon(body) {
  const errors = {};
  const dp = Number(body.discountPercent);

  if (typeof body.code !== 'string' || !/^[A-Z0-9]{4,50}$/i.test(body.code.trim())) {
    errors.code = 'Код: 4–50 символов, латиница и цифры';
  }
  if (!Number.isInteger(dp) || dp < 1 || dp > 99) {
    errors.discountPercent = 'Скидка — целое от 1 до 99';
  }
  if (!body.expiresAt || Number.isNaN(Date.parse(body.expiresAt))) {
    errors.expiresAt = 'Нужна дата в формате ГГГГ-ММ-ДД';
  }

  const hasUser = body.userId != null && body.userId !== '';
  const hasProduct = body.productId != null && body.productId !== '';

  if (hasUser && hasProduct) {
    errors.target = 'Купон — либо человеку, либо товару, но не обоим сразу';
  } else if (!hasUser && !hasProduct) {
    errors.target = 'Укажи, кому выдаётся купон: userId или productId';
  } else if (hasUser && !Number.isInteger(Number(body.userId))) {
    errors.userId = 'Покупатель должен быть выбран из списка';
  } else if (hasProduct && !Number.isInteger(Number(body.productId))) {
    errors.productId = 'Товар должен быть выбран из списка';
  }

  if (body.minOrderAmount !== undefined && body.minOrderAmount !== null && body.minOrderAmount !== '') {
    const m = Number(body.minOrderAmount);
    if (!Number.isFinite(m) || m < 0) errors.minOrderAmount = 'Минимальная сумма — число не меньше 0';
  }

  return errors;
}

// --- POST /api/coupons — выдать купон (админ) -------------------------------
async function create(req, res) {
  const body = req.body ?? {};

  // 422, а не 400: поля заполнены, но значения недопустимы — типичная
  // ситуация формы, где надо подсветить конкретные поля.
  const errors = validateCoupon(body);
  if (Object.keys(errors).length) {
    throw httpError(422, 'Проверь поля формы', errors);
  }

  const args = {
    // В верхний регистр: иначе «welcome10» и «WELCOME10» стали бы двумя
    // разными купонами, и покупатель получил бы «купон не найден».
    code: body.code.trim().toUpperCase(),
    discountPercent: Number(body.discountPercent),
    minOrderAmount: body.minOrderAmount === undefined || body.minOrderAmount === null
      || body.minOrderAmount === ''
      ? null
      : Number(body.minOrderAmount),
    userId: body.userId === undefined || body.userId === null || body.userId === ''
      ? null
      : present(body.userId),
    productId: body.productId === undefined || body.productId === null || body.productId === ''
      ? null
      : present(body.productId),
    expiresAt: body.expiresAt,
  };

  try {
    res.status(201).json(await model.create(args));
  } catch (e) {
    // Уникальность кода проверяет БД (UNIQUE на coupons.code).
    // 23514 — сработал CHECK «ровно одна привязка», страховка от обхода валидатора.
    if (e.code === '23505') {
      throw httpError(409, `Купон с кодом ${args.code} уже существует`);
    }
    if (e.code === '23503') {
      throw httpError(400, 'Такого покупателя или товара не существует');
    }
    if (e.code === '23514') {
      throw httpError(422, 'Проверь поля формы', {
        target: 'Купон — либо человеку, либо товару, но не обоим сразу',
      });
    }
    throw e;
  }
}

async function update(req, res) {
  const id = present(req.params.id);
  const body = req.body ?? {};
  const errors = validateCoupon(body);
  if (Object.keys(errors).length) throw httpError(422, 'Проверь поля формы', errors);

  const existing = await model.findById(id);
  if (!existing) throw httpError(404, `Купон ${id} не найден`);
  if (existing.isUsed) throw httpError(409, 'Использованный купон нельзя изменить');

  const args = {
    code: body.code.trim().toUpperCase(),
    discountPercent: Number(body.discountPercent),
    minOrderAmount: body.minOrderAmount === undefined || body.minOrderAmount === null
      || body.minOrderAmount === ''
      ? null
      : Number(body.minOrderAmount),
    userId: body.userId === undefined || body.userId === null || body.userId === ''
      ? null
      : present(body.userId),
    productId: body.productId === undefined || body.productId === null || body.productId === ''
      ? null
      : present(body.productId),
    expiresAt: body.expiresAt,
  };

  try {
    const coupon = await model.update(id, args);
    if (!coupon) throw httpError(409, 'Купон уже был использован и больше не редактируется');
    res.json(coupon);
  } catch (e) {
    if (e.code === '23505') throw httpError(409, `Купон с кодом ${args.code} уже существует`);
    if (e.code === '23503') throw httpError(400, 'Такого покупателя или товара не существует');
    if (e.code === '23514') {
      throw httpError(422, 'Проверь поля формы', {
        target: 'Купон — либо человеку, либо товару, но не обоим сразу',
      });
    }
    throw e;
  }
}

// --- GET /api/coupons/mine — мои действующие --------------------------------
async function mine(req, res) {
  res.json(await model.mineForUser(req.user.id));
}

// --- GET /api/coupons — все купоны (админ) ----------------------------------
async function list(req, res) {
  res.json(await model.listAll());
}

// --- DELETE /api/coupons/:id — отозвать (админ) -----------------------------
async function remove(req, res) {
  const id = present(req.params.id);

  // Сначала читаем: чтобы отличить «нет такого» (404) от «есть» (200).
  const coupon = await model.findById(id);
  if (!coupon) throw httpError(404, `Купон ${id} не найден`);

  await model.remove(id);

  // Покупки, где он сработал, НЕ пропадают: в них процент и сумма свои.
  res.json({ message: `Купон ${coupon.code} отозван`, code: coupon.code });
}

module.exports = { create, update, mine, list, remove };
