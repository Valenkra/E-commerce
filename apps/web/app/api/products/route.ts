import {NextResponse} from 'next/server';import {getProducts} from '@/lib/data';
export async function GET(){try{return NextResponse.json({products:await getProducts()},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=300'}})}catch{return NextResponse.json({error:'No se pudieron obtener los productos'},{status:503})}}
