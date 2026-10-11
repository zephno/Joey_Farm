-- Joey's Farm database. Import with phpMyAdmin (Import tab) or: mysql -u root < database.sql
CREATE DATABASE IF NOT EXISTS joeys_farm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE joeys_farm;

DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer','staff') NOT NULL DEFAULT 'customer',
  address       VARCHAR(255) NOT NULL DEFAULT '',
  contact       VARCHAR(8)   NOT NULL DEFAULT '',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  size_key    VARCHAR(30)  NOT NULL UNIQUE,   -- used in Product.html?size=...
  title       VARCHAR(60)  NOT NULL,
  description TEXT         NOT NULL,
  image       VARCHAR(255) NOT NULL DEFAULT '',
  price_12    DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_24    DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_36    DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Demo accounts: staff@joeysfarm.com / staff123   and   customer@example.com / customer123
INSERT INTO users (name, email, password_hash, role, address, contact) VALUES
('Farm Staff', 'staff@joeysfarm.com', '$2y$10$HusPGxHcZUNagusX1yIBUOIyS3YDKnEoSdkuMGvhWjvCLhlrcSIvm', 'staff', '', ''),
('Demo Customer', 'customer@example.com', '$2y$10$fDl1EqwC8Tl0HH.ZiawZjuqYX4KeoVQIYTDDFBkz.1I3yg.5kvM5K', 'customer', 'Quezon City', '12345678');

INSERT INTO products (size_key, title, description, image, price_12, price_24, price_36) VALUES
('peewee','Peewee','Peewee eggs are the smallest size we offer, perfect for bakers who want precise control over ingredient ratios. Despite their petite size, they are just as fresh and flavorful as our larger eggs.','images/Pewee_Egg.jpg',87,172,258),
('small','Small','Small eggs are compact but full of flavor, making them a great everyday choice for cooking and baking. They are typically laid by younger hens and offer a more affordable option without sacrificing freshness.','images/Small_Egg.jpg',92,184,276),
('medium','Medium','Medium eggs strike the perfect balance between size and value, making them our most versatile everyday option. Whether you are frying, boiling, or baking, they deliver consistent results.','images/Medium_Egg.jpg',98,195,293),
('large','Large','Large eggs are the standard size most recipes are written for, making them a safe and reliable choice for cooking and baking alike.','images/Large_Egg.jpg',103,207,310),
('extralarge','Extra Large','Extra Large eggs offer bigger yolks and whites, perfect for families who go through eggs quickly or for recipes that benefit from a little extra richness.','images/ExtraLarge_Egg.jpg',109,218,327),
('jumbo','Jumbo','Jumbo eggs are our biggest and most generous size, packed with rich, golden yolks in every bite.','images/Jumbo_Egg.jpg',115,230,345);