CREATE DATABASE IF NOT EXISTS restaurant_ordering;
USE restaurant_ordering;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('table', 'bar', 'togo') NOT NULL,
  location_id INT NULL,
  customer_name VARCHAR(120) NULL,
  items_json JSON NOT NULL,
  status ENUM('pending', 'entered') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
