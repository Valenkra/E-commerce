import {sampleProducts,type Product} from './products';
export async function getProducts():Promise<Product[]>{
 const url=process.env.API_BASE_URL;
 if(!url)return sampleProducts;
 try {const response=await fetch(`${url}/api/products?limit=100`,{next:{revalidate:60}});if(!response.ok)throw new Error(`API ${response.status}`);const body=await response.json();return body.data as Product[];}
 catch(error){console.error('Error al consultar la API de productos',error);return sampleProducts;}
}
