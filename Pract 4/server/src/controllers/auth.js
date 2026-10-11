const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const roleModel = require('../models/roles');
const resetsModel = require('../models/passwordResets');
const { signToken } = require('../middleware/auth');
const { httpError } = require('../utils/httpError');
const { isRealName, normalizePhone } = require('../utils/validate');
const { sendPasswordResetCode } = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function publicUser(user, role) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    primaryAddress: user.primary_address,
    role,
  };
}

async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) throw httpError(400, 'Введите email и пароль');

  const { rows } = await pool.query(
    `SELECT id, email, full_name, phone, password_hash, role_id, primary_address
       FROM users WHERE email = $1`,
    [String(email).trim().toLowerCase()]);

  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw httpError(401, 'Неверный email или пароль');
  }

  const role = await roleModel.findById(user.role_id);

  res.json({ token: signToken(user, role.name), user: publicUser(user, role) });
}

async function me(req, res) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, phone, role_id, primary_address
       FROM users WHERE id = $1`,
    [req.user.id]);

  const user = rows[0];
  if (!user) throw httpError(404, 'Пользователь не найден');

  res.json(publicUser(user, await roleModel.findById(user.role_id)));
}

async function updateMe(req, res) {
  const { fullName, email, currentPassword, newPassword, primaryAddress, phone } = req.body ?? {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const address = typeof primaryAddress === 'string' ? primaryAddress.trim() : '';
  const normalizedPhone = normalizePhone(phone);
  const details = {};

  if (!isRealName(name)) {
    details.fullName = 'Имя может содержать только буквы, пробел и дефис (минимум 2 буквы)';
  }
  if (mail.length > 255 || !EMAIL_RE.test(mail)) details.email = 'Введите корректный email';
  if (phone !== undefined && !normalizedPhone) {
    details.phone = 'Телефон в формате +7 (999) 123-45-67';
  }
  if (currentPassword !== undefined && typeof currentPassword !== 'string') {
    details.currentPassword = 'Введите текущий пароль';
  }
  if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 8)) {
    details.newPassword = 'Новый пароль должен содержать минимум 8 символов';
  }
  if (primaryAddress !== undefined && typeof primaryAddress !== 'string') {
    details.primaryAddress = 'Некорректный адрес';
  } else if (address.length > 300) {
    details.primaryAddress = 'Адрес — не более 300 символов';
  }
  if (Object.keys(details).length) throw httpError(400, 'Проверьте поля профиля', details);

  const currentUser = await pool.query(
    `SELECT id, email, full_name, phone, password_hash, role_id
       FROM users WHERE id = $1`,
    [req.user.id]);
  const user = currentUser.rows[0];
  if (!user) throw httpError(404, 'Пользователь не найден');

  const credentialChange = mail !== user.email || newPassword !== undefined;
  if (credentialChange && !currentPassword) {
    throw httpError(400, 'Для смены email или пароля введите текущий пароль', {
      currentPassword: 'Введите текущий пароль',
    });
  }
  if (credentialChange && !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw httpError(400, 'Текущий пароль неверный', {
      currentPassword: 'Текущий пароль неверный',
    });
  }

  let passwordHash = user.password_hash;
  if (newPassword !== undefined) passwordHash = await bcrypt.hash(newPassword, 10);

  const nextPhone = phone === undefined ? user.phone : normalizedPhone;

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET full_name = $1, email = $2, password_hash = $3, phone = $4,
              primary_address = CASE WHEN $5 THEN NULLIF($6, '') ELSE primary_address END
        WHERE id = $7
      RETURNING id, email, full_name, phone, role_id, primary_address`,
      [name, mail, passwordHash, nextPhone, primaryAddress !== undefined,
        primaryAddress === undefined ? null : address, req.user.id]);
    const updated = rows[0];

    res.json(publicUser(updated, await roleModel.findById(updated.role_id)));
  } catch (e) {
    if (e.code === '23505') {
      throw httpError(409, 'Этот email уже используется', { email: 'Этот email уже используется' });
    }
    throw e;
  }
}

async function register(req, res) {
  const { email, password, fullName, phone } = req.body ?? {};

  const details = {};
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPhone = normalizePhone(phone);

  if (!mail)                              details.email = 'Введите email';
  else if (!EMAIL_RE.test(mail))          details.email = 'Это не похоже на email';
  if (!password)                          details.password = 'Введите пароль';
  else if (password.length < 8)           details.password = 'Пароль от 8 символов';
  if (!isRealName(fullName))              details.fullName = 'Имя может содержать только буквы, пробел и дефис';
  if (!normalizedPhone)                   details.phone = 'Телефон в формате +7 (999) 123-45-67';

  if (Object.keys(details).length) throw httpError(400, 'Проверьте поля формы', details);

  const buyer = await roleModel.findByName('buyer');
  if (!buyer) throw httpError(500, 'Не удалось определить роль покупателя');

  let rows;
  try {
    ({ rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, full_name, phone, role_id, primary_address`,
      [mail, await bcrypt.hash(password, 10), fullName.trim(), normalizedPhone, buyer.id]));
  } catch (e) {
    if (e.code === '23505') {
      throw httpError(409, 'Такой email уже зарегистрирован', { email: 'Этот email уже занят' });
    }
    throw e;
  }

  const user = rows[0];

  res.status(201).json({
    token: signToken(user, buyer.name),
    user: publicUser(user, await roleModel.findById(user.role_id)),
  });
}

// Шаг 1: запрос кода. Код реально уходит на почту через SMTP.
async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  if (!EMAIL_RE.test(email)) {
    throw httpError(400, 'Введите корректный email', { email: 'Введите корректный email' });
  }

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!rows[0]) {
    throw httpError(404, 'Пользователь с таким email не найден', { email: 'Пользователь не найден' });
  }

  // Случайный шестизначный код (криптостойкий генератор).
  const code = String(crypto.randomInt(100000, 1000000));
  await resetsModel.createCode(rows[0].id, code);

  // Код уходит только на почту. Если SMTP не настроен — здесь будет ошибка.
  await sendPasswordResetCode(email, code);

  res.json({ message: 'Код отправлен на почту. Проверьте входящие письма.', email });
}

// Шаг 2: проверка кода и установка нового пароля.
async function resetPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = String(req.body?.code ?? '').trim();
  const { newPassword } = req.body ?? {};
  const details = {};

  if (!EMAIL_RE.test(email)) details.email = 'Введите корректный email';
  if (!/^\d{6}$/.test(code)) details.code = 'Код — это 6 цифр из письма';
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    details.newPassword = 'Новый пароль должен содержать минимум 8 символов';
  }
  if (Object.keys(details).length) throw httpError(400, 'Проверьте поля', details);

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) throw httpError(404, 'Пользователь не найден', { email: 'Пользователь не найден' });

  const reset = await resetsModel.findValid(user.id, code);
  if (!reset) {
    throw httpError(400, 'Неверный или просроченный код', { code: 'Неверный или просроченный код' });
  }

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2',
    [await bcrypt.hash(newPassword, 10), user.id]);
  await resetsModel.markUsed(reset.id);

  res.json({ message: 'Пароль изменён. Теперь можно войти с новым паролем.' });
}

module.exports = { login, register, me, updateMe, forgotPassword, resetPassword };
