const jwt = require('jsonwebtoken');
const { httpError } = require('../utils/httpError');
const roleModel = require('../models/roles');

// Секрет читается один раз при загрузке. Если переменной нет — падаем сразу,
// а не молча подписываем токены пустой строкой.
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('[auth] не задана переменная JWT_SECRET — проверь .env');
  process.exit(1);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, roleId: user.role_id }, SECRET, { expiresIn: '7d' });
}

// Проверка токена. Токен идёт в заголовке: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Нет токена'));

  try {
    const payload = jwt.verify(token, SECRET);   // бросит, если подпись не сошлась
    req.user = { id: payload.sub, roleId: payload.roleId };
    next();
  } catch {
    next(httpError(401, 'Токен недействителен или истёк'));
  }
}

// Проверка права по флагу из таблицы roles:
//   requireRole('canManageGoods') — только админ и менеджер
function requireRole(flag) {
  return async (req, res, next) => {
    try {
      const role = await roleModel.findForUser(req.user.id);
      if (!role)      throw httpError(403, 'Роль не найдена');
      if (!role[flag]) throw httpError(403, `Недостаточно прав: нужно право ${flag}`);

      req.user.role = role;
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { signToken, requireAuth, requireRole };
