'use client';
import {useEffect,useState} from 'react';
import type {Product} from '@/lib/products';
export default function CartProductPhoto({product}:{product:Product}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[product.image]);
 if(!product.image||failed)return <div className="product-illustration"><span>{product.category}</span><strong>{product.name}</strong></div>;
 return <img src={product.image} alt={product.name} onError={()=>setFailed(true)} style={{width:'100%',height:'100%',objectFit:'contain',background:'#fff'}}/>;
}
