'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './orders.module.css';

type Order={id:string;tracking_code:string;seller_key:string;status:string;created_at:string;customer_name_snapshot?:string|null;delivery_method?:string|null};
const labels:Record<string,string>={draft:'En construcción',registered:'Registrado',preparing:'En preparación',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'};
export default function OrdersDashboard(){
 const router=useRouter();const [orders,setOrders]=useState<Order[]>([]);const [search,setSearch]=useState('');const [status,setStatus]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [creating,setCreating]=useState(false);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const r=await fetch('/api/admin/orders'+(status?'?status='+encodeURIComponent(status):''),{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No se pudieron cargar los pedidos');setOrders(j.data||[]);}catch(e){setError(e instanceof Error?e.message:'Error al cargar pedidos');}finally{setLoading(false)}},[status]);
 useEffect(()=>{void load()},[load]);
 async function openNewOrder(){
  if(creating)return;
  setCreating(true);setError('');
  try{
   const r=await fetch('/api/admin/orders/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seller_key:'admin'})});
   const j=await r.json();
   if(!r.ok)throw new Error(typeof j.error==='string'?j.error:'No se pudo abrir el pedido');
   if(!j.data?.tracking_code)throw new Error('La API no devolvió el código del pedido');
   router.push('/admin/pedidos/'+encodeURIComponent(j.data.tracking_code));
  }catch(e){setError(e instanceof Error?e.message:'No se pudo abrir el pedido');setCreating(false)}
 }
 const filtered=orders.filter(o=>(o.tracking_code+' '+(o.customer_name_snapshot||'')).toLowerCase().includes(search.toLowerCase()));
 const count=(s:string)=>orders.filter(o=>o.status===s).length;
 return <main className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>ADMINISTRACIÓN</p><h1>Pedidos</h1><p>Consultá y gestioná los pedidos registrados desde la web o WhatsApp.</p></div><button type="button" className={styles.primaryLink} disabled={creating} onClick={()=>void openNewOrder()}>{creating?"Abriendo pedido…":"+ Nuevo pedido"}</button></header>
 {error&&<p className={styles.error} role="alert">{error}</p>}
 <div className={styles.kpis}>{[['En construcción',count('draft')],['Registrados',count('registered')],['En preparación',count('preparing')],['Listos',count('ready')]].map(([name,value])=><div className={styles.kpi} key={name}><strong>{value}</strong><span>{name}</span></div>)}</div>
 <section className={styles.panel}><div className={styles.sectionHeader}><h2>Pedidos registrados</h2><button type="button" className={styles.secondary} onClick={()=>void load()} disabled={loading}>{loading?'Actualizando…':'Actualizar'}</button></div>
 <div className={styles.filtersRow}><label>Buscar por código o cliente<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="PED-000001" /></label><label>Estado<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label></div>
 <div className={styles.tableScroll}><table><thead><tr><th>Código</th><th>Cliente</th><th>Entrega</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td><strong>{o.tracking_code}</strong></td><td>{o.customer_name_snapshot||'Sin asignar'}</td><td>{o.delivery_method==='shipping'?'Envío':o.delivery_method==='pickup'?'Retiro':'Sin definir'}</td><td>{new Date(o.created_at).toLocaleDateString('es-AR')}</td><td>{labels[o.status]||o.status}</td><td><button className={styles.tableButton} onClick={()=>router.push('/admin/pedidos/'+encodeURIComponent(o.tracking_code))}>Ver pedido →</button></td></tr>)}</tbody></table></div>
 {!filtered.length&&<p className={styles.muted}>No hay pedidos para mostrar.</p>}<p className={styles.muted}>Se muestran hasta 200 pedidos según el límite actual del backend. Los indicadores corresponden a los pedidos cargados en esta vista.</p></section></main>;
}
