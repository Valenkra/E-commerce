import {isAdmin,sameOrigin} from '@/lib/admin-auth';
const base=()=>process.env.API_BASE_URL||process.env.API_URL||'http://127.0.0.1:4000';
async function proxy(request:Request,ctx:{params:Promise<{path:string[]}>}){
 if(!await isAdmin())return Response.json({error:'No autorizado'},{status:401});
 if(request.method!=='GET'&&!sameOrigin(request))return Response.json({error:'Origen inválido'},{status:403});
 const {path}=await ctx.params;if(!path?.length||path.some(p=>!/^[a-zA-Z0-9-]+$/.test(p)))return Response.json({error:'Ruta inválida'},{status:400});
 const u=new URL(request.url);const dest=`${base()}/api/admin/customers/${path.join('/')}${u.search}`;
 try{const r=await fetch(dest,{method:request.method,headers:{Authorization:`Bearer ${process.env.LOCAL_ADMIN_TOKEN||''}`,...(request.method==='GET'?{}:{'Content-Type':'application/json'})},body:request.method==='GET'?undefined:await request.text(),cache:'no-store'});return new Response(await r.text(),{status:r.status,headers:{'Content-Type':'application/json'}})}catch{return Response.json({error:'API no disponible'},{status:502})}
}
export {proxy as GET,proxy as POST,proxy as PATCH};
