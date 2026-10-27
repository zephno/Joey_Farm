-- Run AFTER database.sql. Safe to rerun: preserves records, widens phone fields,
-- and adds any missing order/inventory tables and starting inventory rows.
USE joeys_farm;

-- Keep existing installations compatible with the 11-digit registration and checkout forms.
ALTER TABLE users MODIFY contact VARCHAR(11) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_credit DECIMAL(10,2) NOT NULL DEFAULT 0.00;
UPDATE users SET contact = '09123456789'
WHERE email = 'customer@example.com' AND contact = '12345678';

CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_no    VARCHAR(30)  NOT NULL UNIQUE,
  user_id       INT UNSIGNED NULL,
  customer_name VARCHAR(100) NOT NULL,
  address       VARCHAR(255) NOT NULL,
  contact       VARCHAR(11)  NOT NULL,
  payment       VARCHAR(100) NOT NULL,
  total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_date DATE NOT NULL,
  status        ENUM('pending','confirmed','replacement','completed','cancelled') NOT NULL DEFAULT 'pending',
  remark        VARCHAR(255) NOT NULL DEFAULT '',
  discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at    DATETIME NOT NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE orders MODIFY contact VARCHAR(11) NOT NULL;
ALTER TABLE orders MODIFY status ENUM('pending','confirmed','replacement','completed','cancelled') NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_id INT UNSIGNED NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00;

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

CREATE TABLE IF NOT EXISTS egg_returns (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NULL,
  order_id        INT UNSIGNED NULL,
  size_key        VARCHAR(30) NOT NULL,
  broken_qty      INT UNSIGNED NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  credit_remaining DECIMAL(10,2) NULL DEFAULT NULL,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_returns_user (user_id),
  KEY fk_returns_order (order_id),
  CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT fk_returns_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE egg_returns MODIFY status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';
ALTER TABLE egg_returns ADD COLUMN IF NOT EXISTS credit_remaining DECIMAL(10,2) NULL DEFAULT NULL;

UPDATE egg_returns AS r
JOIN (
  SELECT id, LEAST(discount_amount, GREATEST(0, available_credit - previous_credits)) AS credit_to_assign
  FROM (
    SELECT id, discount_amount, available_credit,
           COALESCE(SUM(discount_amount) OVER (
             PARTITION BY user_id ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ), 0) AS previous_credits
    FROM (
      SELECT r.id, r.user_id, r.discount_amount,
             COALESCE(u.discount_credit, 0) + COALESCE(c.cancelled_credit, 0) AS available_credit
      FROM egg_returns AS r
      JOIN users AS u ON u.id = r.user_id
      LEFT JOIN (
        SELECT user_id, SUM(discount_total) AS cancelled_credit
        FROM orders
        WHERE status = 'cancelled'
        GROUP BY user_id
      ) AS c ON c.user_id = r.user_id
      WHERE r.status = 'approved' AND r.credit_remaining IS NULL
    ) AS eligible_credits
  ) AS ordered_credits
) AS allocation ON allocation.id = r.id
SET r.credit_remaining = allocation.credit_to_assign;

UPDATE egg_returns SET credit_remaining = 0 WHERE credit_remaining IS NULL;

CREATE TABLE IF NOT EXISTS order_return_credits (
  order_id  INT UNSIGNED NOT NULL,
  return_id INT UNSIGNED NOT NULL,
  amount    DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, return_id),
  KEY idx_order_return_credits_return (return_id),
  CONSTRAINT fk_order_return_credits_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_return_credits_return FOREIGN KEY (return_id) REFERENCES egg_returns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Starting values copied from the table in staff.html
INSERT IGNORE INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES
('peewee',     36,  20,  2,  1),
('small',      36,  40,  5,  2),
('medium',     36, 300, 40, 10),
('large',      36, 450, 35, 15),
('extralarge', 24, 200, 15,  5),
('jumbo',      36, 110,  8,  2);