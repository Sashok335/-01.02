// Отправка письма с кодом сброса пароля через реальный SMTP (nodemailer).
const nodemailer = require('nodemailer');
const { httpError } = require('./httpError');

// Транспорт создаётся из переменных окружения .env (SMTP_HOST/PORT/USER/PASS).
function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Отправляет код на почту. Если SMTP не настроен — выбрасывает ошибку,
// чтобы код нигде не «утекал» (в консоль он больше не пишется).
async function sendPasswordResetCode(to, code) {
  const transport = buildTransport();
  if (!transport) {
    throw httpError(503, 'Отправка писем не настроена: заполните SMTP_USER и SMTP_PASS в .env сервера');
  }

  try {
    await transport.sendMail({
      // Имя отправителя видит получатель. Адрес — обязательно SMTP_USER,
      // потому что Gmail не разрешает подменять его на чужой/несуществующий.
      from: {
        name: process.env.MAIL_FROM_NAME || 'ДомоГрад',
        address: process.env.SMTP_USER,
      },
      to,
      subject: 'Сброс пароля — ДомоГрад',
      text: `Ваш код для сброса пароля: ${code}\nКод действует 15 минут.`,
      html: `
        <p>Здравствуйте!</p>
        <p>Ваш код для сброса пароля:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p>
        <p>Код действует 15 минут. Если вы не запрашивали сброс — просто игнорируйте письмо.</p>
      `,
    });
  } catch (e) {
    throw httpError(502, 'Не удалось отправить письмо с кодом. Проверьте настройки SMTP.');
  }
}

module.exports = { sendPasswordResetCode };
