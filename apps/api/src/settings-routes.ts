import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

type Auth = (request: any, reply: any) => Promise<unknown>;
const settingsSchema = z.object({
  store_name: z.string().trim().max(120),
  contact_phone: z.string().trim().max(60),
  contact_email: z.union([z.literal(''), z.string().email().max(160)]),
  store_address: z.string().trim().max(250),
  opening_hours: z.string().trim().max(250),
  pickup_enabled: z.boolean(),
  shipping_enabled: z.boolean(),
  shipping_cost: z.number().min(0).max(100000000).nullable(),
  pickup_instructions: z.string().trim().max(600),
  shipping_instructions: z.string().trim().max(600),
  default_price: z.enum(['retail','wholesale']),
  low_stock_threshold: z.number().int().min(0).max(10000),
}).refine(v => v.pickup_enabled || v.shipping_enabled, { message: 'Debe existir al menos una modalidad de entrega' });
export const defaultStoreSettings = {
  store_name: '', contact_phone: '', contact_email: '', store_address: '', opening_hours: '',
  pickup_enabled: true, shipping_enabled: true, shipping_cost: null,
  pickup_instructions: '', shipping_instructions: '', default_price: 'retail' as const,
  low_stock_threshold: 3,
};
export function registerSettingsRoutes(app: FastifyInstance, pool: Pool, requireAdmin: Auth) {
  app.get('/api/admin/settings', {preHandler: requireAdmin}, async () => {
    const result = await pool.query('SELECT data, updated_at FROM store_settings WHERE id=1');
    return { data: { ...defaultStoreSettings, ...(result.rows[0]?.data ?? {}) }, updated_at: result.rows[0]?.updated_at ?? null };
  });
  app.put('/api/admin/settings', {preHandler: requireAdmin}, async (req, reply) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({error:'Configuración inválida',details:parsed.error.flatten()});
    const result = await pool.query(`INSERT INTO store_settings(id,data,updated_at) VALUES(1,$1::jsonb,NOW())
      ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW() RETURNING updated_at`, [JSON.stringify(parsed.data)]);
    return {data: parsed.data, updated_at:result.rows[0].updated_at};
  });
}
