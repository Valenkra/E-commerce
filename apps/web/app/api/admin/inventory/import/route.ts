import {isAdmin,sameOrigin} from '@/lib/admin-auth';
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'No autorizado'},{status:401});
 if(!sameOrigin(request))return Response.json({error:'Origen no autorizado'},{status:403});
 const origin=process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
 const response=await fetch(`${origin}/api/admin/inventory/import`,{method:'POST',headers:{Authorization:`Bearer ${process.env.LOCAL_ADMIN_TOKEN||''}`,'Content-Type':'application/json'},body:await request.text(),cache:'no-store'});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}});
}
