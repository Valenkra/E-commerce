import {NextResponse} from 'next/server';
import {COOKIE_NAME,sameOrigin} from '@/lib/admin-auth';
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'Origen inválido'},{status:403});const response=NextResponse.json({ok:true});response.cookies.set({name:COOKIE_NAME,value:'',path:'/',maxAge:0});return response;}
