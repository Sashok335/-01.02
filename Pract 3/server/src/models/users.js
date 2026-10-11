const pool = require('../db/pool');

// Публичные данные пользователя не включают пароль или его хеш.
function publicFields(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    roleId: row.role_id,
    balance: row.balance,
  };
}

async function findWithPassword(email) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, password_hash, role_id, balance
       FROM users
      WHERE email = $1`,
    [email]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.balance,
            r.name AS "roleName"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [id]);
  return rows[0] ?? null;
}

async function list() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.balance,
            r.name AS "roleName"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      ORDER BY u.id`);
  return rows.map(publicFields);
}

module.exports = { findWithPassword, findById, list };