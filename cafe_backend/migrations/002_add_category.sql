-- Add category column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'makanan';

-- Update existing products without category
UPDATE products SET category = 'makanan' WHERE category IS NULL;
