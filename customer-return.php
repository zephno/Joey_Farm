<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/returns.php';

$user = require_login('customer');
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();

    $order_id = (int)($_POST['order_id'] ?? 0);

    // Form fields: broken_qty[peewee]=2&broken_qty[large]=5 (sizes left at 0 or empty are ignored)
    $items = [];
    $broken = $_POST['broken_qty'] ?? [];
    if (is_array($broken)) {
        foreach ($broken as $size => $qty) {
            if ((int)$qty > 0) {
                $items[] = ['size_key' => (string)$size, 'broken_qty' => (int)$qty];
            }
        }
    }

    try {
        // One proof photo for the whole report (a plain form needs enctype="multipart/form-data" and <input type="file" name="image">).
        $discount_amount = report_broken_eggs($pdo, (int)$user['id'], $order_id, $items, $_FILES['image'] ?? null);
        flash('success', 'Return request submitted. Once approved, ₱' . number_format($discount_amount, 2) . ' credit will apply to your next order.');
    } catch (DomainException $e) {
        flash('danger', $e->getMessage());
    } catch (Throwable $e) {
        flash('danger', 'Could not submit the return request. Please try again.');
    }
    redirect('customer-orders.html');
}