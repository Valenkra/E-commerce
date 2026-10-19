import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import OrderEditor from '../OrderEditor';
export default async function Page({params}:{params:Promise<{codigo:string}>}){if(!(await isAdmin()))redirect('/admin/login');const {codigo}=await params;return <OrderEditor code={codigo}/>}
