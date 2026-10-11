const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const roleModel = require('../models/roles');
const { signToken } = require('../middleware/auth');
const { httpError } = require('../utils/httpError');

async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) throw httpError(400, 'Введите email и пароль');

  const { rows } = await pool.query(
    `SELECT id, email, full_name, password_hash, role_id, primary_address
       FROM users WHERE email = $1`,
    [String(email).trim().toLowerCase()]);

  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw httpError(401, 'Неверный email или пароль');
  }

  const role = await roleModel.findById(user.role_id);

  res.json({
    token: signToken(user, role.name),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      primaryAddress: user.primary_address,
      role,
    },
  });
}

async function me(req, res) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role_id, primary_address
       FROM users WHERE id = $1`,
    [req.user.id]);

  const user = rows[0];
  if (!user) throw httpError(404, 'Пользователь не найден');

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    primaryAddress: user.primary_address,
    role: await roleModel.findById(user.role_id),
  });
}

async function updateMe(req, res) {
  const { fullName, email, currentPassword, newPassword, primaryAddress } = req.body ?? {};
  const name = typeof fullName === 'string' ? fullName.trim() : '';
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const address = typeof primaryAddress === 'string' ? primaryAddress.trim() : '';
  const details = {};

  if (name.length < 2 || name.length > 150) {
    details.fullName = 'Имя должно содержать от 2 до 150 символов';
  }
  if (mail.length > 255 || !EMAIL_RE.test(mail)) details.email = 'Введите корректный email';
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
  if (Object.keys(details).length) {
    throw httpError(400, 'Проверьте поля профиля', details);
  }

  const currentUser = await pool.query(
    `SELECT id, email, full_name, password_hash, role_id
       FROM users
      WHERE id = $1`,
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

  try {
    const { rows } = await pool.query(
      `UPDATE users
          SET full_name = $1, email = $2, password_hash = $3,
              primary_address = CASE WHEN $4 THEN NULLIF($5, '') ELSE primary_address END
        WHERE id = $6
      RETURNING id, email, full_name, role_id, primary_address`,
      [name, mail, passwordHash, primaryAddress !== undefined,
        primaryAddress === undefined ? null : address, req.user.id]);
    const updated = rows[0];

    res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      primaryAddress: updated.primary_address,
      role: await roleModel.findById(updated.role_id),
    });
  } catch (e) {
    if (e.code === '23505') {
      throw httpError(409, 'Этот email уже используется', { email: 'Этот email уже используется' });
    }
    throw e;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function register(req, res) {
  const { email, password, fullName } = req.body ?? {};

  const details = {};
  const mail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!mail)                              details.email = 'Введите email';
  else if (!EMAIL_RE.test(mail))         details.email = 'Это не похоже на email';
  if (!password)                         details.password = 'Введите пароль';
  else if (password.length < 8)           details.password = 'Пароль от 8 символов';
  if (!fullName?.trim())                  details.fullName = 'Введите имя';
  else if (fullName.trim().length < 2)    details.fullName = 'Имя слишком короткое';

  if (Object.keys(details).length) throw httpError(400, 'Проверьте поля формы', details);

  const buyer = await roleModel.findByName('buyer');
  if (!buyer) throw httpError(500, 'Не удалось определить роль покупателя');

  let rows;
  try {
    ({ rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id)
       VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, role_id, primary_address`,
      [mail, await bcrypt.hash(password, 10), fullName.trim(), buyer.id]));
  } catch (e) {
    if (e.code === '23505') {
      throw httpError(409, 'Такой email уже зарегистрирован', { email: 'Этот email уже занят' });
    }
    throw e;
  }

  const user = rows[0];

  res.status(201).json({
    token: signToken(user, buyer.name),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      primaryAddress: user.primary_address,
      role: await roleModel.findById(user.role_id),
    },
  });
}

module.exports = { login, register, me, updateMe };
