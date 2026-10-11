const jwt = require('jsonwebtoken');
const { httpError } = require('../utils/httpError');

const SECRET = process.env.JWT_SECRET;


function signToken(user, roleName) {
  if (typeof roleName !== 'string' || !roleName.trim()) {
    throw new TypeError('Нельзя создать токен без роли пользователя');
  }
  return jwt.sign({ sub: user.id, role: roleName }, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Требуется вход в аккаунт'));

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(httpError(401, 'Сессия истекла — войдите заново'));
  }
}

function requireRole(name) {
  return (req, res, next) => {
    if (req.user.role !== name) {
      return next(httpError(403, `Доступно только роли «${name}»`));
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };


