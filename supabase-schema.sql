-- =============================================
-- SCHEMA LENGKAP UNTUK APLIKASI CAFE POS
-- Jalankan seluruh SQL ini di Supabase SQL Editor
-- =============================================

-- 1. Tabel Produk (Menu)
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabel Pesanan (Header)
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 3. Tabel Detail Pesanan
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL
);

-- 4. Function untuk membuat order dan mengurangi stok
CREATE OR REPLACE FUNCTION create_order_and_reduce_stock(
  p_user_id uuid,
  p_items jsonb,
  p_total numeric
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  INSERT INTO orders (user_id, total_amount, status)
  VALUES (p_user_id, p_total, 'completed')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (
      v_order_id, 
      (v_item->>'product_id')::uuid, 
      (v_item->>'quantity')::int, 
      (v_item->>'price')::numeric
    );

    UPDATE products 
    SET stock = stock - (v_item->>'quantity')::int
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Row Level Security (Hapus dulu jika ada, baru buat ulang)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are editable by everyone" ON products;
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON orders;
DROP POLICY IF EXISTS "Orders can be created by everyone" ON orders;
DROP POLICY IF EXISTS "Order items are viewable by everyone" ON order_items;
DROP POLICY IF EXISTS "Order items can be created by everyone" ON order_items;

CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Products are editable by everyone" ON products FOR ALL USING (true);
CREATE POLICY "Orders are viewable by everyone" ON orders FOR SELECT USING (true);
CREATE POLICY "Orders can be created by everyone" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Order items are viewable by everyone" ON order_items FOR SELECT USING (true);
CREATE POLICY "Order items can be created by everyone" ON order_items FOR INSERT WITH CHECK (true);
