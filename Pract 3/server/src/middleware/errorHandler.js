// Единый обработчик ошибок проекта. ВСЕГДА подключается последним.
//
// Сигнатура из 4 аргументов обязательна: именно по ней Express опознаёт
// обработчик ошибок. Убрать next нельзя, даже если не используешь.
module.exports = function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);

  // Ошибки, которые мы создали сами через httpError().
  const status = err.status || 500;

  // Клиенту не показываем детали на 500: там может быть текст SQL.
  const body = { error: status === 500 ? 'Внутренняя ошибка сервера' : err.message };
  if (err.details) body.details = err.details;

  res.status(status).json(body);
};
