import {sampleProducts,type Product} from './products';

type ApiVariant = {id:string;size:string;color:string;stock:number;sku:string|null};
type ApiProduct = {id:string;code:string;name:string;description:string|null;category:string|null;subcategory:string|null;retail_price:string|number;wholesale_price:string|number;image_url:string|null;active:boolean;variants:ApiVariant[]};

function adaptProduct(p:ApiProduct):Product {
  const variants = (p.variants ?? []).map(v=>({...v,stock:Number(v.stock)}));
  const unique = (items:string[])=>[...new Set(items)];
  return {
    id:p.id,slug:p.code.toLowerCase().replace(/[^a-z0-9]+/g,'-'),code:p.code,
    name:p.name,category:p.category ?? '',subtype:p.subcategory ?? '',
    description:p.description ?? '',retail_price:Number(p.retail_price),
    wholesale_price:Number(p.wholesale_price),wholesale_min_qty:6,
    colors:unique(variants.filter(v=>v.stock>0).map(v=>v.color)),
    sizes:unique(variants.filter(v=>v.stock>0).map(v=>v.size)),
    stock:variants.reduce((sum,v)=>sum+v.stock,0),image:p.image_url ?? '',
    active:p.active,variants
  };
}

export async function getProducts():Promise<Product[]> {
  const url=process.env.API_BASE_URL;
  if(!url){console.warn('API_BASE_URL no configurada; mostrando ejemplos');return sampleProducts;}
  try {
    const response=await fetch(`${url}/api/products?limit=100`,{cache:'no-store'});
    if(!response.ok)throw new Error(`API ${response.status}`);
    const body:{data:ApiProduct[]}=await response.json();
    return body.data.map(adaptProduct);
  } catch(error){
    console.error('Error al consultar la API de productos',error);
    return []; // No mostrar ejemplos como si fueran productos reales.
  }
}
