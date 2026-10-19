import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';

export const COOKIE_NAME='ecommerce_admin';
const EIGHT_HOURS=8*60*60;
function secret(){const s=process.env.ADMIN_SESSION_SECRET;if(!s||s.length<32)throw new Error('Configurá ADMIN_SESSION_SECRET con 32 caracteres o más');return s;}
function signature(payload:string){return createHmac('sha256',secret()).update(payload).digest('hex');}
export function createSession(){const expires=String(Math.floor(Date.now()/1000)+EIGHT_HOURS);return `${expires}.${signature(expires)}`;}
export async function isAdmin(){const value=(await cookies()).get(COOKIE_NAME)?.value||'';const [expires,mac,...extra]=value.split('.');if(extra.length||!expires||!mac||!/^[0-9]+$/.test(expires)||Number(expires)<Date.now()/1000)return false;const expected=Buffer.from(signature(expires));const actual=Buffer.from(mac);return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export function adminCookie(value:string){return {name:COOKIE_NAME,value,httpOnly:true,sameSite:'strict' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:EIGHT_HOURS};}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin)return false;try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}}
