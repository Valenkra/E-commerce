import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import OrdersDashboard from './OrdersDashboard';
export default async function Page(){if(!(await isAdmin()))redirect('/admin/login');return <OrdersDashboard/>}
