function httpError(status, message, details) {
  const e = new Error(message);
  e.status = status;
  if (details) e.details = details;
  return e;
}

module.exports = { httpError };
