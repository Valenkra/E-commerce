import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import ReportsDashboard from './ReportsDashboard';
export default async function Page(){if(!(await isAdmin()))redirect('/admin/login');return <ReportsDashboard/>;}
