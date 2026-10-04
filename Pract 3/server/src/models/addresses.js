const pool = require('../db/pool');
const { httpError } = require('../utils/httpError');

const MAX_ADDITIONAL_ADDRESSES = 5;

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, label, address
       FROM user_addresses
      WHERE user_id = $1
      ORDER BY id`,
    [userId]);
  return rows;
}

async function createForUser(userId, { label, address }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: users } = await client.query(
      'SELECT id FROM users WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [userId]);
    if (!users[0]) throw httpError(404, 'Пользователь не найден');

    const { rows: counts } = await client.query(
      'SELECT COUNT(*)::int AS count FROM user_addresses WHERE user_id = $1',
      [userId]);
    if (counts[0].count >= MAX_ADDITIONAL_ADDRESSES) {
      throw httpError(409, 'Можно сохранить не больше 5 дополнительных адресов');
    }

    const { rows } = await client.query(
      `INSERT INTO user_addresses (user_id, label, address)
       VALUES ($1, $2, $3)
       RETURNING id, label, address`,
      [userId, label, address]);

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw httpError(409, 'Этот адрес уже сохранён');
    }
    if (error.code === '23514') {
      throw httpError(400, 'Адрес должен содержать от 3 до 300 символов');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function removeForUser(userId, addressId) {
  const { rowCount } = await pool.query(
    'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
    [addressId, userId]);
  return rowCount > 0;
}

module.exports = { listForUser, createForUser, removeForUser };
