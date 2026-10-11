-- Run AFTER database.sql. Safe to run on top of your existing joeys_farm database:
-- it only adds tables and does not touch users or products.
USE joeys_farm;

CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_no    VARCHAR(30)  NOT NULL UNIQUE,
  user_id       INT UNSIGNED NULL,
  customer_name VARCHAR(100) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  contact       VARCHAR(8)   NOT NULL,
  payment       VARCHAR(100) NOT NULL,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_date DATE NOT NULL,
  status        ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  remark        VARCHAR(255) NOT NULL DEFAULT '',
  created_at    DATETIME NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  size_key   VARCHAR(30)  NOT NULL,
  title      VARCHAR(60)  NOT NULL,
  tray_size  SMALLINT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  qty        INT UNSIGNED NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  size_key    VARCHAR(30) PRIMARY KEY,
  tray_size   SMALLINT UNSIGNED NOT NULL DEFAULT 36,
  fresh       INT UNSIGNED NOT NULL DEFAULT 0,
  near_expiry INT UNSIGNED NOT NULL DEFAULT 0,
  unsellable  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Starting values copied from the table in staff.html
INSERT IGNORE INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES
('peewee',     36,  20,  2,  1),
('small',      36,  40,  5,  2),
('medium',     36, 300, 40, 10),
('large',      36, 450, 35, 15),
('extralarge', 24, 200, 15,  5),
('jumbo',      36, 110,  8,  2);
