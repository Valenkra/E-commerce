import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { Pool } from 'pg';
import { z } from 'zod';
import sharp from 'sharp';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const app = Fastify({ logger: true, bodyLimit: 12 * 1024 * 1024 });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});
const querySchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  subcategory: z.string().max(80).optional(),
  subtype: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  page: z.coerce.number().int().min(1).default(1),
});
const variantSchema = z.object({ size: z.string().min(1).max(40), color: z.string().min(1).max(60), stock: z.number().int().nonnegative(), sku: z.string().max(80).nullish() });
const productSchema = z.object({
  code: z.string().min(1).max(80), name: z.string().min(2).max(200),
  description: z.string().default(''), category: z.string().min(1).max(80),
  subcategory: z.string().max(80).optional(), subtype: z.string().max(80).optional(),
  brand: z.string().max(100).nullish(), retail_price: z.number().nonnegative(),
  wholesale_price: z.number().nonnegative(), image_url: z.string().max(2000).nullish(),
  active: z.boolean().default(true), variants: z.array(variantSchema).default([]),
});
async function requireAdmin(request: any, reply: any) {
  app.log.info('[AUTH] Verificando token administrativo');
  const secret = process.env.LOCAL_ADMIN_TOKEN;
  if (!secret || secret.length < 24) return reply.code(503).send({ error: 'Configurá LOCAL_ADMIN_TOKEN (mínimo 24 caracteres) en apps/api/.env' });
  const provided = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(secret), b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return reply.code(401).send({ error: 'No autorizado' });
  app.log.info('[AUTH] Token administrativo válido');
}
async function start() {
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en apps/api/.env');
  await app.register(cors, { origin: process.env.WEB_ORIGIN?.split(',') || ['http://localhost:3000'] });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  app.get('/health', async (_req, reply) => {
    try { await pool.query('SELECT 1'); return { ok: true, service: 'ecommerce-api', database: true }; }
    catch { return reply.code(503).send({ ok: false, database: false }); }
  });
  app.get('/api/products', async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { q, category, limit, page } = parsed.data;
    const subcategory = parsed.data.subcategory || parsed.data.subtype;
    const clauses = ['p.active = TRUE']; const params: unknown[] = [];
    if (category) { params.push(category); clauses.push(`p.category = $${params.length}`); }
    if (subcategory) { params.push(subcategory); clauses.push(`p.subcategory = $${params.length}`); }
    if (q) { params.push(`%${q}%`); clauses.push(`(p.name ILIKE $${params.length} OR p.code ILIKE $${params.length})`); }
    const where = clauses.join(' AND ');
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const result = await pool.query(`SELECT p.*, COALESCE((SELECT json_agg(json_build_object('id',v.id,'size',v.size,'color',v.color,'stock',v.stock,'sku',v.sku) ORDER BY v.size,v.color) FROM product_variants v WHERE v.product_id=p.id),'[]'::json) AS variants FROM products p WHERE ${where} ORDER BY p.name LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { data: result.rows, total: count.rows[0].total, page, limit };
  });
  app.get('/api/categories', async () => {
    const result = await pool.query('SELECT category, subcategory FROM products WHERE active = TRUE ORDER BY category, subcategory');
    const categories = new Map<string, Set<string>>();
    for (const row of result.rows) { if (!row.category) continue; if (!categories.has(row.category)) categories.set(row.category, new Set()); if (row.subcategory) categories.get(row.category)!.add(row.subcategory); }
    return { data: [...categories].map(([category, values]) => ({ category, subtypes: [...values] })) };
  });


app.get('/api/admin/products', { preHandler: requireAdmin }, async () => {
  const result = await pool.query(`
    SELECT p.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'size', v.size,
              'color', v.color,
              'stock', v.stock,
              'sku', v.sku
            )
            ORDER BY v.size, v.color
          )
          FROM product_variants v
          WHERE v.product_id = p.id
        ),
        '[]'::json
      ) AS variants
    FROM products p
    ORDER BY p.name
  `);

  return { data: result.rows };
});


app.post('/api/admin/products', { preHandler: requireAdmin }, async (req, reply) => {
  app.log.info('[PRODUCTS] POST recibido');

  const parsed = productSchema.safeParse(req.body);

  if (!parsed.success) {
    app.log.warn('[PRODUCTS] Datos inválidos');
    return reply.code(400).send({ error: parsed.error.flatten() });
  }

  const p = parsed.data;

  app.log.info('[PRODUCTS] Solicitando conexión a PostgreSQL');

  const client = await pool.connect();

  app.log.info('[PRODUCTS] Conexión obtenida');
    try {
      await client.query('BEGIN');
      const inserted = await client.query(`INSERT INTO products (code,name,description,category,subcategory,brand,retail_price,wholesale_price,image_url,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [p.code,p.name,p.description,p.category,p.subcategory ?? p.subtype ?? null,p.brand ?? null,p.retail_price,p.wholesale_price,p.image_url ?? null,p.active]);
      const variants = [];
      for (const v of p.variants) {
        const r = await client.query('INSERT INTO product_variants (product_id,size,color,stock,sku) VALUES ($1,$2,$3,$4,$5) RETURNING *', [inserted.rows[0].id,v.size,v.color,v.stock,v.sku ?? null]);
        variants.push(r.rows[0]);
      }
      await client.query('COMMIT');
      return reply.code(201).send({ data: { ...inserted.rows[0], variants } });
    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return reply.code(409).send({ error: 'Código, SKU o variante duplicada' });
      app.log.error(error); return reply.code(500).send({ error: 'No se pudo crear el producto' });
    } finally { client.release(); }
  });

  app.patch('/api/admin/products/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = z.object({
      id: z.string().uuid()
    }).safeParse(req.params);

    if (!params.success) {
      return reply.code(400).send({ error: 'ID de producto inválido' });
    }

    const parsed = productSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Datos inválidos',
        details: parsed.error.flatten()
      });
    }

    const p = parsed.data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const updated = await client.query(
        `UPDATE products SET
          code = $1,
          name = $2,
          description = $3,
          category = $4,
          subcategory = $5,
          brand = $6,
          retail_price = $7,
          wholesale_price = $8,
          image_url = $9,
          active = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
        [
          p.code, p.name, p.description, p.category,
          p.subcategory ?? p.subtype ?? null,
          p.brand ?? null, p.retail_price,
          p.wholesale_price, p.image_url ?? null,
          p.active, params.data.id
        ]
      );

      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.code(404).send({
          error: 'Producto no encontrado'
        });
      }

      // Se conservan las variantes existentes que sigan en el formulario.
      // Las variantes nuevas se insertan.
      const existing = await client.query(
        `SELECT id, size, color FROM product_variants
         WHERE product_id = $1 FOR UPDATE`,
        [params.data.id]
      );

      const keptIds: string[] = [];

      for (const variant of p.variants) {
        const match = existing.rows.find(
          (row) =>
            row.size === variant.size &&
            row.color === variant.color
        );

        if (match) {
          await client.query(
            `UPDATE product_variants
             SET stock = $1, sku = $2
             WHERE id = $3`,
            [variant.stock, variant.sku ?? null, match.id]
          );
          keptIds.push(match.id);
        } else {
          const inserted = await client.query(
            `INSERT INTO product_variants
             (product_id, size, color, stock, sku)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              params.data.id,
              variant.size,
              variant.color,
              variant.stock,
              variant.sku ?? null
            ]
          );
          keptIds.push(inserted.rows[0].id);
        }
      }

      // No borramos variantes automáticamente.
      // Si una variante deja de enviarse, se conserva con stock 0.
      for (const row of existing.rows) {
        if (!keptIds.includes(row.id)) {
          await client.query(
            'UPDATE product_variants SET stock = 0 WHERE id = $1',
            [row.id]
          );
        }
      }

      const variants = await client.query(
        `SELECT * FROM product_variants
         WHERE product_id = $1
         ORDER BY size, color`,
        [params.data.id]
      );

      await client.query('COMMIT');

      return reply.send({
        data: {
          ...updated.rows[0],
          variants: variants.rows
        }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');

      if (error.code === '23505') {
        return reply.code(409).send({
          error: 'Código, SKU o variante duplicada'
        });
      }

      app.log.error(error);
      return reply.code(500).send({
        error: 'No se pudo actualizar el producto'
      });
    } finally {
      client.release();
    }
  });

  
