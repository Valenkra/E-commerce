import type {Product} from './products';
export type CartItem={key:string;product:Product;color:string;size:string;qty:number};
// Si existen variantes reales, respetamos su stock por talle y color.
export function variantStock(product:Product,color:string,size:string):number {
  if(product.variants){
    return product.variants.find(v=>v.color===color&&v.size===size)?.stock ?? 0;
  }
  // Compatibilidad con productos de ejemplo que no tienen variantes.
  return product.colors.includes(color)&&product.sizes.includes(size)?product.stock:0;
}
export function availableSizes(product:Product,color:string):string[]{
  return product.sizes.filter(size=>variantStock(product,color,size)>0);
}
export const CART_KEY='lenceria-cart-v1';
export function cartText(items:CartItem[],mode:'minorista'|'mayorista'){return 'Hola, quiero consultar por este pedido ('+mode+'):\n\n'+items.map(i=>`${i.qty} x ${i.product.code} — ${i.product.name} | ${i.color} | Talle ${i.size}`).join('\n')+'\n\n¿Me confirmás disponibilidad y total?';}
export function whatsappLink(text:string){const phone=process.env.NEXT_PUBLIC_WHATSAPP_SELLER_NUMBER||'';return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;}
