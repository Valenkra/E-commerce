-- Ejecutar en Supabase SQL Editor. No usar claves service_role en el navegador.
create extension if not exists pgcrypto;
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),slug text not null unique,code text not null unique,
 name text not null,category text not null,subtype text not null default '',description text not null default '',
 retail_price numeric(12,2) not null check(retail_price>=0),wholesale_price numeric(12,2) not null check(wholesale_price>=0),
 wholesale_min_qty integer not null default 6 check(wholesale_min_qty>0),colors text[] not null default '{}',sizes text[] not null default '{}',
 stock integer not null default 0 check(stock>=0),image text not null default '',active boolean not null default true);
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,role text not null default 'customer' check(role in ('customer','admin')),full_name text,phone text);
create table if not exists public.orders(id uuid primary key default gen_random_uuid(),order_number bigint generated always as identity unique,customer_id uuid references auth.users(id),customer_name text,status text not null default 'draft' check(status in ('draft','pending','confirmed','preparing','ready','shipped','delivered','cancelled')),created_at timestamptz not null default now());
create table if not exists public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,product_id uuid not null references public.products(id),color text not null,size text not null,quantity integer not null check(quantity>0),unit_price numeric(12,2) not null check(unit_price>=0));
create table if not exists public.stock_movements(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),order_id uuid references public.orders(id),delta integer not null,reason text not null,created_at timestamptz not null default now());
create index if not exists products_category_idx on public.products(category) where active=true;
create index if not exists orders_customer_idx on public.orders(customer_id,created_at desc);
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
create policy "Public active products" on public.products for select to anon,authenticated using(active=true);
create policy "Users read own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "Users read own orders" on public.orders for select to authenticated using(customer_id=(select auth.uid()));
create policy "Users read own items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
-- Las escrituras administrativas y descuentos de stock se implementarán con endpoints autenticados y transacciones.
-- Nunca confiar en cantidades, precios o roles enviados por el cliente.
