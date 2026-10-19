 'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,Minus,Plus,ShoppingBag,MessageCircle} from 'lucide-react';
import type {Product} from '@/lib/products';
import {money} from '@/lib/products';
import {CART_KEY,type CartItem,availableSizes,variantStock,whatsappLink} from '@/lib/cart';
import styles from './ProductDetail.module.css';
import CartDrawer from './CartDrawer';
export default function ProductDetail({product}:{product:Product}) {
 const [color,setColor]=useState(product.colors[0]??'');
 const [size,setSize]=useState(availableSizes(product,product.colors[0]??'')[0]??'');
 const [qty,setQty]=useState(1);
 const [cart,setCart]=useState<CartItem[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [added,setAdded]=useState(false);
 const [imageFailed,setImageFailed]=useState(false);
 const [cartOpen,setCartOpen]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(CART_KEY);if(raw){const value=JSON.parse(raw);if(Array.isArray(value))setCart(value)}}catch{}setLoaded(true)},[]);
 useEffect(()=>{if(loaded)localStorage.setItem(CART_KEY,JSON.stringify(cart))},[cart,loaded]);
 const key=[product.id,color,size].join('|');
 const inCart=cart.find(item=>item.key===key)?.qty??0;
 const remaining=Math.max(0,variantStock(product,color,size)-inCart);
 function add(){if(!loaded||!size||qty>remaining||qty<1)return;
  const next=cart.some(item=>item.key===key)
   ?cart.map(item=>item.key===key?{...item,qty:item.qty+qty,product}:item)
   :[...cart,{key,product,color,size,qty}];
  setCart(next);localStorage.setItem(CART_KEY,JSON.stringify(next));window.dispatchEvent(new Event('shop-cart-updated'));setAdded(true);
 }
 const inquiry=whatsappLink(`Hola, tengo una consulta sobre ${product.name} (${product.code}). ¿Me pueden ayudar?`);
 return <main className={styles.page}>
  <div className={styles.top}><Link href="/catalogo" className={styles.back}><ArrowLeft size={18}/> Volver al catálogo</Link><button type="button" className={styles.back} onClick={()=>setCartOpen(true)} style={{background:"none",border:0,cursor:"pointer"}}><ShoppingBag size={18}/> Ver carrito</button></div>
  <div className={styles.layout}>
   <div className={styles.imageFrame}>{product.image&&!imageFailed?<img src={product.image} alt={product.name} className={styles.image} onError={()=>setImageFailed(true)}/>:<div className={styles.fallback}>{product.name}</div>}</div>
   <section className={styles.info}>
    <span className={styles.code}>{product.code} · {product.category}</span>
    <h1>{product.name}</h1><p className={styles.description}>{product.description}</p>
    <div className={styles.prices}><div><span>Precio minorista</span><strong>{money(product.retail_price)}</strong></div><div><span>Precio mayorista</span><strong>{money(product.wholesale_price)}</strong><small>Desde {product.wholesale_min_qty} unidades</small></div></div>
    <h2>Color</h2><div className={styles.chips}>{product.colors.map(c=><button key={c} type="button" className={c===color?styles.chosen:styles.chip} onClick={()=>{setColor(c);setSize(availableSizes(product,c)[0]??'');setQty(1);setAdded(false)}}>{c}</button>)}</div>
    <h2>Talle</h2><div className={styles.chips}>{availableSizes(product,color).map(s=><button key={s} type="button" className={s===size?styles.chosen:styles.chip} onClick={()=>{setSize(s);setQty(1);setAdded(false)}}>{s}</button>)}</div>
    <h2>Cantidad</h2><div className={styles.quantity}><button type="button" disabled={qty<=1} onClick={()=>setQty(n=>n-1)} aria-label="Restar"><Minus size={17}/></button><span>{qty}</span><button type="button" disabled={qty>=remaining} onClick={()=>setQty(n=>n+1)} aria-label="Sumar"><Plus size={17}/></button></div>
    <button type="button" className={styles.add} disabled={!loaded||!size||remaining<qty} onClick={add}><ShoppingBag size={19}/> Agregar al carrito</button>
    {added&&<p className={styles.success} role="status">¡Agregado al carrito! <button type="button" onClick={()=>setCartOpen(true)} style={{border:0,background:"none",textDecoration:"underline",cursor:"pointer",color:"inherit"}}>Ver carrito</button></p>}
    <a href={inquiry} target="_blank" rel="noreferrer" className={styles.consult}><MessageCircle size={18}/> Consultar por este artículo</a>
    <p className={styles.note}>Los conjuntos se venden con las prendas indicadas. Cualquier modificación está sujeta a consulta y confirmación.</p>
   </section>
  </div>
  {cartOpen&&<CartDrawer cart={cart} setCart={setCart} products={[product]} onClose={()=>setCartOpen(false)}/>}
 </main>;
}
