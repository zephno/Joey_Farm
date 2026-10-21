-- Run after database.sql. Adds persistent customer contact messages.
USE joeys_farm;

CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NULL,
  sender_name  VARCHAR(100) NOT NULL,
  sender_email VARCHAR(150) NOT NULL,
  message      TEXT NOT NULL,
  status       ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at      DATETIME NULL,
  INDEX idx_contact_messages_status_created (status, created_at),
  CONSTRAINT fk_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