app.delete('/api/admin/products/:id', {
  preHandler: requireAdmin
}, async (req, reply) => {
  const parsed = z.object({
    id: z.string().uuid()
  }).safeParse(req.params);

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'ID de producto inválido'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET active = FALSE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, code, name, active`,
      [parsed.data.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({
        error: 'Producto no encontrado'
      });
    }

    return reply.send({
      message: 'Producto desactivado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    app.log.error(error);

    return reply.code(500).send({
      error: 'No se pudo eliminar el producto'
    });
  }
});


  app.post('/api/admin/images', { preHandler: requireAdmin }, async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'Falta archivo' });
    if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) return reply.code(415).send({ error: 'Solo JPG, PNG o WebP' });
    const input = await file.toBuffer();
    const meta = await sharp(input).metadata();
    if ((meta.width || 0) * (meta.height || 0) > 35_000_000) return reply.code(413).send({ error: 'Imagen demasiado grande' });
    const id = randomUUID(); const dir = join(process.cwd(), 'uploads');
    await mkdir(dir, { recursive: true });
    const originalExt = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    await writeFile(join(dir, `${id}-original.${originalExt}`), input);
    await sharp(input).rotate().resize({ width: 1200, height: 1500, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(dir, `${id}.webp`));
    return reply.code(201).send({ path: `uploads/${id}.webp`, requiresReview: true, originalPreserved: true, note: 'Archivo local; todavía no tiene URL pública' });
  });
  app.post('/api/admin/imports', { preHandler: requireAdmin }, async (_req, reply) => reply.code(501).send({ error: 'Importación PDF pendiente' }));
  app.post('/api/admin/orders', { preHandler: requireAdmin }, async (_req, reply) => reply.code(501).send({ error: 'Pedidos transaccionales pendientes' }));
  app.post('/webhooks/whatsapp', async (_req, reply) => reply.code(503).send({ error: 'Webhook inactivo' }));
  app.get('/webhooks/whatsapp', async (req, reply) => {
    const q = req.query as Record<string,string>;
    if (process.env.WHATSAPP_VERIFY_TOKEN && q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) return reply.type('text/plain').send(q['hub.challenge']);
    return reply.code(403).send('Forbidden');
  });
  await app.listen({ port: Number(process.env.PORT || 4000), host: '0.0.0.0' });
}
start().catch(err => { app.log.error(err); process.exit(1); });

