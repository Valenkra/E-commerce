ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS orders_visible_idx ON orders(created_at DESC) WHERE deleted_at IS NULL;
