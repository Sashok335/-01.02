// Ошибки, которые мы создаём сами, с кодом ответа и полями формы.
// Формат ответа один на весь проект:
//   { "error": "...", "details": { "price": "..." } }

function httpError(status, message, details) {
  const e = new Error(message);
  e.status = status;
  if (details) e.details = details;
  return e;
}

module.exports = { httpError };
