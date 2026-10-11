const pool = require('../db/pool');

// Публичные данные пользователя не включают пароль или его хеш.
function publicFields(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    primaryAddress: row.primary_address,
    roleId: row.role_id,
    roleName: row.roleName ?? row.role_name,
    balance: row.balance,
  };
}

async function findWithPassword(email) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, phone, password_hash, role_id, balance
       FROM users
      WHERE email = $1`,
    [email]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.primary_address, u.role_id, u.balance,
            r.name AS "roleName"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [id]);
  return rows[0] ?? null;
}

async function list() {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.primary_address, u.role_id, u.balance,
            r.name AS "roleName"
       FROM users u
       JOIN roles r ON r.id = u.role_id
      ORDER BY u.id`);
  return rows.map(publicFields);
}

// Обновление профиля. Отдельная функция, чтобы не создавать возможность
// менять пользователей из админки (по требованию админ их не трогает).
async function updateProfile(id, { fullName, email, phone, primaryAddress, passwordHash }) {
  const { rows } = await pool.query(
    `UPDATE users
        SET full_name       = $1,
            email           = $2,
            phone           = $3,
            primary_address = $4,
            password_hash   = $5
      WHERE id = $6
      RETURNING id`,
    [fullName, email, phone, primaryAddress, passwordHash, id]);
  return rows[0] ? findById(id) : null;
}

module.exports = { findWithPassword, findById, list, updateProfile };
