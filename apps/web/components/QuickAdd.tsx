'use client';
import {useEffect,useState} from 'react';
import {X,Minus,Plus,ShoppingBag} from 'lucide-react';
import type {Product} from '@/lib/products';
import {money} from '@/lib/products';
import {type CartItem,availableSizes,variantStock} from '@/lib/cart';
import styles from './QuickAdd.module.css';
export default function QuickAdd({product,cart,onAdd,onClose}:{product:Product;cart:CartItem[];onAdd:(next:CartItem[])=>void;onClose:()=>void}){
 const [color,setColor]=useState(product.colors[0]??'');
 const [size,setSize]=useState(availableSizes(product,product.colors[0]??'')[0]??'');
 const [qty,setQty]=useState(1);
 const [failed,setFailed]=useState(false);
 const key=[product.id,color,size].join('|');
 const inCart=cart.find(i=>i.key===key)?.qty??0;
 const remaining=Math.max(0,variantStock(product,color,size)-inCart);
 useEffect(()=>{function escape(e:KeyboardEvent){if(e.key==='Escape')onClose()}window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[onClose]);
 function add(){if(!size||qty<1||qty>remaining)return;const next=cart.some(i=>i.key===key)?cart.map(i=>i.key===key?{...i,qty:i.qty+qty,product}:i):[...cart,{key,product,color,size,qty}];onAdd(next)}
 return <div className={styles.backdrop} onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={`Compra rápida: ${product.name}`}>
 <button className={styles.close} type="button" aria-label="Cerrar compra rápida" onClick={onClose}><X size={20}/></button>
 <div className={styles.preview}>{product.image&&!failed?<img src={product.image} alt={product.name} onError={()=>setFailed(true)}/>:<span>{product.name}</span>}</div>
 <div className={styles.content}><span className={styles.code}>{product.code}</span><h2>{product.name}</h2><strong className={styles.price}>{money(product.retail_price)}</strong><p className={styles.wholesale}>Mayorista: {money(product.wholesale_price)} desde {product.wholesale_min_qty} unidades</p>
 <label className={styles.label}>Color</label><div className={styles.chips}>{product.colors.map(c=><button type="button" key={c} className={c===color?styles.active:styles.chip} onClick={()=>{setColor(c);setSize(availableSizes(product,c)[0]??'');setQty(1)}}>{c}</button>)}</div>
 <label className={styles.label}>Talle</label><div className={styles.chips}>{availableSizes(product,color).map(t=><button type="button" key={t} className={t===size?styles.active:styles.chip} onClick={()=>{setSize(t);setQty(1)}}>{t}</button>)}</div>
 <label className={styles.label}>Cantidad</label><div className={styles.qty}><button type="button" disabled={qty<=1} onClick={()=>setQty(q=>q-1)} aria-label="Restar"><Minus size={16}/></button><span>{qty}</span><button type="button" disabled={qty>=remaining} onClick={()=>setQty(q=>q+1)} aria-label="Sumar"><Plus size={16}/></button></div>
 <p className={styles.stock}>{!size?'Elegí un talle':remaining===0?'Sin stock disponible':`${remaining} unidades disponibles para agregar`}</p>
 <button type="button" className={styles.add} disabled={!size||remaining<qty||qty<1} onClick={add}><ShoppingBag size={18}/> Agregar al carrito</button></div>
 </section></div>
}
