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
