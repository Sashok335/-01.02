// Простой фильтр нецензурной лексики для отзывов.
// Проверка по корням слов — этого достаточно для учебного проекта.

const BAD_ROOTS = [
  'хуй', 'хуя', 'хуе', 'хую', 'хуи',
  'пизд',
  'бляд', 'блят',
  'ебат', 'ебал', 'ебет', 'ебуч', 'еби', 'ебу', 'ёб',
  'муда', 'муди',
  'сучар', 'сучий', 'сучк',
  'гандон',
  'долбо',
  'залуп',
  'мраз',
  'пидор', 'пидар',
  'шлюх',
  'говн',
  'нахуй', 'охуе', 'ахуе', 'нихуя',
  'fuck', 'shit', 'bitch', 'asshole',
];

function containsProfanity(text) {
  if (typeof text !== 'string') return false;
  const normalized = text.toLowerCase().replace(/ё/g, 'е');
  return BAD_ROOTS.some((root) => normalized.includes(root.replace(/ё/g, 'е')));
}

module.exports = { containsProfanity };
