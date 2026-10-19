'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import styles from './orders.module.css';
import CustomerAssignment from './CustomerAssignment';
type Variant={id:string;size:string;color:string;stock:number};
type Product={id:string;code:string;name:string;active:boolean;variants:Variant[]};
type Item={id:string;product_code:string;name:string;color:string;size:string;quantity:number;physical_stock:number;current_shortage:number;unit_price:number|null};
type Order={id:string;tracking_code:string;seller_key:string;status:string;items?:Item[];customer_id?:string|null;customer_name_snapshot?:string|null;delivery_method?:'pickup'|'shipping'|null;delivery_address?:{street:string;locality:string;postal_code:string;notes:string}|null};
type ApiError={error?:string;available_stock?:number;shortage?:number;requires_confirmation?:boolean};
const labels:Record<string,string>={draft:'En construcción',registered:'Registrado',preparing:'En preparación',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'};
async function api<T>(path:string,body?:unknown,method?:'POST'|'PATCH'):Promise<T>{const r=await fetch('/api/admin/orders'+path,{method:method||(body===undefined?'GET':'POST'),headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const j=await r.json();if(!r.ok)throw j as ApiError;return j.data as T;}
const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value);
const errorText=(e:unknown)=>(e as ApiError)?.error||'No se pudo completar la operación';
export default function OrderEditor({code}:{code?:string}){
 const router=useRouter();const [order,setOrder]=useState<Order|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [catalog,setCatalog]=useState<Product[]>([]);const [query,setQuery]=useState('');const [focused,setFocused]=useState(false);const [selectedCode,setSelectedCode]=useState('');const [color,setColor]=useState('');const [size,setSize]=useState('');const [quantity,setQuantity]=useState(1);const [operation,setOperation]=useState<'add'|'subtract'|'set'|'remove'>('add');
 const [selectedStatus,setSelectedStatus]=useState('');const [confirmDelete,setConfirmDelete]=useState(false);
 const [pending,setPending]=useState<{payload:Record<string,unknown>;available:number;shortage:number}|null>(null);
 const loadCatalog=useCallback(async()=>{try{const r=await fetch('/api/admin/products',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error al consultar catálogo');setCatalog(Array.isArray(j.data)?j.data:[]);}catch(e){setError(e instanceof Error?e.message:'Error de catálogo')}},[]);
 useEffect(()=>{
  if(code)return;
  let active=true;
  const controller=new AbortController();
  void (async()=>{
   setBusy(true);setError('');
   try{
    const r=await fetch('/api/admin/orders/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seller_key:'admin'}),signal:controller.signal});
    const j=await r.json();
    if(!r.ok)throw new Error(typeof j.error==='string'?j.error:'No se pudo iniciar el pedido');
    if(active)router.replace('/admin/pedidos/'+encodeURIComponent(j.data.tracking_code));
   }catch(e){if(active)setError(e instanceof Error?e.message:'No se pudo iniciar el pedido')}
   finally{if(active)setBusy(false)}
  })();
  return()=>{active=false;controller.abort()};
 },[code,router]);
 useEffect(()=>{void loadCatalog()},[loadCatalog]);
 useEffect(()=>{if(!code)return;let live=true;void api<Order>('/'+encodeURIComponent(code)).then(o=>{if(live){setOrder(o);setSelectedStatus(o.status)}}).catch(e=>{if(live)setError(errorText(e))});return()=>{live=false}},[code]);
 const chosen=catalog.find(p=>p.code===selectedCode&&p.active);const colors=[...new Set((chosen?.variants||[]).map(v=>v.color))];const variants=(chosen?.variants||[]).filter(v=>v.color===color);const variant=variants.find(v=>v.size===size);
 const existing=order?.items?.find(i=>i.product_code===selectedCode&&i.color.toLowerCase()===color.toLowerCase()&&i.size.toLowerCase()===size.toLowerCase())?.quantity||0;
 const target=operation==='add'?existing+quantity:operation==='subtract'?existing-quantity:operation==='remove'?0:quantity;
 const shortage=variant?Math.max(0,target-variant.stock):0;
 const matches=useMemo(()=>{const q=query.trim().toLocaleLowerCase();return q.length<2?[]:catalog.filter(p=>p.active&&(p.code+' '+p.name).toLocaleLowerCase().includes(q)).slice(0,8)},[catalog,query]);
 function select(p:Product){setSelectedCode(p.code);setQuery(p.code+' — '+p.name);setColor('');setSize('');setFocused(false);setPending(null)}
 async function save(allow_shortage=false,override?:Record<string,unknown>){if(!order)return;setBusy(true);setError('');setNotice('');const payload=override||{seller_key:order.seller_key,product_code:selectedCode,color,size,quantity:operation==='remove'?1:quantity,operation};try{const o=await api<Order>('/'+encodeURIComponent(order.tracking_code)+'/items',{...payload,allow_shortage});setOrder(o);setPending(null);setNotice('Pedido actualizado correctamente.');await loadCatalog()}catch(e){const err=e as ApiError;if(err.error==='STOCK_INSUFICIENTE'&&err.requires_confirmation){setPending({payload,available:Number(err.available_stock),shortage:Number(err.shortage)})}else setError(errorText(e))}finally{setBusy(false)}}
 async function updateStatus(){if(!order||selectedStatus===order.status)return;setBusy(true);setError('');setNotice('');try{const o=await api<Order>('/'+encodeURIComponent(order.tracking_code)+'/status',{seller_key:order.seller_key,status:selectedStatus},'PATCH');setOrder(o);setSelectedStatus(o.status);setNotice('Estado del pedido actualizado correctamente.');router.refresh()}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 async function deleteOrder(){if(!order||!confirmDelete)return;setBusy(true);setError('');try{const r=await fetch('/api/admin/orders/'+encodeURIComponent(order.tracking_code),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation:'ELIMINAR',actor:'admin'})});const j=await r.json();if(!r.ok)throw new Error(j.error||'No se pudo eliminar el pedido');router.push('/admin/pedidos');router.refresh()}catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar el pedido')}finally{setBusy(false)}}
 async function finish(){if(!order)return;setBusy(true);setError('');try{const o=await api<Order>('/'+encodeURIComponent(order.tracking_code)+'/finish',{seller_key:order.seller_key});setOrder(o);setSelectedStatus(o.status);setNotice('Carga inicial finalizada. Podés modificar el pedido más adelante mediante su código.')}catch(e){setError(errorText(e))}finally{setBusy(false)}}
 return <main className={`${styles.page} ${styles.orderRedesign}`}><header className={styles.header}><div><p className={styles.eyebrow}>ADMINISTRACIÓN / PEDIDOS</p><h1>{order?'Gestionar pedido':'Nuevo pedido'}</h1><p>{order?'Cargá artículos y revisá los datos antes de finalizar.':'Iniciá un pedido para asignar un cliente y cargar sus artículos.'}</p></div><Link href="/admin/pedidos" className={styles.backLink}>← Volver a pedidos</Link></header>
 {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
 {!order&&!code&&<section className={styles.panel}><p role="status">{error?'No se pudo abrir el pedido. Volvé a Pedidos e intentá nuevamente.':'Abriendo el pedido…'}</p></section>}
 {order&&<div className={styles.workbench}>
 <div className={styles.workMain}>
 <section className={styles.introStrip}><span className={styles.liveDot}/><div><strong>{order.status==='draft'?'Estás armando un pedido': 'Detalle y edición del pedido'}</strong><p>Los cambios en los artículos se guardan sin finalizar el pedido.</p></div></section>
 <div className={styles.stepBlock}><div className={styles.stepHeading}><span className={styles.stepNumber}>1</span><div><h2>Cliente y entrega</h2><p>Seleccioná quién compra y cómo recibirá el pedido.</p></div></div>
 <CustomerAssignment order={order} onSaved={()=>{void api<Order>('/'+encodeURIComponent(order.tracking_code)).then(setOrder).then(()=>setNotice('Cliente y modalidad guardados correctamente.')).catch(e=>setError(errorText(e)))}}/>
 </div>
 <div className={styles.stepBlock}> {!['delivered','cancelled'].includes(order.status)&&<section className={styles.panel}><div className={styles.stepHeading}><span className={styles.stepNumber}>2</span><div><h2>Agregar artículos</h2><p>Buscá un producto, elegí su variante y cargá la cantidad.</p></div></div><div className={styles.form}>
 <div className={styles.wide}><label>Buscar por código o nombre<input autoComplete="off" value={query} onFocus={()=>setFocused(true)} onBlur={()=>setTimeout(()=>setFocused(false),150)} onChange={e=>{setQuery(e.target.value);setSelectedCode('');setColor('');setSize('');setPending(null);setFocused(true)}} placeholder="Escribí al menos 2 caracteres…"/></label>
 {focused&&query.trim().length>=2&&!chosen&&<div className={styles.suggestions} role="listbox">{matches.map(p=><button key={p.id} type="button" role="option" aria-selected={false} onMouseDown={e=>e.preventDefault()} onClick={()=>select(p)}><strong>{p.code}</strong> — {p.name}</button>)}{!matches.length&&<p className={styles.muted}>No se encontraron productos.</p>}</div>}
 {chosen&&<p className={styles.muted}>Seleccionado: <strong>{chosen.code} — {chosen.name}</strong> <button className={styles.inlineButton} type="button" onClick={()=>{setSelectedCode('');setQuery('');setColor('');setSize('')}}>Cambiar</button></p>}</div>
 <label>Color<select value={color} disabled={!chosen} onChange={e=>{setColor(e.target.value);setSize('');setPending(null)}}><option value="">Seleccionar color</option>{colors.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
 <label>Talle<select value={size} disabled={!color} onChange={e=>{setSize(e.target.value);setPending(null)}}><option value="">Seleccionar talle</option>{variants.map(v=><option key={v.id} value={v.size}>{v.size}</option>)}</select></label>
 <label>Operación<select value={operation} onChange={e=>{setOperation(e.target.value as typeof operation);setPending(null)}}><option value="add">Sumar unidades</option><option value="subtract">Restar unidades</option><option value="set">Fijar cantidad total</option><option value="remove">Eliminar artículo</option></select></label>
 <label>Cantidad<input type="number" min="1" step="1" value={quantity} disabled={operation==='remove'} onChange={e=>{setQuantity(Number(e.target.value));setPending(null)}}/></label>
 {variant&&<div className={`${styles.stockInfo} ${styles.wide}`}><strong>Stock físico de esta variante: {variant.stock} unidades</strong><span>Cantidad actual en este pedido: {existing} · Cantidad después del cambio: {target}</span>{shortage>0&&<span className={styles.shortage}>Faltarían {shortage} unidades. Para guardar se requiere autorización explícita.</span>}</div>}
 </div><button disabled={busy||!variant||(!['remove'].includes(operation)&&(!Number.isInteger(quantity)||quantity<1))} onClick={()=>void save()}>{operation==='add'?'Agregar al pedido':'Aplicar cambio'}</button>
 {pending&&<div className={styles.warning} role="alert"><strong>Stock insuficiente</strong><p>Stock físico: {pending.available}. Faltan {pending.shortage} unidades. ¿Querés agregar la cantidad solicitada igualmente?</p><div className={styles.actions}><button disabled={busy} onClick={()=>void save(true,pending.payload)}>Sí, autorizar faltante</button><button className={styles.secondary} disabled={busy} onClick={()=>setPending(null)}>No, cancelar</button></div></div>}</section>}
 </div>
 <div className={styles.stepBlock}><div className={styles.stepHeading}><span className={styles.stepNumber}>3</span><div><h2>Revisá el pedido</h2><p>Comprobá cantidades y faltantes antes de finalizar.</p></div></div> <section className={styles.panel}><div className={styles.sectionHeader}><h2>Artículos cargados</h2></div><div className={styles.tableScroll}><table><thead><tr><th>Artículo</th><th>Variante</th><th>Cantidad</th><th>Stock físico</th><th>Faltante</th></tr></thead><tbody>{order.items?.map(i=><tr key={i.id}><td><strong>{i.product_code}</strong> · {i.name}</td><td>{i.color} / {i.size}</td><td>{i.quantity}</td><td>{i.physical_stock}</td><td className={i.current_shortage>0?styles.shortage:''}>{i.current_shortage}</td></tr>)}</tbody></table></div>{!order.items?.length&&<p className={styles.muted}>Todavía no hay artículos en este pedido.</p>}</section>
 </div>
 {order.status!=='draft'&&<div className={styles.secondarySection}> {order.status!=='draft'&&order.status!=='cancelled'&&<section className={styles.panel}>
 <h2>Estado del pedido</h2>
 <p className={styles.muted}>Este estado corresponde al pedido completo, no a cada artículo. Los faltantes de stock se muestran por separado.</p>
 <div className={styles.start}>
 <label>Estado actual
 <select value={selectedStatus||order.status} disabled={busy||order.status==='delivered'} onChange={e=>setSelectedStatus(e.target.value)}>
 <option value="registered">Pendiente</option>
 <option value="preparing">En preparación</option>
 <option value="ready">Listo</option>
 <option value="delivered">Entregado</option>
 </select></label>
 <button type="button" disabled={busy||order.status==='delivered'||!selectedStatus||selectedStatus===order.status} onClick={()=>void updateStatus()}>Guardar estado</button>
 </div>
 {selectedStatus==='delivered'&&order.status!=='delivered'&&<p className={styles.muted}>Al marcarlo como entregado, el pedido quedará bloqueado para nuevas ediciones.</p>}
 </section>}
</div>}
 <details className={styles.dangerDetails}><summary>Opciones avanzadas</summary> <section className={styles.panel} style={{borderColor:'#fecaca'}}><h2>Eliminar pedido</h2><p className={styles.muted}>El pedido dejará de aparecer en el listado, pero se conservará en la base de datos para auditoría. No se modifica el stock.</p>{!confirmDelete?<button type="button" style={{background:'#b91c1c',color:'white'}} disabled={busy} onClick={()=>setConfirmDelete(true)}>Eliminar pedido</button>:<div className={styles.actions}><p role="alert">¿Confirmás que querés eliminar {order.tracking_code}?</p><button type="button" style={{background:'#b91c1c',color:'white'}} disabled={busy} onClick={()=>void deleteOrder()}>Sí, eliminar pedido</button><button type="button" className={styles.secondary} disabled={busy} onClick={()=>setConfirmDelete(false)}>Cancelar</button></div>}</section>
</details>
 </div>
 <aside className={styles.summaryRail}><div className={styles.summaryCard}><span className={styles.summaryOverline}>RESUMEN DEL PEDIDO</span><h2>{order.tracking_code}</h2><span className={styles.summaryStatus}>{labels[order.status]||order.status}</span>
 <div className={styles.summaryDivider}/><div className={styles.summaryLabel}>Cliente</div><strong>{order.customer_name_snapshot||'Sin asignar'}</strong><div className={styles.summaryLabel}>Entrega</div><strong>{order.delivery_method==='pickup'?'Retiro en local':order.delivery_method==='shipping'?'Envío a domicilio':'Sin definir'}</strong>
 <div className={styles.ticket}><div className={styles.ticketHeading}><strong>Detalle de compra</strong><span>{(order.items||[]).length} artículos</span></div>
 {(order.items||[]).length===0?<p className={styles.ticketEmpty}>Los productos que agregues aparecerán acá, con sus precios y subtotales.</p>:(order.items||[]).map(i=><div className={styles.ticketLine} key={i.id}><div className={styles.ticketProduct}><strong>{i.name}</strong><span>{i.product_code} · {i.color} / {i.size}</span><span>{i.quantity} × {i.unit_price==null?'Precio pendiente':money(Number(i.unit_price))}</span></div><strong className={styles.ticketAmount}>{i.unit_price==null?'—':money(Number(i.unit_price)*Number(i.quantity))}</strong></div>)}
 <div className={styles.ticketTotal}><span>Total estimado</span><strong>{(order.items||[]).some(i=>i.unit_price==null)?'A confirmar':money((order.items||[]).reduce((sum,i)=>sum+Number(i.quantity)*Number(i.unit_price||0),0))}</strong></div>
 <p className={styles.ticketNote}>Precios registrados en cada artículo. No incluye envío ni otros cargos.</p></div>
 <div className={styles.summaryDivider}/><div className={styles.summaryMetrics}><div><strong>{order.items?.length||0}</strong><span>Variantes</span></div><div><strong>{order.items?.reduce((n,i)=>n+Number(i.quantity),0)||0}</strong><span>Unidades</span></div></div>
 {(order.items||[]).some(i=>Number(i.current_shortage)>0)&&<div className={styles.summaryAlert}>⚠ Hay faltantes de stock autorizados o pendientes de resolver.</div>}
 {order.status==='draft'&&<><div className={styles.summaryDivider}/><h3>Finalizar carga</h3><p className={styles.summaryHelp}>El pedido pasará a Pendiente. No se descontará stock automáticamente.</p><button className={styles.finishButton} disabled={busy||!order.items?.length||!order.customer_id||!order.delivery_method} onClick={()=>void finish()}>Finalizar pedido →</button>{(!order.customer_id||!order.delivery_method||!order.items?.length)&&<p className={styles.summaryHelp}>Completá cliente, entrega y al menos un artículo para continuar.</p>}</>}
 </div></aside>
 </div>}</main>;
}
