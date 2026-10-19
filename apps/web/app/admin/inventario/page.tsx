import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import InventoryManager from './InventoryManager';
export default async function Page(){if(!await isAdmin())redirect('/admin/login');return <InventoryManager/>;}
