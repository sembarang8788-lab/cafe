const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'cashier',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100),
  price INT,
  stock INT,
  image_url TEXT,
  category VARCHAR(20) DEFAULT 'makanan',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add category column if not exists (for existing databases)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
    ALTER TABLE products ADD COLUMN category VARCHAR(20) DEFAULT 'makanan';
  END IF;
END $$;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  total_amount INT,
  user_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id CHAR(36),
  product_id CHAR(36),
  quantity INT,
  price INT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

async function runMigration() {
  console.log('🔄 Running migration...\n');

  try {
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
    console.log('📦 Tables created:');
    console.log('   - users');
    console.log('   - products');
    console.log('   - orders');
    console.log('   - order_items');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
