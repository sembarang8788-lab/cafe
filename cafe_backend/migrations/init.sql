-- Create users table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'cashier',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100),
  price INT,
  stock INT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,
  total_amount INT,
  user_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create order_items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id CHAR(36),
  product_id CHAR(36),
  quantity INT,
  price INT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create indexes
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_users_username ON users(username);
