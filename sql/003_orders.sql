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
