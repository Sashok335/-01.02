const pool = require('../db/pool');
const { couponImprovesProductDiscount } = require('../utils/couponRules');
const { httpError } = require('../utils/httpError');

// Максимум единиц одной позиции и всего на одну дату доставки.
const MAX_ITEM_QUANTITY = 10;
const MAX_UNITS_PER_DAY = 10; // «на день не хватит сотрудников»

// Оформление заказа: один заказ = один номер и одна общая сумма на все позиции.
// Все изменения фиксируются вместе либо полностью откатываются.
async function checkout({ userId, items, couponCode, shippingAddress, deliveryDate }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = items.map((i) => Number(i.productId));
    // Единый порядок блокировки домов уменьшает риск взаимных блокировок.
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

      if (!p) throw httpError(400, `Дом ${item.productId} не найден`);
      if (!Number.isInteger(qty) || qty < 1) {
        throw httpError(400, 'Количество должно быть целым положительным числом');
      }
      if (qty > MAX_ITEM_QUANTITY) {
        throw httpError(400, `Нельзя заказать больше ${MAX_ITEM_QUANTITY} единиц одной позиции`);
      }
      if (p.stock !== null && p.stock < qty) {
        throw httpError(409, `Дома «${p.title}» осталось только ${p.stock} шт.`);
      }
    }

    // Проверяем ёмкость на выбранную дату: всего не больше 10 единиц в день.
    const totalUnits = items.reduce((sum, it) => sum + Number(it.quantity), 0);
    const { rows: booked } = await client.query(
      `SELECT COALESCE(SUM(pu.quantity), 0)::int AS quantity
         FROM purchases pu
         JOIN orders o ON o.id = pu.order_id
        WHERE o.delivery_date = $1 AND o.status <> 'cancelled'`,
      [deliveryDate]);

    if (booked[0].quantity + totalUnits > MAX_UNITS_PER_DAY) {
      throw httpError(409,
        'На выбранную дату свободных строительных бригад больше нет — выберите другую дату');
    }

    // Работа с купоном (необязательно).
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
        throw httpError(400, 'Купон действует на другой дом — его нет в заказе');
      }

      const cartTotal = items.reduce(
        (sum, it) => sum + Number(byId.get(Number(it.productId)).price) * Number(it.quantity),
        0);

      if (coupon.min_order_amount !== null && cartTotal < Number(coupon.min_order_amount)) {
        throw httpError(400, `Купон ${coupon.code} действует при сумме заказа от ${coupon.min_order_amount} ₽`);
      }

      const canImprove = items.some((item) =>
        couponImprovesProductDiscount(coupon, userId, byId.get(Number(item.productId))));

      if (!canImprove) {
        throw httpError(400, 'Скидка по купону не выгоднее скидки, которая уже действует на дом');
      }
    }

    // Считаем скидку и сумму по каждой позиции.
    let couponWasUsed = false;
    let orderTotal = 0;
    const prepared = [];

    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Number(item.quantity);

      const couponFits = coupon !== null && couponImprovesProductDiscount(coupon, userId, p);

      let discount = p.discount_percent;
      let source = p.discount_percent > 0 ? 'product_discount' : 'none';
      let couponId = null;

      if (couponFits) {
        discount = Number(coupon.discount_percent);
        source = coupon.user_id !== null ? 'personal' : 'product';
        couponId = coupon.id;
        couponWasUsed = true;
      }

      const lineTotal = Math.round(p.price * qty * (100 - discount) / 100 * 100) / 100;
      orderTotal += lineTotal;
      prepared.push({ p, qty, discount, source, couponId });
    }

    // Одна строка заказа с общим номером и общей суммой.
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, shipping_address, delivery_date, status, total_price)
       VALUES ($1, $2, $3, 'paid', $4)
       RETURNING id, order_number AS "orderNumber"`,
      [userId, shippingAddress, deliveryDate, orderTotal]);

    const orderId = orderRows[0].id;
    const purchaseIds = [];

    for (const { p, qty, discount, source, couponId } of prepared) {
      const { rows: inserted } = await client.query(
        `INSERT INTO purchases
           (order_id, user_id, product_id, quantity, price_per_unit, discount_percent,
            coupon_id, discount_source, status, shipping_address, delivery_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, $10)
         RETURNING id`,
        [orderId, userId, p.id, qty, p.price, discount, couponId, source,
          shippingAddress, deliveryDate]);

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
    return { orderId, orderNumber: orderRows[0].orderNumber, totalPrice: orderTotal };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { checkout };
