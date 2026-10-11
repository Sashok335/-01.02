const model = require('../models/products');
const { httpError } = require('../utils/httpError');

function price(value) {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function listQuery(query) {
  const categoryIds = (query.categoryIds ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  return {
    search: (query.search ?? '').trim() || undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    onlyDiscount: query.discount === 'true',
    minPrice: price(query.minPrice),
    maxPrice: price(query.maxPrice),
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
  else if (Number(body.price) <= 0) errors.price = 'Цена должна быть больше нуля';

  const dp = Number(body.discountPercent ?? 0);
  if (!Number.isInteger(dp) || dp < 0 || dp > 99) {
    errors.discountPercent = 'Скидка должна быть целым числом от 0 до 99';
  }

  if (body.area !== undefined && body.area !== null && body.area !== '') {
    const area = Number(body.area);
    if (!Number.isFinite(area) || area <= 0) errors.area = 'Площадь должна быть положительным числом';
  }
  if (typeof body.size === 'string' && body.size.trim().length > 50) {
    errors.size = 'Размер — не более 50 символов';
  }
  if (typeof body.buildTime === 'string' && body.buildTime.trim().length > 50) {
    errors.buildTime = 'Срок строительства — не более 50 символов';
  }

  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    const st = Number(body.stock);
    if (!Number.isInteger(st) || st < 0) errors.stock = 'Остаток — целое число не меньше 0';
  }

  return errors;
}

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
    size: body.size?.trim() || null,
    area: body.area === undefined || body.area === null || body.area === ''
      ? null
      : Number(body.area),
    buildTime: body.buildTime?.trim() || null,
  };
}

async function list(req, res) {
  res.json(await model.list(listQuery(req.query)));
}

async function listAll(req, res) {
  res.json(await model.list({ ...listQuery(req.query), includeInactive: true }));
}

async function getOne(req, res) {
  const id = positiveInt(req.params.id, 'id');

  const product = await model.findById(id);
  if (!product) throw httpError(404, `Дом ${id} не найден`);

  res.json(product);
}

async function create(req, res) {
  const body = req.body ?? {};

  const errors = validateProduct(body);
  if (Object.keys(errors).length) {
    throw httpError(400, 'Проверьте правильность полей', errors);
  }

  try {
    res.status(201).json(await model.create(toProductArgs(body)));
  } catch (e) {
    if (e.code === '23503') throw httpError(400, 'Такой категории не существует');
    if (e.code === '23514') throw httpError(400, 'Недопустимое значение поля');
    throw e;
  }
}

async function update(req, res) {
  const id = positiveInt(req.params.id, 'id');
  const body = req.body ?? {};

  const errors = {};
  if ('title' in body && !body.title?.trim()) errors.title = 'Название не может быть пустым';
  if ('categoryId' in body && !Number.isInteger(Number(body.categoryId))) {
    errors.categoryId = 'Категория должна быть выбрана из списка';
  }
  if ('price' in body && (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0)) {
    errors.price = 'Цена должна быть числом больше 0';
  }
  if ('area' in body && body.area !== null && body.area !== '') {
    const area = Number(body.area);
    if (!Number.isFinite(area) || area <= 0) errors.area = 'Площадь должна быть положительным числом';
  }
  if ('size' in body && typeof body.size === 'string' && body.size.trim().length > 50) {
    errors.size = 'Размер — не более 50 символов';
  }
  if ('buildTime' in body && typeof body.buildTime === 'string' && body.buildTime.trim().length > 50) {
    errors.buildTime = 'Срок строительства — не более 50 символов';
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
    errors.isActive = 'Укажите, активен товар или скрыт';
  }
  if (Object.keys(errors).length) throw httpError(400, 'Проверьте правильность полей', errors);

  try {
    const product = await model.update(id, body);
    if (!product) throw httpError(404, `Дом ${id} не найден`);
    res.json(product);
  } catch (e) {
    if (e.code === '23503') throw httpError(400, 'Такой категории не существует');
    throw e;
  }
}

async function remove(req, res) {
  const id = positiveInt(req.params.id, 'id');

  try {
    const ok = await model.remove(id);
    if (!ok) throw httpError(404, `Дом ${id} не найден`);

    res.json({ message: `Дом ${id} удалён` });
  } catch (e) {
    if (e.code === '23503') {
      throw httpError(409, 'Дом есть в истории заказов и не может быть удалён. Его можно скрыть из каталога.');
    }
    throw e;
  }
}

module.exports = { list, listAll, getOne, create, update, remove };
