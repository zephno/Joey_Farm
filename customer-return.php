<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/returns.php';

$user = require_login('customer');
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    
    $order_id   = (int)($_POST['order_id'] ?? 0);
    $size_key   = strtolower(trim((string)($_POST['size_key'] ?? '')));
    $broken_qty = (int)($_POST['broken_qty'] ?? 0);

    try {
        $discount_amount = create_broken_egg_return($pdo, (int)$user['id'], $order_id, $size_key, $broken_qty);
        flash('success', 'Return request submitted. Once approved, ₱' . number_format($discount_amount, 2) . ' credit will apply to your next order.');
    } catch (DomainException $e) {
        flash('danger', $e->getMessage());
    } catch (Throwable $e) {
        flash('danger', 'Could not submit the return request. Please try again.');
    }
    redirect('customer-orders.html');
}