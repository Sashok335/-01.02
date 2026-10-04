const model = require('../models/products');
const { httpError } = require('../utils/httpError');

// --- helper: как Express 5 разбирает query -------------------------------
function listQuery(query) {
  // ?categoryIds=1,3,5 -> [1, 3, 5]; мусорные значения отбрасываем.
  const categoryIds = (query.categoryIds ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  return {
    search: (query.search ?? '').trim() || undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    onlyDiscount: query.discount === 'true',
    maxPrice: query.maxPrice === undefined || query.maxPrice === ''
      ? undefined
      : Number(query.maxPrice),
    sort: query.sort,
    limit: query.limit,
  };
}

function positiveInt(value, what) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw httpError(400, `${what} должен быть целым числом от 1`);
  return n;
}

function validateProduct(body) {
  const errors = {};

  if (!body.title?.trim()) errors.title = 'Название обязательно';

  if (!body.categoryId) {
    errors.categoryId = 'Категория обязательна';
  } else if (!Number.isInteger(Number(body.categoryId))) {
    errors.categoryId = 'Категория должна быть выбрана из списка';
  }

  if (!Number.isFinite(Number(body.price))) errors.price = 'Цена должна быть числом';
  else if (Number(body.price) < 0) errors.price = 'Цена не может быть отрицательной';

  const dp = Number(body.discountPercent ?? 0);
  if (!Number.isInteger(dp) || dp < 0 || dp > 99) {
    errors.discountPercent = 'Скидка должна быть целым числом от 0 до 99';
  }

  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    const st = Number(body.stock);
    if (!Number.isInteger(st) || st < 0) errors.stock = 'Остаток — целое число не меньше 0';
  }

  return errors;
}

// Разбор тела в значения нужных типов. Вызывается ПОСЛЕ validateProduct,
// поэтому к этому моменту значения уже известно-пригодны.
function toProductArgs(body) {
  return {
    title: body.title.trim(),
    description: body.description?.trim() ?? '',
    categoryId: Number(body.categoryId),
    price: Number(body.price),
    discountPercent: Number(body.discountPercent ?? 0),
    stock: body.stock === undefined || body.stock === null || body.stock === ''
      ? null
      : Number(body.stock),
    imageUrl: body.imageUrl?.trim() || null,
  };
}

// --- GET /api/products -----------------------------------------------------
async function list(req, res) {
  res.json(await model.list(listQuery(req.query)));
}

async function listAll(req, res) {
  res.json(await model.list({ ...listQuery(req.query), includeInactive: true }));
}

// --- GET /api/products/:id -------------------------------------------------
async function getOne(req, res) {
  const id = positiveInt(req.params.id, 'id');

  const product = await model.findById(id);
  if (!product) throw httpError(404, `Товар ${id} не найден`);

  res.json(product);
}

// --- POST /api/products ----------------------------------------------------
async function create(req, res) {
  const body = req.body ?? {};

  const errors = validateProduct(body);
  if (Object.keys(errors).length) {
    throw httpError(400, 'Проверь правильность полей', errors);
  }

  try {
    res.status(201).json(await model.create(toProductArgs(body)));
  } catch (e) {
    // 23503 — такой категории нет в базе. Клиенту нужен его собственный текст,
    // а не «violates foreign key constraint».
    if (e.code === '23503') throw httpError(400, 'Такой категории не существует');
    if (e.code === '23514') throw httpError(400, 'Недопустимое значение поля');
    throw e;
  }
}

// --- PATCH /api/products/:id ----------------------------------------------
async function update(req, res) {
  const id = positiveInt(req.params.id, 'id');
  const body = req.body ?? {};

  // Проверяем только те поля, которые реально пришли: PATCH не требует
  // полного набора, иначе частичное обновление невозможно.
  const errors = {};
  if ('title' in body && !body.title?.trim()) errors.title = 'Название не может быть пустым';
  if ('categoryId' in body && !Number.isInteger(Number(body.categoryId))) {
    errors.categoryId = 'Категория должна быть выбрана из списка';
  }
  if ('price' in body && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    errors.price = 'Цена должна быть числом не меньше 0';
  }
  if ('discountPercent' in body) {
    const dp = Number(body.discountPercent);
    if (!Number.isInteger(dp) || dp < 0 || dp > 99) {
      errors.discountPercent = 'Скидка должна быть целым числом от 0 до 99';
    }
  }
  if ('stock' in body && body.stock !== null && body.stock !== '') {
    const st = Number(body.stock);
    if (!Number.isInteger(st) || st < 0) errors.stock = 'Остаток — целое число не меньше 0';
  }
  if ('isActive' in body && typeof body.isActive !== 'boolean') {
    errors.isActive = 'Статус товара должен быть активен или выключен';
  }
  if (Object.keys(errors).length) throw httpError(400, 'Проверь правильность полей', errors);

  try {
    const product = await model.update(id, body);
    if (!product) throw httpError(404, `Товар ${id} не найден`);
    res.json(product);
  } catch (e) {
    if (e.code === '23503') throw httpError(400, 'Такой категории не существует');
    throw e;
  }
}

// --- DELETE /api/products/:id ---------------------------------------------
async function remove(req, res) {
  const id = positiveInt(req.params.id, 'id');

  const ok = await model.deactivate(id);
  if (!ok) throw httpError(404, `Товар ${id} не найден`);

  res.json({ message: `Товар ${id} помечен как неактивный` });
}

module.exports = { list, listAll, getOne, create, update, remove };
