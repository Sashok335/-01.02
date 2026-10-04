const pool = require('../db/pool');

// Права роли. Модель не знает про HTTP — только про БД.
const FIELDS = `
  name              AS "name",
  can_order         AS "canOrder",
  can_manage_users  AS "canManageUsers",
  can_manage_goods  AS "canManageGoods"
`;

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${FIELDS} FROM roles WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function findForUser(userId) {
  const { rows } = await pool.query(
    `SELECT ${FIELDS}
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.is_active = TRUE`,
    [userId]);
  return rows[0] ?? null;
}

// Регистрация всегда выдаёт роль buyer, и берём её по имени,
// а не по id: id может сдвинуться, а имя в сиде неизменно.
async function findByName(name) {
  const { rows } = await pool.query(
    `SELECT id, ${FIELDS} FROM roles WHERE name = $1`, [name]);
  return rows[0] ?? null;
}

module.exports = { findById, findForUser, findByName };
