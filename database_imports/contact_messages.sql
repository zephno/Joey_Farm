-- Run after database.sql. Adds persistent customer contact messages (each with a required photo).
USE joeys_farm;

CREATE TABLE IF NOT EXISTS contact_messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NULL,
  sender_name  VARCHAR(100) NOT NULL,
  sender_email VARCHAR(150) NOT NULL,
  message      TEXT NOT NULL,
  image_file   VARCHAR(64) NULL,      -- random file name inside uploads/contact/
  image_mime   VARCHAR(30) NULL,
  status       ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at      DATETIME NULL,
  INDEX idx_contact_messages_status_created (status, created_at),
  CONSTRAINT fk_contact_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Only if you ALREADY created the table from the older file (without the two image columns),
-- you do not need to do anything: contact_messages.php adds them automatically. To add them by hand instead:
-- ALTER TABLE contact_messages ADD COLUMN image_file VARCHAR(64) NULL, ADD COLUMN image_mime VARCHAR(30) NULL;