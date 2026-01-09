-- ========================================
-- SUPABASE SQL SCHEMA
-- ========================================
-- Jalankan SQL ini di Supabase SQL Editor:
-- 1. Buka dashboard Supabase
-- 2. Pilih project Anda
-- 3. Klik "SQL Editor" di sidebar
-- 4. Klik "New Query"
-- 5. Paste dan jalankan SQL di bawah ini
-- ========================================

-- Tabel Menu
CREATE TABLE IF NOT EXISTS menu (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('kopi', 'non-kopi', 'makanan')),
  harga INTEGER NOT NULL,
  stok INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  menu_id BIGINT REFERENCES menu(id) ON DELETE SET NULL,
  menu_nama VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL,
  harga_satuan INTEGER NOT NULL,
  total_harga INTEGER NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy untuk akses publik (sesuaikan dengan kebutuhan keamanan Anda)
CREATE POLICY "Allow public read access on menu" ON menu
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on menu" ON menu
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on menu" ON menu
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on menu" ON menu
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access on transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- ========================================
-- SAMPLE DATA (Opsional)
-- ========================================
-- INSERT INTO menu (nama, kategori, harga, stok) VALUES
--   ('Espresso', 'kopi', 18000, 50),
--   ('Cappuccino', 'kopi', 25000, 40),
--   ('Latte', 'kopi', 28000, 35),
--   ('Americano', 'kopi', 20000, 45),
--   ('Matcha Latte', 'non-kopi', 28000, 30),
--   ('Chocolate', 'non-kopi', 22000, 25),
--   ('Lemon Tea', 'non-kopi', 15000, 40),
--   ('Croissant', 'makanan', 25000, 20),
--   ('Sandwich', 'makanan', 35000, 15),
--   ('Cake Slice', 'makanan', 30000, 10);
