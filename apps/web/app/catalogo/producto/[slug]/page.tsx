import {notFound} from 'next/navigation';
import {getProducts} from '@/lib/data';
import ProductDetail from '@/components/ProductDetail';
export const dynamic = 'force-dynamic';
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const products=await getProducts();
 const product=products.find(p=>p.slug===slug || p.code===slug || p.id===slug);
 if(!product) notFound();
 return <ProductDetail product={product}/>;
}
