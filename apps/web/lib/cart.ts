import type {Product} from './products';
export type CartItem={key:string;product:Product;color:string;size:string;qty:number};
export const CART_KEY='lenceria-cart-v1';
export function cartText(items:CartItem[],mode:'minorista'|'mayorista'){return 'Hola, quiero consultar por este pedido ('+mode+'):\n\n'+items.map(i=>`${i.qty} x ${i.product.code} — ${i.product.name} | ${i.color} | Talle ${i.size}`).join('\n')+'\n\n¿Me confirmás disponibilidad y total?';}
export function whatsappLink(text:string){const phone=process.env.NEXT_PUBLIC_WHATSAPP_SELLER_NUMBER||'';return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;}
