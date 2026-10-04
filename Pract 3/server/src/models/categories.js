const pool = require('../db/pool');

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

// Товары не удаляем никогда: на категорию ссылается products с RESTRICT,
// а на товары — покупки. Только гасим.
async function deactivate(id) {
  const { rowCount } = await pool.query(
    'UPDATE categories SET is_active = FALSE WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, findById, create, update, deactivate };
