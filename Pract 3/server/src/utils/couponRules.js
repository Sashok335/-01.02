function couponImprovesProductDiscount(coupon, userId, product) {
  const matchesTarget = coupon.user_id !== null
    ? Number(coupon.user_id) === Number(userId)
    : Number(coupon.product_id) === product.id;

  return matchesTarget
    && Number(coupon.discount_percent) > Number(product.discount_percent);
}

module.exports = { couponImprovesProductDiscount };
