const pool = require('../db/pool');
const { couponImprovesProductDiscount } = require('../utils/couponRules');
// httpError — не часть Express, а просто Error с полем status.
// Поэтому модель может им пользоваться, не зная про req и res.
const { httpError } = require('../utils/httpError');

// Оформление корзины. ВСЁ внутри одной транзакции и одного соединения.
//
// Порядок шагов важен: сначала читаем и блокируем всё, что будем менять,
// и только потом вставляем. Иначе на середине выяснится «товара нет» —
// и часть покупок уже записана.
async function checkout({ userId, items, couponCode, shippingAddress }) {
  const client = await pool.connect();          // берём ОДНО соединение
  try {
    await client.query('BEGIN');                 // начинаем транзакцию

    const purchaseIds = [];

    // --- 1. Товары: ОДИН запрос на всю корзину ---------------------------
    // ORDER BY не декоративный: строки блокируются в одном порядке у всех,
    // поэтому две одновременные корзины не сцепятся в тупик.
    const ids = items.map((i) => Number(i.productId));
    const { rows: products } = await client.query(
      `SELECT id, title, price, discount_percent, stock
         FROM products
        WHERE id = ANY($1::int[]) AND is_active = TRUE
        ORDER BY id
        FOR UPDATE`,                             // блокируем строки: см. ниже
      [ids]);

    // Проверяем всю корзину ДО того, как что-то вставили.
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Number(item.quantity);

      if (!p) throw httpError(400, `Товар ${item.productId} не найден`);
      if (!Number.isInteger(qty) || qty < 1) {
        throw httpError(400, 'Количество должно быть целым и положительным');
      }
      if (p.stock !== null && p.stock < qty) {
        throw httpError(409, `«${p.title}» осталось всего ${p.stock}`);
      }
    }

    // --- 2. Купон: ОДИН запрос на весь заказ ------------------------------
    // Код вводится один, значит и купон в заказе может быть только один.
    let coupon = null;

    if (couponCode) {
      const { rows } = await client.query(
        `SELECT id, code, discount_percent, min_order_amount, user_id, product_id
           FROM coupons
          WHERE code = $1 AND is_used = FALSE AND expires_at >= CURRENT_DATE
          FOR UPDATE`,
        [couponCode]);

      if (!rows[0]) throw httpError(400, 'Купон не найден, истёк или уже использован');
      coupon = rows[0];

      if (coupon.user_id !== null && Number(coupon.user_id) !== Number(userId)) {
        throw httpError(400, 'Этот персональный купон выдан другому покупателю');
      }
      if (coupon.product_id !== null && !byId.has(Number(coupon.product_id))) {
        throw httpError(400, 'Купон действует только на товар, которого нет в корзине');
      }

      // Минимальная сумма — считаем по ВСЕЙ корзине, а не по позиции:
      // покупателю неважно, в одной строке его товар или в трёх.
      const cartTotal = items.reduce(
        (sum, it) => sum + Number(byId.get(Number(it.productId)).price) * Number(it.quantity),
        0);

      if (coupon.min_order_amount !== null && cartTotal < Number(coupon.min_order_amount)) {
        throw httpError(400, `Купон ${coupon.code} действует от ${coupon.min_order_amount} ₽`);
      }

      const canImproveDiscount = items.some((item) =>
        couponImprovesProductDiscount(
          coupon,
          userId,
          byId.get(Number(item.productId)),
        ));

      if (!canImproveDiscount) {
        throw httpError(400, 'Скидка по купону не выше уже действующей скидки на товар');
      }
    }

    // --- 3. Строки покупок ------------------------------------------------
    let couponWasUsed = false;

    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const qty = Number(item.quantity);

      // Скидка: максимум из товара и купона. Они НЕ складываются.
      // Купон на товар подходит только к своему товару, поэтому проверка
      // именно здесь, внутри цикла, а не один раз до него.
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

    // --- 4. Платежи --------------------------------------------------------
    // По одному на каждую покупку. Сумму берём из строки покупки, а не считаем
    // заново: total_price уже посчитан GENERATED-столбцом.
    for (const purchaseId of purchaseIds) {
      await client.query(
        `INSERT INTO payments (user_id, purchase_id, amount, method)
         SELECT $1, id, total_price, 'card' FROM purchases WHERE id = $2`,
        [userId, purchaseId]);
    }

    // --- 5. Купон тратится, только если реально дал скидку -----------------
    if (couponWasUsed) {
      await client.query('UPDATE coupons SET is_used = TRUE WHERE id = $1', [coupon.id]);
    }

    await client.query('COMMIT');                // всё сошлось — фиксируем

    // Что именно купили — одним запросом к представлению.
    const { rows } = await client.query(
      `SELECT * FROM v_purchases_detailed
        WHERE "purchaseId" = ANY($1::int[])
        ORDER BY "purchasedAt" DESC`,
      [purchaseIds]);

    return rows;
  } catch (e) {
    await client.query('ROLLBACK');              // что-то сломалось — откатываем всё
    throw e;
  } finally {
    client.release();                            // возвращаем соединение в пул
  }
}

module.exports = { checkout };
