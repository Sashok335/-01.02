module.exports = function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);

  const status = err.status || 500;

  const body = { error: status === 500 ? 'Внутренняя ошибка сервера' : err.message };
  if (err.details) body.details = err.details;

  res.status(status).json(body);
};
