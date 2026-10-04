const { test } = require('node:test');
const assert = require('node:assert/strict');
const { couponImprovesProductDiscount } = require('../src/utils/couponRules');

test('personal coupon applies to its owner when it beats the product discount', () => {
  assert.equal(
    couponImprovesProductDiscount(
      { user_id: 7, product_id: null, discount_percent: 25 },
      7,
      { id: 3, discount_percent: 10 },
    ),
    true,
  );
});

test('personal coupon does not apply to another user', () => {
  assert.equal(
    couponImprovesProductDiscount(
      { user_id: 7, product_id: null, discount_percent: 25 },
      8,
      { id: 3, discount_percent: 10 },
    ),
    false,
  );
});

test('product coupon applies only to its target product', () => {
  const coupon = { user_id: null, product_id: 3, discount_percent: 20 };

  assert.equal(couponImprovesProductDiscount(coupon, 7, { id: 3, discount_percent: 10 }), true);
  assert.equal(couponImprovesProductDiscount(coupon, 7, { id: 4, discount_percent: 0 }), false);
});

test('coupon does not override an equal or better product discount', () => {
  const coupon = { user_id: 7, product_id: null, discount_percent: 15 };

  assert.equal(couponImprovesProductDiscount(coupon, 7, { id: 3, discount_percent: 15 }), false);
  assert.equal(couponImprovesProductDiscount(coupon, 7, { id: 3, discount_percent: 20 }), false);
});
