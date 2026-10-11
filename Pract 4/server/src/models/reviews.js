const pool = require('../db/pool');

const FIELDS = `
  r.id         AS "reviewId",
  r.product_id AS "productId",
  r.user_id    AS "userId",
  r.rating     AS "rating",
  r.comment    AS "comment",
  r.is_deleted AS "isDeleted",
  r.created_at AS "createdAt",
  to_char(r.created_at, 'DD.MM.YYYY') AS "createdAtFormatted",
  u.full_name  AS "userName"
`;

// Отзывы конкретного дома. Показываются и удалённые (с пометкой),
// чтобы было видно, что админ их убрал за нарушение политики.
async function listForProduct(productId) {
  const { rows } = await pool.query(
    `SELECT ${FIELDS}
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC`,
    [productId]);
  return rows;
}

async function findByUserAndProduct(userId, productId) {
  const { rows } = await pool.query(
    `SELECT ${FIELDS}
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.user_id = $1 AND r.product_id = $2`,
    [userId, productId]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, user_id AS "userId", product_id AS "productId",
            is_deleted AS "isDeleted"
       FROM reviews WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ userId, productId, rating, comment }) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (user_id, product_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING id`, [userId, productId, rating, comment]);
  return findByUserAndProduct(userId, productId);
}

// Мягкое удаление: отзыв остаётся, но помечается как нарушающий политику.
async function softDelete(id) {
  await pool.query('UPDATE reviews SET is_deleted = TRUE WHERE id = $1', [id]);
}

// Все отзывы — для вкладки «Отзывы» в админке.
async function listAll() {
  const { rows } = await pool.query(
    `SELECT r.id         AS "reviewId",
            r.product_id AS "productId",
            p.title      AS "productTitle",
            r.user_id    AS "userId",
            u.full_name  AS "userName",
            r.rating,
            r.comment,
            r.is_deleted AS "isDeleted",
            to_char(r.created_at, 'DD.MM.YYYY HH24:MI') AS "createdAtFormatted"
       FROM reviews r
       JOIN users u    ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
      ORDER BY r.created_at DESC`);
  return rows;
}

module.exports = { listForProduct, listAll, findByUserAndProduct, findById, create, softDelete };
