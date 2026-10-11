const pool = require('../db/pool');

// Указываем псевдоним таблицы, чтобы избежать неоднозначных имён колонок.
function fields(p = '') {
  const c = p ? `${p}.` : '';
  return `
  ${c}id               AS "couponId",
  ${c}code             AS "code",
  ${c}discount_percent AS "discountPercent",
  ${c}min_order_amount AS "minOrderAmount",
  ${c}user_id          AS "userId",
  ${c}product_id       AS "productId",
  ${c}is_used          AS "isUsed",
  ${c}created_at       AS "createdAt"
`;
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT ${fields('cp')},
            usr.full_name     AS "userName",
            pr.title          AS "productTitle",
            NOT cp.is_used            AS "isActive"
       FROM coupons cp
       LEFT JOIN users usr    ON usr.id = cp.user_id
       LEFT JOIN products pr  ON pr.id  = cp.product_id
      ORDER BY cp.id`);
  return rows;
}

async function mineForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ${fields()} FROM coupons
      WHERE user_id = $1
        AND is_used = FALSE
      ORDER BY discount_percent DESC`,
    [userId]);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${fields()} FROM coupons WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ code, discountPercent, minOrderAmount, userId, productId }) {
  const { rows } = await pool.query(
    `INSERT INTO coupons
       (code, discount_percent, min_order_amount, user_id, product_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [code, discountPercent, minOrderAmount ?? null, userId ?? null, productId ?? null]);
  return findById(rows[0].id);
}

async function update(id, { code, discountPercent, minOrderAmount, userId, productId }) {
  const { rows } = await pool.query(
    `UPDATE coupons
        SET code = $2, discount_percent = $3, min_order_amount = $4,
            user_id = $5, product_id = $6
      WHERE id = $1 AND is_used = FALSE
      RETURNING id`,
    [id, code, discountPercent, minOrderAmount, userId, productId]);
  return rows[0] ? findById(rows[0].id) : null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listAll, mineForUser, findById, create, update, remove };
