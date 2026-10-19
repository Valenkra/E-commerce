import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {z} from 'zod';

const app=Fastify({logger:true,bodyLimit:12*1024*1024});
const env=process.env;
const db=env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}):null;
const publicDb=env.SUPABASE_URL&&env.SUPABASE_ANON_KEY?createClient(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,{auth:{persistSession:false}}):null;
const productQuery=z.object({q:z.string().max(120).optional(),category:z.string().max(80).optional(),subtype:z.string().max(80).optional(),limit:z.coerce.number().int().min(1).max(100).default(24),page:z.coerce.number().int().min(1).default(1)});
const productInput=z.object({code:z.string().min(1).max(80),slug:z.string().min(1).max(150),name:z.string().min(2).max(200),category:z.string().min(1),subtype:z.string().default(''),description:z.string().default(''),retail_price:z.number().nonnegative(),wholesale_price:z.number().nonnegative(),wholesale_min_qty:z.number().int().positive().default(6),active:z.boolean().default(false)});

async function admin(request:any,reply:any){if(!db||!publicDb)return reply.code(503).send({error:'Supabase no configurado'});const token=request.headers.authorization?.replace(/^Bearer\s+/i,'');if(!token)return reply.code(401).send({error:'Token requerido'});const {data:{user},error}=await publicDb.auth.getUser(token);if(error||!user)return reply.code(401).send({error:'Sesión inválida'});const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='admin')return reply.code(403).send({error:'Permisos insuficientes'});request.userId=user.id;}

async function start(){
await app.register(cors,{origin:env.WEB_ORIGIN?.split(',')||['http://localhost:3000']});
await app.register(multipart,{limits:{fileSize:10*1024*1024,files:1}});
app.get('/health',async()=>({ok:true,service:'lenceria-api',database:!!db}));
app.get('/api/products',async(request,reply)=>{const parsed=productQuery.safeParse(request.query);if(!parsed.success)return reply.code(400).send({error:parsed.error.flatten()});if(!db)return reply.code(503).send({error:'Supabase no configurado'});const {q,category,subtype,limit,page}=parsed.data;let query=db.from('products').select('id,slug,code,name,category,subtype,description,retail_price,wholesale_price,wholesale_min_qty,colors,sizes,stock,image,active',{count:'exact'}).eq('active',true);if(category)query=query.eq('category',category);if(subtype)query=query.eq('subtype',subtype);if(q)query=query.or(`name.ilike.%${q.replace(/[,%()]/g,'')}%,code.ilike.%${q.replace(/[,%()]/g,'')}%`);const {data,error,count}=await query.order('name').range((page-1)*limit,page*limit-1);if(error)return reply.code(500).send({error:'No se pudo consultar productos'});return {data,total:count,page,limit};});
app.get('/api/categories',async(_request,reply)=>{if(!db)return reply.code(503).send({error:'Supabase no configurado'});const {data,error}=await db.from('products').select('category,subtype').eq('active',true);if(error)return reply.code(500).send({error:'Error de categorías'});return {data:[...new Set((data||[]).map(p=>p.category))].map(category=>({category,subtypes:[...new Set((data||[]).filter(p=>p.category===category).map(p=>p.subtype))]}))};});
app.post('/api/admin/products',{preHandler:admin},async(request,reply)=>{const p=productInput.safeParse(request.body);if(!p.success)return reply.code(400).send({error:p.error.flatten()});const {data,error}=await db!.from('products').insert(p.data).select().single();if(error)return reply.code(409).send({error:error.message});return reply.code(201).send({data});});
app.post('/api/admin/images',{preHandler:admin},async(request,reply)=>{const file=await request.file();if(!file)return reply.code(400).send({error:'Falta archivo'});if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))return reply.code(415).send({error:'Solo JPG, PNG o WebP; PDF pendiente de importador'});const input=await file.toBuffer();const metadata=await sharp(input).metadata();if((metadata.width||0)*(metadata.height||0)>35_000_000)return reply.code(413).send({error:'Imagen demasiado grande'});const output=await sharp(input).rotate().resize({width:1200,height:1500,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();const key=`processed/${crypto.randomUUID()}.webp`;const {error}=await db!.storage.from('product-images').upload(key,output,{contentType:'image/webp',upsert:false});if(error)return reply.code(500).send({error:'No se pudo guardar la imagen'});const {data}=db!.storage.from('product-images').getPublicUrl(key);return reply.code(201).send({url:data.publicUrl,path:key,requiresReview:true,originalPreserved:false});});
app.post('/api/admin/imports',{preHandler:admin},async(_request,reply)=>reply.code(501).send({error:'La extracción de productos desde PDF y el borrado con IA requieren configurar el procesador de importaciones; no se publican automáticamente'}));
app.post('/api/admin/orders',{preHandler:admin},async(_request,reply)=>reply.code(501).send({error:'Pedidos transaccionales pendientes: no se descuenta stock sin función SQL atómica'}));
app.post('/webhooks/whatsapp',async(_request,reply)=>reply.code(503).send({error:'Webhook inactivo hasta configurar verificación de firma y Cloud API'}));
app.get('/webhooks/whatsapp',async(request,reply)=>{const q=request.query as Record<string,string>;if(env.WHATSAPP_VERIFY_TOKEN&&q['hub.mode']==='subscribe'&&q['hub.verify_token']===env.WHATSAPP_VERIFY_TOKEN)return reply.type('text/plain').send(q['hub.challenge']);return reply.code(403).send('Forbidden');});
await app.listen({port:Number(env.PORT||4000),host:'0.0.0.0'});
}
start().catch(error=>{app.log.error(error);process.exit(1)});
