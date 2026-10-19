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
