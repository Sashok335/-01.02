const model = require('../models/users');
const { httpError } = require('../utils/httpError');

async function list(req, res) {
  res.json(await model.list());
}

module.exports = { list };
