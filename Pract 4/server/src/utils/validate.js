// Общие проверки значений, используемые контроллерами.

// ФИО: буквы (кириллица/латиница), пробел, дефис, апостроф. Минимум 2 буквы.
const NAME_RE = /^\p{L}[\p{L}' -]{1,149}$/u;

function isRealName(value) {
  if (typeof value !== 'string') return false;
  const name = value.trim();
  if (!NAME_RE.test(name)) return false;
  const letters = name.replace(/[^\p{L}]/gu, '');
  return letters.length >= 2;
}

// Телефон: принимаем +7/8 и 10 цифр с любыми пробелами, дефисами, скобками.
const PHONE_RE = /^(?:\+7|8)[\s\-()]*(\d{3})[\s\-()]*(\d{3})[\s\-()]*(\d{2})[\s\-()]*(\d{2})$/;

// Возвращает нормализованный номер +7XXXXXXXXXX либо null, если формат неверный.
function normalizePhone(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(PHONE_RE);
  if (!match) return null;
  return `+7${match[1]}${match[2]}${match[3]}${match[4]}`;
}

function isValidPhone(value) {
  return normalizePhone(value) !== null;
}

module.exports = { isRealName, normalizePhone, isValidPhone };
