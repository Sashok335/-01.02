const pool = require('../db/pool');

// Псевдоним таблицы передаём параметром: в списке всех купонов таблица
// названа `cp` (там JOIN с users и products), а в остальных запросах —
// без псевдонима. Имена колонок без префикса в JOIN неоднозначны.
function fields(p = '') {
  const c = p ? `${p}.` : '';
  return `
  ${c}id               AS "couponId",
  ${c}code             AS "code",
  ${c}discount_percent AS "discountPercent",
  ${c}min_order_amount AS "minOrderAmount",
  ${c}user_id          AS "userId",
  ${c}product_id       AS "productId",
  -- expires_at приводим к строке в БД, а не в JS.
  -- Поле типа DATE, а драйвер отдаёт его как объект Date в локальной зоне;
  -- при обратном преобразовании в JSON дата уезжает на сутки назад.
  to_char(${c}expires_at, 'DD.MM.YYYY') AS "expiresAt",
  ${c}is_used          AS "isUsed",
  ${c}created_at       AS "createdAt"
`;
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT ${fields('cp')},
            usr.full_name     AS "userName",
            pr.title          AS "productTitle",
            (cp.expires_at >= CURRENT_DATE AND NOT cp.is_used) AS "isActive"
       FROM coupons cp
       LEFT JOIN users usr    ON usr.id = cp.user_id
       LEFT JOIN products pr  ON pr.id  = cp.product_id
      ORDER BY cp.id`);
  return rows;
}

// «Мои» — только персональные и только действующие: без использованных
// и без просроченных. Купоны на товары здесь не показываем: ими
// распоряжается админ, а не покупатель.
async function mineForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ${fields()} FROM coupons
      WHERE user_id = $1
        AND is_used = FALSE
        AND expires_at >= CURRENT_DATE
      ORDER BY discount_percent DESC`,
    [userId]);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT ${fields()} FROM coupons WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ code, discountPercent, minOrderAmount, userId, productId, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO coupons
       (code, discount_percent, min_order_amount, user_id, product_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [code, discountPercent, minOrderAmount ?? null, userId ?? null, productId ?? null, expiresAt]);
  return findById(rows[0].id);
}

async function update(id, { code, discountPercent, minOrderAmount, userId, productId, expiresAt }) {
  const { rows } = await pool.query(
    `UPDATE coupons
        SET code = $2, discount_percent = $3, min_order_amount = $4,
            user_id = $5, product_id = $6, expires_at = $7
      WHERE id = $1 AND is_used = FALSE
      RETURNING id`,
    [id, code, discountPercent, minOrderAmount, userId, productId, expiresAt]);
  return rows[0] ? findById(rows[0].id) : null;
}

// Жёсткое удаление. Связанные строки purchases.coupon_id станут NULL
// (ON DELETE SET NULL) — процент скидки и сумма в истории останутся.
async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listAll, mineForUser, findById, create, update, remove };
