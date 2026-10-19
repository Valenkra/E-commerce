'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Product = { id: string; active: boolean; variants: { stock: number }[] };
export default function DashboardClient() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/admin/products', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los datos');
        if (!cancelled) setProducts(data.data ?? []);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Error de conexión'); }
    })();
    return () => { cancelled = true; };
  }, []);
  const active = products?.filter(p => p.active).length ?? 0;
  const inactive = products?.filter(p => !p.active).length ?? 0;
  const stock = products?.filter(p => p.active).reduce((sum, p) => sum + p.variants.reduce((s, v) => s + v.stock, 0), 0) ?? 0;
  const card = { background: '#fff', border: '1px solid #e1e8f0', borderRadius: 10, padding: 18, boxShadow: '0 1px 5px rgba(28,54,85,.035)' };
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 12px' }}>
    <div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 21, fontWeight: 600, margin: 0 }}>Dashboard</h1><p style={{ color: '#65758a', marginTop: 5 }}>Resumen de tu tienda en tiempo real</p></div>
    {error && <p role="alert" style={{ color: '#a12626' }}>{error}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
      {[{ label: 'Productos activos', value: active }, { label: 'Productos inactivos', value: inactive }, { label: 'Unidades en stock', value: stock }, { label: 'Total de productos', value: products?.length ?? 0 }].map(item => <div key={item.label} style={card}><p style={{ color: '#65758a', margin: '0 0 8px', fontSize: 12 }}>{item.label}</p><strong style={{ fontSize: 22, fontWeight: 600, color: '#173b75' }}>{products ? item.value.toLocaleString('es-AR') : '—'}</strong></div>)}
    </div>
    <div style={{ ...card, marginTop: 16 }}><h2 style={{ marginTop: 0, fontSize: 16 }}>Accesos rápidos</h2><p style={{ color: '#65758a' }}>Gestioná tu catálogo, precios, variantes y stock.</p><Link href="/admin/productos" style={{ display: 'inline-block', background: '#173b75', color: '#fff', textDecoration: 'none', padding: '9px 13px', borderRadius: 7, marginTop: 6 }}>Administrar productos →</Link></div>
    <p style={{ marginTop: 18, color: '#65758a', fontSize: 13 }}>Los indicadores de pedidos y ventas se incorporarán cuando esas funcionalidades estén disponibles.</p>
  </div>;
}
