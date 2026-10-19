import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import Link from 'next/link';

export default async function Page() {
  if (!(await isAdmin())) redirect('/admin/login');
  return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>Reportes</h1>
    <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e1e8f0', borderRadius: 16, padding: 30 }}>
      <strong style={{ color: '#173b75' }}>Próximamente</strong>
      <p style={{ color: '#65758a', lineHeight: 1.6 }}>Los reportes estarán disponibles cuando tengamos datos de ventas y pedidos.</p>
      <Link href="/admin/productos">Ir a Productos →</Link>
    </div>
  </div>;
}
