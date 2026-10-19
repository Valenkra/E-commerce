-- Esquema Fastify para PostgreSQL Railway. Ejecutar sobre base nueva.
-- No incluye 001_initial.sql (Supabase auth/storage).

BEGIN;

-- ===== 001_initial_schema.sql =====
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    retail_price NUMERIC(12,2) NOT NULL CHECK (retail_price >= 0),
    wholesale_price NUMERIC(12,2) NOT NULL CHECK (wholesale_price >= 0),
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku TEXT UNIQUE,
    UNIQUE (product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_name
ON products(name);

CREATE INDEX IF NOT EXISTS idx_variants_product
ON product_variants(product_id);

-- ===== 002_inventory_movements.sql =====
-- Aplicar solamente sobre el esquema con products y product_variants.
CREATE TABLE IF NOT EXISTS inventory_movements (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
 movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada','salida','ajuste')),
 quantity INTEGER NOT NULL CHECK (quantity >= 0),
 previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
 new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
 reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_date ON inventory_movements(variant_id,created_at DESC);

-- ===== 003_orders.sql =====
-- Ejecutar una vez en la misma base de datos de la API.
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE TABLE IF NOT EXISTS orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 tracking_code TEXT NOT NULL UNIQUE,
 seller_key TEXT NOT NULL,
 customer_name TEXT,
 customer_phone TEXT,
 notes TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','registered','preparing','ready','delivered','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 finalized_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_draft_per_seller ON orders(seller_key) WHERE status='draft';
CREATE TABLE IF NOT EXISTS order_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 variant_id UUID NOT NULL REFERENCES product_variants(id),
 quantity INTEGER NOT NULL CHECK (quantity > 0),
 shortage_authorized BOOLEAN NOT NULL DEFAULT FALSE,
 unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
 UNIQUE(order_id,variant_id)
);
CREATE TABLE IF NOT EXISTS order_events (
 id BIGSERIAL PRIMARY KEY,
 order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
 actor TEXT NOT NULL,
 event_type TEXT NOT NULL,
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id,created_at);

-- ===== 004_customers_delivery.sql =====
CREATE TABLE IF NOT EXISTS customers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 full_name TEXT NOT NULL CHECK (length(trim(full_name)) > 0),
 phone TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (lower(full_name));
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
CREATE TABLE IF NOT EXISTS customer_addresses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 street TEXT NOT NULL,
 locality TEXT NOT NULL,
 postal_code TEXT,
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name_snapshot TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone_snapshot TEXT;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_delivery_method_check') THEN
  ALTER TABLE orders ADD CONSTRAINT orders_delivery_method_check CHECK (delivery_method IN ('pickup','shipping'));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);

-- ===== 005_orders_soft_delete.sql =====
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_visible_idx ON orders(created_at DESC) WHERE deleted_at IS NULL;

-- ===== 006_store_settings.sql =====
CREATE TABLE IF NOT EXISTS store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;
