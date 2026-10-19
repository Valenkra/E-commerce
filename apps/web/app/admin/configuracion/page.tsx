import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import SettingsClient from './SettingsClient';
export default async function Page(){if(!(await isAdmin()))redirect('/admin/login');return <SettingsClient/>}
