import {redirect} from 'next/navigation';
import {isAdmin} from '@/lib/admin-auth';
import ProductManager from './ProductManager';
export default async function AdminProducts(){if(!await isAdmin())redirect('/admin/login');return <ProductManager/>}
