const pool = require('../db/pool');

const FIELDS = `
  p.id               AS "productId",
  p.category_id      AS "categoryId",
  c.title            AS "categoryTitle",
  p.title            AS "title",
  p.description      AS "description",
  p.image_url        AS "imageUrl",
  p.size             AS "size",
  p.area             AS "area",
  p.build_time       AS "buildTime",
  p.price            AS "price",
  p.discount_percent AS "discountPercent",
  ROUND(p.price * (100 - p.discount_percent) / 100.0, 2) AS "priceFinal",
  CASE WHEN p.discount_percent > 0 THEN TRUE ELSE FALSE END AS "hasDiscount",
  p.stock            AS "stock",
  p.is_active        AS "isActive",
  p.created_at       AS "createdAt"
`;

const FROM = `
  FROM products p
  JOIN categories c ON c.id = p.category_id
`;

// Только эти фиксированные SQL-фрагменты используются в ORDER BY.
const SORTS = {
  title: 'p.title',
  price: 'p.price',
  new: 'p.id DESC',
};

async function list({
  search,
  categoryIds,
  onlyDiscount,
  minPrice,
  maxPrice,
  sort,
  limit,
  includeInactive = false,
} = {}) {
  const where = includeInactive ? [] : ['p.is_active = TRUE', 'c.is_active = TRUE'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    params.push(categoryIds);
    where.push(`p.category_id = ANY($${params.length}::int[])`);
  }

  if (onlyDiscount) where.push('p.discount_percent > 0');
  if (Number.isFinite(minPrice)) {
    params.push(minPrice);
    where.push(`p.price >= $${params.length}`);
  }
  if (Number.isFinite(maxPrice)) {
    params.push(maxPrice);
    where.push(`p.price <= $${params.length}`);
  }

  params.push(Math.min(Number(limit) || 100, 200));
  const whereClause = where.length ? where.join(' AND ') : 'TRUE';

  const { rows } = await pool.query(
    `SELECT ${FIELDS} ${FROM}
      WHERE ${whereClause}
      ORDER BY ${SORTS[sort] ?? SORTS.title}
      LIMIT $${params.length}`,
    params);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${FIELDS} ${FROM} WHERE p.id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ title, description, categoryId, price, discountPercent, stock, imageUrl, size, area, buildTime }) {
  const { rows } = await pool.query(
    `INSERT INTO products
        (category_id, title, description, price, discount_percent, stock, image_url, size, area, build_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [categoryId, title, description ?? '', price, discountPercent ?? 0, stock ?? null, imageUrl ?? null,
      size ?? null, area ?? null, buildTime ?? null]);
  return findById(rows[0].id);
}

const UPDATABLE = {
  title: 'title',
  description: 'description',
  categoryId: 'category_id',
  price: 'price',
  discountPercent: 'discount_percent',
  stock: 'stock',
  imageUrl: 'image_url',
  size: 'size',
  area: 'area',
  buildTime: 'build_time',
  isActive: 'is_active',
};

async function update(id, body) {
  const keys = Object.keys(body).filter((k) => k in UPDATABLE);
  if (keys.length === 0) return findById(id);   // нечего менять

  const sets = keys.map((k, i) => `${UPDATABLE[k]} = $${i + 2}`);
  const values = keys.map((k) => body[k]);

  const { rowCount } = await pool.query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $1`, [id, ...values]);

  if (!rowCount) return null;
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, findById, create, update, remove };
