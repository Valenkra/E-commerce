'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

type Product = { id: string; active: boolean; name?: string; code?: string; variants?: { stock: number; size?: string; color?: string }[] };
type Order = { id: string; tracking_code: string; status: string; created_at: string; customer_name?: string | null; customer_full_name?: string | null; full_name?: string | null; delivery_method?: string | null; fulfillment_method?: string | null; deleted_at?: string | null };
type Customer = { id: string; full_name: string };
type Data = { products: Product[] | null; orders: Order[] | null; customers: Customer[] | null };
const statusLabel: Record<string, string> = { draft: 'Borrador', registered: 'Pendiente', preparing: 'En preparación', ready: 'Listo', delivered: 'Entregado', cancelled: 'Cancelado' };
const money = (value: number) => value.toLocaleString('es-AR');

async function getData<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'No se pudieron cargar los datos');
  if (!Array.isArray(body.data)) throw new Error('Respuesta inesperada del servidor');
  return body.data as T[];
}

export default function DashboardClient() {
  const [data, setData] = useState<Data>({ products: null, orders: null, customers: null });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockThreshold, setStockThreshold] = useState(3);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { const r = await fetch('/api/admin/settings',{cache:'no-store'}); if(r.ok) {const j=await r.json(); setStockThreshold(Number(j.data?.low_stock_threshold ?? 3));} } catch {}
    const results = await Promise.allSettled([
      getData<Product>('/api/admin/products'),
      getData<Order>('/api/admin/orders'),
      getData<Customer>('/api/admin/customers'),
    ]);
    setData({
      products: results[0].status === 'fulfilled' ? results[0].value : null,
      orders: results[1].status === 'fulfilled' ? results[1].value : null,
      customers: results[2].status === 'fulfilled' ? results[2].value : null,
    });
    setErrors(results.flatMap((result, i) => result.status === 'rejected' ? [`${['Productos', 'Pedidos', 'Clientes'][i]}: ${result.reason instanceof Error ? result.reason.message : 'Error de conexión'}`] : []));
    setLoading(false);
    setRefreshing(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const orders = useMemo(() => (data.orders ?? []).filter(o => !o.deleted_at), [data.orders]);
  const pending = orders.filter(o => o.status === 'registered');
  const preparing = orders.filter(o => o.status === 'preparing');
  const ready = orders.filter(o => o.status === 'ready');
  const actionable = orders.filter(o => ['registered', 'preparing', 'ready'].includes(o.status)).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(0, 6);
  const activeProducts = (data.products ?? []).filter(p => p.active);
  const stock = activeProducts.reduce((total, p) => total + (p.variants ?? []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0), 0);
  const lowStock = activeProducts.flatMap(p => (p.variants ?? []).filter(v => Number(v.stock) <= stockThreshold).map(v => ({ name: p.name ?? p.code ?? 'Producto', code: p.code, color: v.color, size: v.size, stock: Number(v.stock) || 0 }))).sort((a, b) => a.stock - b.stock).slice(0, 5);
  const stats = [
    { title: 'Pedidos pendientes', value: data.orders ? pending.length : null, hint: 'Esperando preparación', href: '/admin/pedidos', tone: 'attention' },
    { title: 'En preparación', value: data.orders ? preparing.length : null, hint: 'Pedidos en curso', href: '/admin/pedidos', tone: 'normal' },
    { title: 'Listos para entregar', value: data.orders ? ready.length : null, hint: 'Requieren seguimiento', href: '/admin/pedidos', tone: 'normal' },
    { title: 'Clientes registrados', value: data.customers ? data.customers.length : null, hint: 'En tu base de clientes', href: '/admin/clientes', tone: 'normal' },
  ];
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>PANEL DE ADMINISTRACIÓN</span><h1>Buen día, ¿qué hacemos hoy?</h1><p>Tu tienda de un vistazo. Priorizá pedidos y detectá lo que necesita atención.</p></div>
      <button className={styles.refresh} type="button" onClick={() => void load()} disabled={refreshing}>{refreshing ? 'Actualizando…' : '↻ Actualizar'}</button>
    </header>
    {errors.length > 0 && <div role="alert" className={styles.alert}>Algunos datos no pudieron cargarse: {errors.join(' · ')}</div>}
    <section className={styles.stats} aria-label="Indicadores principales">{stats.map(s => <Link key={s.title} href={s.href} className={`${styles.stat} ${s.tone === 'attention' ? styles.statAttention : ''}`}><span className={styles.statTitle}>{s.title}</span><strong>{s.value === null ? '—' : money(s.value)}</strong><span className={styles.statHint}>{s.hint} <span aria-hidden>↗</span></span></Link>)}</section>
    <div className={styles.columns}>
      <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>PRIORIDAD</span><h2>Pedidos que requieren atención</h2><p>Primero los más antiguos, para que no se te escape ninguno.</p></div><Link href="/admin/pedidos" className={styles.textLink}>Ver pedidos →</Link></div>
        {data.orders === null ? <p className={styles.empty}>No se pudieron consultar los pedidos.</p> : actionable.length === 0 ? <p className={styles.empty}>¡Todo al día! No hay pedidos pendientes, en preparación ni listos.</p> : <div className={styles.orderList}>{actionable.map(o => <Link className={styles.orderRow} href={`/admin/pedidos/${encodeURIComponent(o.tracking_code)}`} key={o.id || o.tracking_code}><div className={styles.orderInfo}><strong>{o.tracking_code}</strong><span>{o.customer_name || o.customer_full_name || o.full_name || 'Cliente sin identificar'} · {new Date(o.created_at).toLocaleDateString('es-AR')}</span></div><span className={`${styles.status} ${styles['status_' + o.status] || ''}`}>{statusLabel[o.status] || o.status}</span><span className={styles.arrow}>→</span></Link>)}</div>}
      </section>
      <aside className={styles.side}>
        <section className={styles.inventory}><span className={styles.eyebrow}>INVENTARIO</span><h2>Estado del catálogo</h2><div className={styles.inventoryMetrics}><div><strong>{data.products ? money(activeProducts.length) : '—'}</strong><span>Productos activos</span></div><div><strong>{data.products ? money(stock) : '—'}</strong><span>Unidades físicas</span></div></div><Link href="/admin/inventario" className={styles.inventoryLink}>Ver inventario →</Link></section>
      </aside>
    </div>
    <section className={styles.panel}><div className={styles.panelHeader}><div><span className={styles.eyebrow}>CONTROL DE STOCK</span><h2>Variantes con poco stock</h2><p>Se muestran variantes activas con {stockThreshold} unidades o menos.</p></div><Link href="/admin/inventario" className={styles.textLink}>Ir al inventario →</Link></div>{data.products === null ? <p className={styles.empty}>No se pudo consultar el catálogo.</p> : lowStock.length === 0 ? <p className={styles.empty}>No hay variantes activas con stock bajo.</p> : <div className={styles.lowList}>{lowStock.map((v, i) => <div className={styles.lowRow} key={`${v.code}-${v.color}-${v.size}-${i}`}><div><strong>{v.name}</strong><span>{[v.code, v.color, v.size].filter(Boolean).join(' · ')}</span></div><span className={v.stock === 0 ? styles.outOfStock : styles.lowCount}>{v.stock === 0 ? 'Sin stock' : `${v.stock} disponibles`}</span></div>)}</div>}</section>
    <p className={styles.footnote}>Datos operativos de productos, pedidos y clientes. No se muestran ingresos ni ventas estimadas como ventas reales.{loading ? ' Cargando…' : ''}</p>
  </main>;
}
