const pool = require('../db/pool');

// История покупок пользователя. Всё читается из представления
// v_purchases_detailed — там уже есть товар, категория, покупатель и
// код купона, поэтому лишних JOIN в коде не нужно.
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
