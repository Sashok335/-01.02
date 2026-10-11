const pool = require('../db/pool');
const { httpError } = require('../utils/httpError');

// Разрешённые переходы статуса заказа.
// Важно: из «оплачен» НЕЛЬЗЯ вернуть в «ожидает оплаты».
const TRANSITIONS = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'refunded', 'cancelled'],
  shipped:   ['refunded'],
  cancelled: [],
  refunded:  [],
};

// Собирает заказы и подклеивает к ним позиции.
async function withItems(orderRows) {
  if (orderRows.length === 0) return [];

  const ids = orderRows.map((o) => o.orderId);
  const { rows: items } = await pool.query(
    `SELECT * FROM v_purchases_detailed
      WHERE "orderId" = ANY($1::int[])
      ORDER BY "purchaseId"`,
    [ids]);

  const byOrder = new Map(ids.map((id) => [id, []]));
  for (const item of items) {
    if (byOrder.has(item.orderId)) byOrder.get(item.orderId).push(item);
  }

  return orderRows.map((o) => ({ ...o, items: byOrder.get(o.orderId) ?? [] }));
}

async function listForUser(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM v_orders_detailed
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT $2`,
    [userId, Math.min(Number(limit) || 50, 200)]);
  return withItems(rows);
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT * FROM v_orders_detailed ORDER BY "createdAt" DESC`);
  return withItems(rows);
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM v_orders_detailed WHERE "orderId" = $1`, [id]);
  return rows[0] ?? null;
}

async function updateStatus(id, status) {
  const { rows } = await pool.query('SELECT id, status FROM orders WHERE id = $1', [id]);
  const order = rows[0];
  if (!order) return null;

  if (order.status !== status) {
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      const hint = order.status === 'paid' && status === 'pending'
        ? 'Оплаченный заказ нельзя вернуть в «ожидает оплаты»'
        : `Нельзя сменить статус «${order.status}» на «${status}»`;
      throw httpError(409, hint);
    }
    await pool.query('UPDATE orders SET status = $2 WHERE id = $1', [id, status]);
    // Держим позиции в том же статусе, что и заказ.
    await pool.query('UPDATE purchases SET status = $2 WHERE order_id = $1', [id, status]);
  }

  return findById(id);
}

module.exports = { TRANSITIONS, listForUser, listAll, findById, updateStatus };
