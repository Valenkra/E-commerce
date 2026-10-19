import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {z} from 'zod';

type Auth=(request:any,reply:any)=>Promise<unknown>;
const address=z.object({street:z.string().trim().min(3).max(250),locality:z.string().trim().min(2).max(150),postal_code:z.string().trim().max(20).optional().default(''),notes:z.string().trim().max(500).optional().default('')});
const customer=z.object({full_name:z.string().trim().min(2).max(200),phone:z.string().trim().max(40).optional().default('')});
const id=z.object({id:z.string().uuid()});
const orderCode=z.object({code:z.string().regex(/^PED-\d{6,}$/)});
export function registerCustomersRoutes(app:FastifyInstance,pool:Pool,requireAdmin:Auth){
 app.get('/api/admin/customers',{preHandler:requireAdmin},async(req,reply)=>{
  const q=z.object({q:z.string().trim().max(100).optional().default(''),limit:z.coerce.number().int().min(1).max(50).default(20)}).safeParse(req.query);
  if(!q.success)return reply.code(400).send({error:'Búsqueda inválida'});
  const term=q.data.q.trim();
  const result=await pool.query(`SELECT c.*, (SELECT count(*)::int FROM orders o WHERE o.customer_id=c.id) AS orders_count FROM customers c WHERE $1='' OR c.full_name ILIKE '%'||$1||'%' OR coalesce(c.phone,'') ILIKE '%'||$1||'%' ORDER BY c.updated_at DESC LIMIT $2`,[term,q.data.limit]);
  return {data:result.rows};
 });
 app.post('/api/admin/customers',{preHandler:requireAdmin},async(req,reply)=>{
  const b=customer.safeParse(req.body);if(!b.success)return reply.code(400).send({error:'Datos de cliente inválidos'});
  const r=await pool.query('INSERT INTO customers(full_name,phone) VALUES($1,$2) RETURNING *',[b.data.full_name,b.data.phone||null]);return reply.code(201).send({data:r.rows[0]});
 });
 app.get('/api/admin/customers/:id',{preHandler:requireAdmin},async(req,reply)=>{
  const p=id.safeParse(req.params);if(!p.success)return reply.code(400).send({error:'ID inválido'});
  const c=await pool.query('SELECT * FROM customers WHERE id=$1',[p.data.id]);if(!c.rowCount)return reply.code(404).send({error:'Cliente inexistente'});
  const [addresses,orders]=await Promise.all([pool.query('SELECT * FROM customer_addresses WHERE customer_id=$1 ORDER BY created_at DESC',[p.data.id]),pool.query('SELECT tracking_code,status,created_at,delivery_method FROM orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100',[p.data.id])]);
  return {data:{...c.rows[0],addresses:addresses.rows,orders:orders.rows}};
 });
 app.patch('/api/admin/customers/:id',{preHandler:requireAdmin},async(req,reply)=>{
  const p=id.safeParse(req.params),b=customer.safeParse(req.body);if(!p.success||!b.success)return reply.code(400).send({error:'Datos inválidos'});
  const r=await pool.query('UPDATE customers SET full_name=$1,phone=$2,updated_at=NOW() WHERE id=$3 RETURNING *',[b.data.full_name,b.data.phone||null,p.data.id]);return r.rowCount?{data:r.rows[0]}:reply.code(404).send({error:'Cliente inexistente'});
 });
 app.post('/api/admin/customers/:id/addresses',{preHandler:requireAdmin},async(req,reply)=>{
  const p=id.safeParse(req.params),b=address.safeParse(req.body);if(!p.success||!b.success)return reply.code(400).send({error:'Dirección inválida'});
  const r=await pool.query('INSERT INTO customer_addresses(customer_id,street,locality,postal_code,notes) SELECT id,$2,$3,$4,$5 FROM customers WHERE id=$1 RETURNING *',[p.data.id,b.data.street,b.data.locality,b.data.postal_code,b.data.notes]);return r.rowCount?reply.code(201).send({data:r.rows[0]}):reply.code(404).send({error:'Cliente inexistente'});
 });
 const delivery=z.object({customer_id:z.string().uuid(),delivery_method:z.enum(['pickup','shipping']),address_id:z.string().uuid().optional(),address:address.optional()}).superRefine((v,ctx)=>{if(v.delivery_method==='shipping'&&!v.address&&!v.address_id)ctx.addIssue({code:'custom',message:'El envío requiere dirección'});});
 app.patch('/api/admin/orders/:code/customer',{preHandler:requireAdmin},async(req,reply)=>{
  const p=orderCode.safeParse(req.params),b=delivery.safeParse(req.body);if(!p.success||!b.success)return reply.code(400).send({error:'Cliente o modalidad inválidos'});
  const client=await pool.connect();try{
   await client.query('BEGIN');
   const o=await client.query('SELECT id,status FROM orders WHERE tracking_code=$1 FOR UPDATE',[p.data.code]);if(!o.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Pedido inexistente'});}
   if(['delivered','cancelled'].includes(o.rows[0].status)){await client.query('ROLLBACK');return reply.code(409).send({error:'No se puede modificar un pedido cerrado'});}
   const c=await client.query('SELECT * FROM customers WHERE id=$1',[b.data.customer_id]);if(!c.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Cliente inexistente'});}
   let snapshot:null|{street:string;locality:string;postal_code:string;notes:string}=null;
   if(b.data.delivery_method==='shipping'){
    if(b.data.address_id){const a=await client.query('SELECT street,locality,postal_code,notes FROM customer_addresses WHERE id=$1 AND customer_id=$2',[b.data.address_id,b.data.customer_id]);if(!a.rowCount){await client.query('ROLLBACK');return reply.code(404).send({error:'Dirección no pertenece al cliente'});}snapshot=a.rows[0];}
    else if(b.data.address){snapshot=b.data.address;await client.query('INSERT INTO customer_addresses(customer_id,street,locality,postal_code,notes) VALUES($1,$2,$3,$4,$5)',[b.data.customer_id,snapshot.street,snapshot.locality,snapshot.postal_code,snapshot.notes]);}
   }
   await client.query('UPDATE orders SET customer_id=$1,customer_name_snapshot=$2,customer_phone_snapshot=$3,delivery_method=$4,delivery_address=$5,customer_name=$2,customer_phone=$3,updated_at=NOW() WHERE id=$6',[b.data.customer_id,c.rows[0].full_name,c.rows[0].phone,b.data.delivery_method,snapshot?JSON.stringify(snapshot):null,o.rows[0].id]);
   await client.query('INSERT INTO order_events(order_id,actor,event_type,details) VALUES($1,$2,$3,$4)',[o.rows[0].id,'admin','customer_delivery_changed',JSON.stringify({customer_id:b.data.customer_id,delivery_method:b.data.delivery_method,delivery_address:snapshot})]);
   await client.query('COMMIT');return {data:{customer_id:b.data.customer_id,delivery_method:b.data.delivery_method,delivery_address:snapshot}};
  }catch(e){await client.query('ROLLBACK');app.log.error(e);return reply.code(500).send({error:'No se pudo asociar el cliente'});}finally{client.release();}
 });
}
