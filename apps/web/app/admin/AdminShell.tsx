'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './admin-shell.module.css';

const sections = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/productos', label: 'Productos', icon: 'products' },
  { href: '/admin/inventario', label: 'Inventario', icon: 'inventory' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: 'orders' },
  { href: '/admin/clientes', label: 'Clientes', icon: 'clients' },
  { href: '/admin/reportes', label: 'Reportes', icon: 'reports' },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'settings' },
] as const;

type IconName = typeof sections[number]['icon'] | 'logout' | 'store';
function Icon({ name }: { name: IconName }) {
  const common = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    inventory: <><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/></>,
    orders: <><path d="M4 7h16l-1.5 13h-13L4 7ZM9 9V6a3 3 0 0 1 6 0v3"/></>,
    clients: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/></>,
    images: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5L5 21"/></>,
    reports: <><path d="M4 20V11M10 20V4M16 20v-7M22 20V8"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l-1.8 1.8a1.6 1.6 0 0 0-1.8-.3l-1 .4a1.6 1.6 0 0 0-1 1.5H11a1.6 1.6 0 0 0-1-1.5l-1-.4a1.6 1.6 0 0 0-1.8.3l-1.8-1.8a1.6 1.6 0 0 0 .3-1.8l-.4-1A1.6 1.6 0 0 0 3.8 13v-2a1.6 1.6 0 0 0 1.5-1l.4-1a1.6 1.6 0 0 0-.3-1.8l1.8-1.8a1.6 1.6 0 0 0 1.8.3l1-.4A1.6 1.6 0 0 0 11 3.8h2a1.6 1.6 0 0 0 1 1.5l1 .4a1.6 1.6 0 0 0 1.8-.3l1.8 1.8a1.6 1.6 0 0 0-.3 1.8l.4 1a1.6 1.6 0 0 0 1.5 1v2a1.6 1.6 0 0 0-1.5 1l-.3 1Z"/></>,
    logout: <><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"/></>,
    store: <><path d="M3 10 5 4h14l2 6M3 10v10h18V10M9 20v-7h6v7"/><path d="M3 10c0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0 0 3 4 3 4 0"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // El login no debe mostrar la navegación administrativa.
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return <>{children}</>;
  async function logout() {
    try { await fetch('/api/admin/logout', { method: 'POST' }); }
    finally { router.replace('/admin/login'); router.refresh(); }
  }
  return <div className={styles.shell}>
    <aside className={styles.sidebar} aria-label="Menú de administración">
      <Link href="/admin/dashboard" className={styles.brand}><span className={styles.brandIcon}><Icon name="store" /></span><span><strong>Mi tienda</strong><small>ADMINISTRACIÓN</small></span></Link>
      <div className={styles.sectionTitle}>GESTIÓN</div>
      <nav className={styles.navigation} aria-label="Secciones">
        {sections.map(section => {
          const active = pathname === section.href || pathname.startsWith(section.href + '/');
          return <Link key={section.href} href={section.href} className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon name={section.icon}/><span>{section.label}</span>
          </Link>;
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <Link className={styles.navItem} href="/catalogo"><Icon name="store"/><span>Ver tienda</span></Link>
        <button className={styles.navItem} type="button" onClick={logout}><Icon name="logout"/><span>Cerrar sesión</span></button>
      </div>
    </aside>
    <div className={styles.content}><main className={styles.main}>{children}</main></div>
  </div>;
}
