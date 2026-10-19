import type { FastifyInstance } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

type Auth = (request: any, reply: any) => Promise<unknown>;
const seller = z.string().trim().min(1).max(100);
const code = z.string().trim().regex(/^PED-\d{6,}$/);
const itemBody = z.object({
  seller_key: seller,
  product_code: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(100000),
  operation: z.enum(['add','subtract','set','remove']).default('add'),
  allow_shortage: z.boolean().default(false),
});
const context = z.object({ seller_key: seller });
const identifier = z.object({ code });

export function registerOrdersRoutes(app: FastifyInstance, pool: Pool, requireAdmin: Auth) {
  async function getOrder(client: PoolClient, tracking: string) {
    const r = await client.query('SELECT * FROM orders WHERE tracking_code=$1 AND deleted_at IS NULL', [tracking]);
    if (!r.rowCount) return null;
    const items = await client.query(`SELECT i.id, i.variant_id, i.quantity, i.shortage_authorized,
      i.unit_price::float8 AS unit_price, p.code AS product_code,p.name,p.category,
      v.color,v.size,v.stock AS physical_stock,
      GREATEST(i.quantity-v.stock,0) AS current_shortage
      FROM order_items i JOIN product_variants v ON v.id=i.variant_id
      JOIN products p ON p.id=v.product_id WHERE i.order_id=$1 ORDER BY p.code,v.color,v.size`,[r.rows[0].id]);
    return {...r.rows[0],items:items.rows};
  }
  async function event(client: PoolClient, orderId: string, actor: string, kind: string, details: unknown) {
    await client.query('INSERT INTO order_events(order_id,actor,event_type,details) VALUES($1,$2,$3,$4)',[orderId,actor,kind,JSON.stringify(details)]);
  }
  app.post('/api/admin/orders/draft', {preHandler:requireAdmin}, async (req,reply) => {
    const parsed=context.safeParse(req.body);
    if(!parsed.success)return reply.code(400).send({error:'Vendedor inválido'});
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      // Serializa las creaciones concurrentes del mismo vendedor.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[parsed.data.seller_key]);
      let found=await client.query("SELECT tracking_code FROM orders WHERE seller_key=$1 AND status='draft'",[parsed.data.seller_key]);
      if(!found.rowCount){
        const seq=await client.query("SELECT nextval('order_number_seq') AS n");
        const tracking=`PED-${String(seq.rows[0].n).padStart(6,'0')}`;
        found=await client.query("INSERT INTO orders(tracking_code,seller_key) VALUES($1,$2) RETURNING tracking_code",[tracking,parsed.data.seller_key]);
        const id=await client.query('SELECT id FROM orders WHERE tracking_code=$1',[tracking]);
        await event(client,id.rows[0].id,parsed.data.seller_key,'created',{});
      }
      const result=await getOrder(client,found.rows[0].tracking_code);
      await client.query('COMMIT');return {data:result};
    }catch(e){await client.query('ROLLBACK');app.log.error(e);return reply.code(500).send({error:'No se pudo abrir el borrador'});}finally{client.release();}
  });
  app.get('/api/admin/orders', {preHandler:requireAdmin}, async (req,reply)=>{
    const parsed=z.object({status:z.enum(['draft','registered','preparing','ready','delivered','cancelled']).optional()}).safeParse(req.query);
    if(!parsed.success)return reply.code(400).send({error:'Filtro inválido'});
    const r=await pool.query('SELECT * FROM orders WHERE deleted_at IS NULL AND ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT 200',[parsed.data.status??null]);
    return {data:r.rows};
  });
  app.get('/api/admin/orders/:code', {preHandler:requireAdmin}, async(req,reply)=>{
    const parsed=identifier.safeParse(req.params);
    if(!parsed.success)return reply.code(400).send({error:'Código inválido'});
    const client=await pool.connect();
    try{const data=await getOrder(client,parsed.data.code);return data?{data}:reply.code(404).send({error:'Pedido inexistente'});}finally{client.release();}
  });
  app.post('/api/admin/orders/:code/items', {preHandler:requireAdmin}, async(req,reply)=>{
    const id=identifier.safeParse(req.params), body=itemBody.safeParse(req.body);
    if(!id.success||!body.success)return reply.code(400).send({error:'Datos inválidos',details:body.success?undefined:body.error.flatten()});
    const b=body.data, client=await pool.connect();
    try{
      await client.query('BEGIN');
      const order=await client.query('SELECT * FROM orders WHERE tracking_code=$1 AND deleted_at IS NULL FOR UPDATE',[id.data.code]);
      if(!order.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Pedido inexistente'});}
      const o=order.rows[0];
      if(['delivered','cancelled'].includes(o.status)){await client.query('ROLLBACK');return reply.code(409).send({error:'No se puede editar un pedido entregado o cancelado'});}
      const variant=await client.query(`SELECT v.id,v.stock,p.retail_price,p.active FROM product_variants v JOIN products p ON p.id=v.product_id
        WHERE p.code=$1 AND lower(v.color)=lower($2) AND lower(v.size)=lower($3)`,[b.product_code,b.color,b.size]);
      if(!variant.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Código, color o talle inexistente'});}
      const v=variant.rows[0];
      const previous=await client.query('SELECT * FROM order_items WHERE order_id=$1 AND variant_id=$2',[o.id,v.id]);
      const old=previous.rowCount?Number(previous.rows[0].quantity):0;
      const next=b.operation==='add'?old+b.quantity:b.operation==='subtract'?old-b.quantity:b.operation==='set'?b.quantity:0;
      if(next<0){await client.query('ROLLBACK');return reply.code(409).send({error:'No se pueden restar más unidades de las cargadas',current_quantity:old});}
      const available=Number(v.stock);
      // Nunca cambia el stock físico: una excepción sólo autoriza el faltante en el pedido.
      if(next>available&&!b.allow_shortage){await client.query('ROLLBACK');return reply.code(409).send({error:'STOCK_INSUFICIENTE',available_stock:available,requested_quantity:next,shortage:next-available,requires_confirmation:true});}
      if(next===0)await client.query('DELETE FROM order_items WHERE order_id=$1 AND variant_id=$2',[o.id,v.id]);
      else await client.query(`INSERT INTO order_items(order_id,variant_id,quantity,shortage_authorized,unit_price)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity,
        shortage_authorized=EXCLUDED.shortage_authorized`,[o.id,v.id,next,next>available,Number(v.retail_price)]);
      await client.query('UPDATE orders SET updated_at=NOW() WHERE id=$1',[o.id]);
      await event(client,o.id,b.seller_key,'item_changed',{variant_id:v.id,operation:b.operation,previous:old,next,stock_at_edit:available,shortage_authorized:next>available});
      const result=await getOrder(client,id.data.code);
      await client.query('COMMIT');return {data:result};
    }catch(e){await client.query('ROLLBACK');app.log.error(e);return reply.code(500).send({error:'No se pudo modificar el pedido'});}finally{client.release();}
  });
  app.post('/api/admin/orders/:code/finish', {preHandler:requireAdmin}, async(req,reply)=>{
    const id=identifier.safeParse(req.params), body=context.safeParse(req.body);
    if(!id.success||!body.success)return reply.code(400).send({error:'Datos inválidos'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const o=await client.query('SELECT * FROM orders WHERE tracking_code=$1 AND deleted_at IS NULL FOR UPDATE',[id.data.code]);
      if(!o.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Pedido inexistente'});}
      if(o.rows[0].status!=='draft'){await client.query('ROLLBACK');return reply.code(409).send({error:'El pedido ya fue finalizado'});}
      const n=await client.query('SELECT COUNT(*)::int AS n FROM order_items WHERE order_id=$1',[o.rows[0].id]);
      if(!n.rows[0].n){await client.query('ROLLBACK');return reply.code(409).send({error:'No se puede finalizar un pedido vacío'});}
      await client.query("UPDATE orders SET status='registered',finalized_at=NOW(),updated_at=NOW() WHERE id=$1",[o.rows[0].id]);
      await event(client,o.rows[0].id,body.data.seller_key,'finished',{});
      const data=await getOrder(client,id.data.code);
      await client.query('COMMIT');return {data};
    }catch(e){await client.query('ROLLBACK');app.log.error(e);return reply.code(500).send({error:'No se pudo finalizar el pedido'});}finally{client.release();}
  });
  // Actualiza el estado del pedido completo, sin modificar stock físico.
  app.patch('/api/admin/orders/:code/status', {preHandler:requireAdmin}, async(req,reply)=>{
    const id=identifier.safeParse(req.params);
    const body=z.object({
      seller_key:seller,
      status:z.enum(['registered','preparing','ready','delivered'])
    }).safeParse(req.body);
    if(!id.success||!body.success)return reply.code(400).send({error:'Datos inválidos'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const result=await client.query('SELECT id,status FROM orders WHERE tracking_code=$1 AND deleted_at IS NULL FOR UPDATE',[id.data.code]);
      if(!result.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Pedido inexistente'});}
      const current=result.rows[0].status as string;
      const next=body.data.status;
      if(current==='draft'||current==='cancelled'){
        await client.query('ROLLBACK');
        return reply.code(409).send({error:'No se puede cambiar el estado de un borrador o pedido cancelado'});
      }
      if(current==='delivered'&&next!=='delivered'){
        await client.query('ROLLBACK');
        return reply.code(409).send({error:'Un pedido entregado no puede reabrirse desde esta operación'});
      }
      if(current!==next){
        await client.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2',[next,result.rows[0].id]);
        await event(client,result.rows[0].id,body.data.seller_key,'status_changed',{previous:current,next});
      }
      const data=await getOrder(client,id.data.code);
      await client.query('COMMIT');
      return {data};
    }catch(e){
      await client.query('ROLLBACK');app.log.error(e);
      return reply.code(500).send({error:'No se pudo cambiar el estado del pedido'});
    }finally{client.release();}
  });

  app.delete('/api/admin/orders/:code', {preHandler:requireAdmin}, async(req,reply)=>{
    const id=identifier.safeParse(req.params);
    const body=z.object({confirmation:z.literal('ELIMINAR'),actor:z.string().trim().min(1).max(100)}).safeParse(req.body);
    if(!id.success||!body.success)return reply.code(400).send({error:'Confirmación inválida'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const found=await client.query('SELECT id,deleted_at FROM orders WHERE tracking_code=$1 FOR UPDATE',[id.data.code]);
      if(!found.rowCount||found.rows[0].deleted_at){await client.query('ROLLBACK');return reply.code(404).send({error:'Pedido inexistente o eliminado'});}
      await event(client,found.rows[0].id,body.data.actor,'deleted',{tracking_code:id.data.code});
      await client.query('UPDATE orders SET deleted_at=NOW(),updated_at=NOW() WHERE id=$1',[found.rows[0].id]);
      await client.query('COMMIT');return {data:{tracking_code:id.data.code,deleted:true}};
    }catch(e){await client.query('ROLLBACK');app.log.error(e);return reply.code(500).send({error:'No se pudo eliminar el pedido'});}finally{client.release();}
  });

  app.get('/api/admin/orders/:code/history',{preHandler:requireAdmin},async(req,reply)=>{
    const id=identifier.safeParse(req.params);
    if(!id.success)return reply.code(400).send({error:'Código inválido'});
    const r=await pool.query('SELECT e.* FROM order_events e JOIN orders o ON o.id=e.order_id WHERE o.tracking_code=$1 ORDER BY e.created_at,e.id',[id.data.code]);
    return {data:r.rows};
  });
}
