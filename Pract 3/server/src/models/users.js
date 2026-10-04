const pool = require('../db/pool');

// Модель НИКОГДА не выбирает password_hash наружу сама: она возвращает
// объект пользователя уже без хеша, а сырой SELECT живёт только внутри
// findWithPassword — его зовёт исключительно контроллер входа.
function publicFields(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roleId: row.role_id,
    balance: row.balance,
    isActive: row.is_active,
  };
}

async function findWithPassword(email) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, password_hash, role_id, balance, is_active
       FROM users
      WHERE email = $1`,
    [email]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.balance, u.is_active,
            r.name             AS "roleName",
            r.can_order        AS "canOrder",
            r.can_manage_users AS "canManageUsers",
            r.can_manage_goods AS "canManageGoods"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [id]);
  return rows[0] ?? null;
}

async function list() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.balance, u.is_active,
            r.name AS "roleName"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      ORDER BY u.id`);
  return rows.map(publicFields);
}

module.exports = { findWithPassword, findById, list };
