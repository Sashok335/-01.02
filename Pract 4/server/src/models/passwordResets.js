const pool = require('../db/pool');

// Сохранение кода сброса пароля. Предыдущие неиспользованные коды гасим,
// чтобы подошёл только самый свежий.
async function createCode(userId, code, ttlMinutes = 15) {
  await pool.query(
    'UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
    [userId]);
  await pool.query(
    `INSERT INTO password_resets (user_id, code, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [userId, code, String(ttlMinutes)]);
}

async function findValid(userId, code) {
  const { rows } = await pool.query(
    `SELECT id FROM password_resets
      WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, code]);
  return rows[0] ?? null;
}

async function markUsed(id) {
  await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
}

module.exports = { createCode, findValid, markUsed };
