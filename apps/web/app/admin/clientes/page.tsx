import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import CustomersDashboard from './CustomersDashboard';
export default async function Page(){if(!(await isAdmin()))redirect('/admin/login');return <CustomersDashboard/>}
