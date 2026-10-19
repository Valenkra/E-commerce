export const dynamic = 'force-dynamic';
import Store from '@/components/Store';import {getProducts} from '@/lib/data';
export const revalidate=60;
export default async function Catalogo(){const products=await getProducts();return <Store products={products}/>}
