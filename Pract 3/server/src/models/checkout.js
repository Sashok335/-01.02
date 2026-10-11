const pool = require('../db/pool');
const { couponImprovesProductDiscount } = require('../utils/couponRules');
const { httpError } = require('../utils/httpError');

// Все изменения заказа фиксируются вместе или полностью откатываются.
async function checkout({ userId, items, couponCode, shippingAddress }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const purchaseIds = [];

    const ids = items.map((i) => Number(i.productId));
    // Единый порядок блокировки товаров уменьшает риск взаимных блокировок.
    const { rows: products } = await client.query(
      `SELECT id, title, price, discount_percent, stock
         FROM products
        WHERE id = ANY($1::int[]) AND is_active = TRUE
        ORDER BY id
        FOR UPDATE`,
      [ids]);

    const byId = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Number(item.quantity);

      if (!p) throw httpError(400, `Товар ${item.productId} не найден`);
      if (!Number.isInteger(qty) || qty < 1) {
        throw httpError(400, 'Количество должно быть целым положительным числом');
      }
      if (p.stock !== null && p.stock < qty) {
        throw httpError(409, `Товара «${p.title}» осталось только ${p.stock} шт.`);
      }
    }

    let coupon = null;

    if (couponCode) {
      const { rows } = await client.query(
        `SELECT id, code, discount_percent, min_order_amount, user_id, product_id
           FROM coupons
          WHERE code = $1 AND is_used = FALSE
          FOR UPDATE`,
        [couponCode]);

      if (!rows[0]) throw httpError(400, 'Купон не найден или уже использован');
      coupon = rows[0];

      if (coupon.user_id !== null && Number(coupon.user_id) !== Number(userId)) {
        throw httpError(400, 'Этот персональный купон выдан другому покупателю');
      }
      if (coupon.product_id !== null && !byId.has(Number(coupon.product_id))) {
        throw httpError(400, 'Купон действует на другой товар — его нет в корзине');
      }

      const cartTotal = items.reduce(
        (sum, it) => sum + Number(byId.get(Number(it.productId)).price) * Number(it.quantity),
        0);

      if (coupon.min_order_amount !== null && cartTotal < Number(coupon.min_order_amount)) {
        throw httpError(400, `Купон ${coupon.code} действует при сумме заказа от ${coupon.min_order_amount} ₽`);
      }

      const canImproveDiscount = items.some((item) =>
        couponImprovesProductDiscount(
          coupon,
          userId,
          byId.get(Number(item.productId)),
        ));

      if (!canImproveDiscount) {
        throw httpError(400, 'Скидка по купону не выгоднее скидки, которая уже действует на товар');
      }
    }

    let couponWasUsed = false;

    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Number(item.quantity);

      const couponFits = coupon !== null
        && couponImprovesProductDiscount(coupon, userId, p);

      let discount = p.discount_percent;
      let source = p.discount_percent > 0 ? 'product_discount' : 'none';
      let couponId = null;

      if (couponFits) {
        discount = Number(coupon.discount_percent);
        source = coupon.user_id !== null ? 'personal' : 'product';
        couponId = coupon.id;
        couponWasUsed = true;
      }

      const { rows: inserted } = await client.query(
        `INSERT INTO purchases
           (user_id, product_id, quantity, price_per_unit, discount_percent,
            coupon_id, discount_source, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, p.id, qty, p.price, discount, couponId, source, shippingAddress ?? null]);

      purchaseIds.push(inserted[0].id);

      if (p.stock !== null) {
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, p.id]);
      }
    }

    for (const purchaseId of purchaseIds) {
      await client.query(
        `INSERT INTO payments (user_id, purchase_id, amount, method)
         SELECT $1, id, total_price, 'card' FROM purchases WHERE id = $2`,
        [userId, purchaseId]);
    }

    if (couponWasUsed) {
      await client.query('UPDATE coupons SET is_used = TRUE WHERE id = $1', [coupon.id]);
    }

    await client.query('COMMIT');

    const { rows } = await client.query(
      `SELECT * FROM v_purchases_detailed
        WHERE "purchaseId" = ANY($1::int[])
        ORDER BY "purchasedAt" DESC`,
      [purchaseIds]);

    return rows;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { checkout };
