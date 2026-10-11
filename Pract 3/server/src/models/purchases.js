const pool = require('../db/pool');

async function historyForUser(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM v_purchases_detailed
      WHERE "userId" = $1
      ORDER BY "purchasedAt" DESC
      LIMIT $2`,
    [userId, Math.min(Number(limit) || 50, 200)]);
  return rows;
}

module.exports = { historyForUser };
