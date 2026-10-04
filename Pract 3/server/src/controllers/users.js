const model = require('../models/users');
const { httpError } = require('../utils/httpError');

// --- GET /api/users — список покупателей (админ) ---------------------------
// Нужен только для формы «выдать купон»: чтобы выбрать, кому именно.
// Данные отдаются в урезанном виде, пароля там нет вообще.
async function list(req, res) {
  res.json(await model.list());
}

module.exports = { list };
