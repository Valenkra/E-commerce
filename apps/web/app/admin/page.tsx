import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';

export default async function AdminHome() {
  if (!(await isAdmin())) redirect('/admin/login');
  redirect('/admin/dashboard');
}
