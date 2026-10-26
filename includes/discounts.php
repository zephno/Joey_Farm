<?php
declare(strict_types=1);

/* Flat discount a customer gets on their NEXT order after staff verify a cracked-egg report.
   Tables/columns are created automatically the first time this runs (nothing to import). */

const REPORT_DISCOUNT_PERCENT = 10;

function ensure_discount_schema(PDO $pdo): void
{
    try {
        $pdo->query('SELECT id, user_id, message_id, percent, used_order_id FROM discount_grants LIMIT 1');
    } catch (Throwable $e) {
        try {
            $pdo->exec('CREATE TABLE IF NOT EXISTS discount_grants (
                id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id       INT UNSIGNED NOT NULL,
                message_id    INT UNSIGNED NOT NULL,
                percent       TINYINT UNSIGNED NOT NULL DEFAULT 10,
                granted_by    INT UNSIGNED NULL,
                granted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_order_id INT UNSIGNED NULL,
                UNIQUE KEY uq_discount_grants_message (message_id),
                INDEX idx_discount_grants_user (user_id, used_order_id)
            ) ENGINE=InnoDB');
        } catch (Throwable $e2) { /* ignore */ }
    }
    // One verified report per order: the discount grant remembers which order it was for.
    try {
        $pdo->query('SELECT order_id FROM discount_grants LIMIT 1');
    } catch (Throwable $e) {
        try { $pdo->exec('ALTER TABLE discount_grants ADD COLUMN order_id INT UNSIGNED NULL'); } catch (Throwable $e2) { /* ignore */ }
        try { $pdo->exec('ALTER TABLE discount_grants ADD UNIQUE KEY uq_discount_grants_order (order_id)'); } catch (Throwable $e2) { /* ignore */ }
    }
    try {
        $pdo->query('SELECT discount_percent, discount_amount FROM orders LIMIT 1');
    } catch (Throwable $e) {
        try { $pdo->exec('ALTER TABLE orders ADD COLUMN discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0'); } catch (Throwable $e2) { /* ignore */ }
        try { $pdo->exec('ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0'); } catch (Throwable $e2) { /* ignore */ }
    }
}

/** The oldest unused discount for this customer, or null. */
function next_unused_grant(PDO $pdo, int $userId): ?array
{
    $st = $pdo->prepare('SELECT id, percent FROM discount_grants WHERE user_id = ? AND used_order_id IS NULL ORDER BY id LIMIT 1');
    $st->execute([$userId]);
    $g = $st->fetch();
    return $g ?: null;
}