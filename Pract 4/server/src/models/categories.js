const pool = require('../db/pool');
const { httpError } = require('../utils/httpError');

const FIELDS = `
  id          AS "categoryId",
  title       AS "title",
  description AS "description",
  sort_order  AS "sortOrder",
  is_active   AS "isActive"
`;

async function list({ onlyActive = true } = {}) {
  const where = onlyActive ? 'WHERE is_active = TRUE' : '';
  const { rows } = await pool.query(
    `SELECT ${FIELDS} FROM categories ${where} ORDER BY sort_order, title`);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${FIELDS} FROM categories WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ title, description, sortOrder }) {
  const { rows } = await pool.query(
    `INSERT INTO categories (title, description, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [title, description ?? '', sortOrder ?? 100]);
  return findById(rows[0].id);
}

async function update(id, body) {
  const fields = {
    title: 'title',
    description: 'description',
    sortOrder: 'sort_order',
    isActive: 'is_active',
  };
  const keys = Object.keys(body).filter((k) => k in fields);
  if (keys.length === 0) return findById(id);

  const sets = keys.map((k, i) => `${fields[k]} = $${i + 2}`);
  const { rowCount } = await pool.query(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = $1`,
    [id, ...keys.map((k) => body[k])]);

  if (!rowCount) return null;
  return findById(id);
}

async function removeAndReassignProducts(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: categoryRows } = await client.query(
      'SELECT id, title FROM categories WHERE id = $1 FOR UPDATE',
      [id]);
    const category = categoryRows[0];
    if (!category) {
      await client.query('COMMIT');
      return null;
    }

    if (category.title === 'Без категории') {
      throw httpError(400, 'Нейтральную категорию «Без категории» удалить нельзя');
    }

    const { rows: neutralRows } = await client.query(
      `SELECT id, title, is_active FROM categories WHERE title = 'Без категории' FOR UPDATE`);
    const neutral = neutralRows[0];
    if (!neutral) {
      throw httpError(500, 'Не найдена нейтральная категория «Без категории»');
    }
    if (!neutral.is_active) {
      await client.query('UPDATE categories SET is_active = TRUE WHERE id = $1', [neutral.id]);
    }

    const { rowCount: movedProducts } = await client.query(
      'UPDATE products SET category_id = $2 WHERE category_id = $1',
      [id, neutral.id]);
    await client.query('DELETE FROM categories WHERE id = $1', [id]);
    await client.query('COMMIT');

    return {
      title: category.title,
      neutralTitle: neutral.title,
      movedProducts,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { list, findById, create, update, removeAndReassignProducts };
