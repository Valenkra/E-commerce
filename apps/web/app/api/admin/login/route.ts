import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {adminCookie,createSession,sameOrigin} from '@/lib/admin-auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Origen inválido'},{status:403});
 const expected=process.env.ADMIN_PANEL_PASSWORD;
 if(!expected||expected.length<16)return NextResponse.json({error:'Configurá ADMIN_PANEL_PASSWORD (mínimo 16 caracteres)'},{status:503});
 const body=await request.json().catch(()=>null);
 const entered=typeof body?.password==='string'?body.password:'';
 const a=Buffer.from(expected),b=Buffer.from(entered);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Contraseña incorrecta'},{status:401});
 const response=NextResponse.json({ok:true});response.cookies.set(adminCookie(createSession()));return response;
}
