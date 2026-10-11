const pool = require('../db/pool');

// Максимум единиц одной позиции в корзине.
const MAX_QUANTITY = 10;

// Корзина пользователя вместе с данными дома и итоговой ценой.
async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ci.product_id AS "productId",
            ci.quantity,
            p.title,
            p.image_url        AS "imageUrl",
            p.price            AS "price",
            p.discount_percent AS "discountPercent",
            ROUND(p.price * (100 - p.discount_percent) / 100.0, 2) AS "priceFinal",
            p.stock,
            p.is_active        AS "isActive"
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = $1
      ORDER BY ci.added_at`,
    [userId]);
  return rows;
}

async function getQuantity(userId, productId) {
  const { rows } = await pool.query(
    'SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]);
  return rows[0] ? rows[0].quantity : 0;
}

async function upsert(userId, productId, quantity) {
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = EXCLUDED.quantity`,
    [userId, productId, quantity]);
}

async function removeItem(userId, productId) {
  const { rowCount } = await pool.query(
    'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, productId]);
  return rowCount > 0;
}

async function clear(userId) {
  await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}

module.exports = { MAX_QUANTITY, listForUser, getQuantity, upsert, removeItem, clear };
