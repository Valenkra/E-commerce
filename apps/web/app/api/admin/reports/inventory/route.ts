import {isAdmin} from '@/lib/admin-auth';
export async function GET(request:Request){
 if(!await isAdmin())return Response.json({error:'No autorizado'},{status:401});
 const url=new URL(request.url);const params=new URLSearchParams();
 for(const key of ['from','to']){const value=url.searchParams.get(key);if(value)params.set(key,value);}
 const origin=process.env.API_URL||process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
 try{const response=await fetch(`${origin}/api/admin/reports/inventory?${params}`,{headers:{Authorization:`Bearer ${process.env.LOCAL_ADMIN_TOKEN||''}`},cache:'no-store'});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}});
 }catch{return Response.json({error:'No se pudo conectar con el backend'},{status:502});}
}
