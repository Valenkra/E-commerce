import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <DashboardClient />;
}
