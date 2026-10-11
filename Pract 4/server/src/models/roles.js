const pool = require('../db/pool');

const FIELDS = `
  name        AS "name",
  description AS "description"
`;

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, ${FIELDS} FROM roles WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function findByName(name) {
  const { rows } = await pool.query(
    `SELECT id, ${FIELDS} FROM roles WHERE name = $1`, [name]);
  return rows[0] ?? null;
}

module.exports = { findById, findByName };