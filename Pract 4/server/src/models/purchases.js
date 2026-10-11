const orders = require('./orders');

// История покупок теперь сгруппирована по заказам (один заказ = один номер
// и одна общая сумма). Оставлено для совместимости с прежним импортом.
function historyForUser(userId, limit) {
  return orders.listForUser(userId, limit);
}

module.exports = { historyForUser };
