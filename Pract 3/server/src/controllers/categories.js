const model = require('../models/categories');
const { httpError } = require('../utils/httpError');

async function list(req, res) {
  res.json(await model.list({ onlyActive: req.query.all !== 'true' }));
}

async function listAll(req, res) {
  res.json(await model.list({ onlyActive: false }));
}

async function getOne(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Некорректный идентификатор');

  const category = await model.findById(id);
  if (!category) throw httpError(404, `Категория ${id} не найдена`);

  res.json(category);
}

async function create(req, res) {
  const body = req.body ?? {};

  if (!body.title?.trim()) {
    throw httpError(400, 'Проверьте правильность полей', { title: 'Название обязательно' });
  }

  try {
    res.status(201).json(await model.create({
      title: body.title.trim(),
      description: body.description?.trim() ?? '',
      sortOrder: body.sortOrder === undefined ? undefined : Number(body.sortOrder),
    }));
  } catch (e) {
    if (e.code === '23505') throw httpError(409, 'Категория с таким названием уже есть');
    throw e;
  }
}

async function update(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Некорректный идентификатор');

  const body = req.body ?? {};

  if ('title' in body && !body.title?.trim()) {
    throw httpError(400, 'Проверьте правильность полей', { title: 'Название не может быть пустым' });
  }
  if ('isActive' in body && typeof body.isActive !== 'boolean') {
    throw httpError(400, 'Проверьте правильность полей', {
      isActive: 'Статус категории должен быть активен или выключен',
    });
  }

  let category;
  try {
    category = await model.update(id, body);
  } catch (e) {
    if (e.code === '23505') throw httpError(409, 'Категория с таким названием уже есть');
    throw e;
  }
  if (!category) throw httpError(404, `Категория ${id} не найдена`);

  res.json(category);
}

async function remove(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Некорректный идентификатор');

  const ok = await model.deactivate(id);
  if (!ok) throw httpError(404, `Категория ${id} не найдена`);

  res.json({ message: `Категория ${id} отключена` });
}

module.exports = { list, listAll, getOne, create, update, remove };
