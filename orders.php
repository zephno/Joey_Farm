<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/stock.php';
require __DIR__ . '/includes/discounts.php';

$me = current_user();
if (!$me) json_out(['error' => 'Please log in first.'], 401);
$isStaff = $me['role'] === 'staff';
$pdo = db();

// Sales are counted on the day an order is marked delivered, so orders need a "completed_at" time.
// Added automatically the first time this runs (older databases do not have it yet).
try {
    $pdo->query('SELECT completed_at FROM orders LIMIT 1');
} catch (Throwable $e) {
    try { $pdo->exec('ALTER TABLE orders ADD COLUMN completed_at DATETIME NULL'); } catch (Throwable $e2) { /* ignore */ }
}

ensure_discount_schema($pdo);

/** Load orders (optionally only one user's) with a ready-to-display "details" line. */
function load_orders(PDO $pdo, ?int $userId): array
{
    if ($userId !== null) {
        $st = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC');
        $st->execute([$userId]);
    } else {
        $st = $pdo->query('SELECT * FROM orders ORDER BY id DESC');
    }
    $orders = $st->fetchAll();
    if (!$orders) return [];

    $ids = array_map(fn($o) => (int)$o['id'], $orders);
    $in  = implode(',', array_fill(0, count($ids), '?'));
    $it  = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ($in) ORDER BY id");
    $it->execute($ids);
    $byOrder = [];
    foreach ($it->fetchAll() as $row) $byOrder[(int)$row['order_id']][] = $row;

    $out = [];
    foreach ($orders as $o) {
        $lines = [];
        foreach ($byOrder[(int)$o['id']] ?? [] as $i) {
            $qty = (int)$i['qty'];
            $tray = (int)$i['tray_size'];
            $lines[] = $qty . ($qty === 1 ? ' Tray' : ' Trays') . " ($tray Eggs/Tray) • " . ($qty * $tray) . ' Eggs Total - ' . $i['title'];
        }
        $discPct = (int)($o['discount_percent'] ?? 0);
        $discAmt = (float)($o['discount_amount'] ?? 0);
        if ($discPct > 0) {
            $lines[] = $discPct . '% cracked-egg discount (-₱' . number_format($discAmt, 2) . ')';
        }
        $out[] = [
            'id'            => (int)$o['id'],
            'details'       => implode(' | ', $lines),
            'receipt'       => $o['receipt_no'],
            'total'         => (float)$o['total'],
            'delivery_date' => $o['delivery_date'],
            'status'        => $o['status'],
            'remark'        => $o['remark'],
            'created_at'    => $o['created_at'],
            'completed_at'  => $o['completed_at'] ?? null,
            'customer'      => $o['customer_name'],
            'discount_percent' => $discPct,
            'discount_amount'  => $discAmt,
        ];
    }
    return $out;
}

/* ------------------------------------ POST ------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_xhr();
    $b = json_body();
    $action = (string)($b['action'] ?? '');
    $id = (int)($b['id'] ?? 0);

    if ($action === 'place') {
        $d = [
            'name'    => trim((string)($b['name'] ?? '')),
            'address' => trim((string)($b['address'] ?? '')),
            'contact' => trim((string)($b['contact'] ?? '')),
            'payment' => trim((string)($b['payment'] ?? '')),
        ];
        if ($d['name'] === '' || $d['address'] === '' || $d['payment'] === '') {
            json_out(['error' => 'Please fill in your name, address and payment method.'], 422);
        }
        if (!preg_match('/^[0-9]{8}$/', $d['contact'])) {
            json_out(['error' => 'Contact number must be exactly 8 digits.'], 422);
        }

        $cart = $b['cart'] ?? [];
        if (!is_array($cart) || !$cart || count($cart) > 50) json_out(['error' => 'Your cart is empty.'], 422);

        // Prices always come from the products table, never from the browser.
        $find = $pdo->prepare('SELECT title, price_12, price_24, price_36 FROM products WHERE size_key = ? AND is_active = 1');
        $items = [];
        $total = 0.0;
        foreach ($cart as $c) {
            $key  = strtolower((string)($c['size'] ?? ''));
            $tray = (int)($c['tray'] ?? 0);
            $qty  = (int)($c['qty'] ?? 0);
            if (!in_array($tray, [12, 24, 36], true) || $qty < 1 || $qty > 999) {
                json_out(['error' => 'Invalid item in cart.'], 422);
            }
            $find->execute([$key]);
            $p = $find->fetch();
            if (!$p) json_out(['error' => 'A product in your cart is no longer available. Please review your cart.'], 422);
            $price = (float)$p['price_' . $tray];
            $items[] = [$key, $p['title'], $tray, $price, $qty];
            $total += $price * $qty;
        }

        // Safety net only. The product page and cart already stop customers from asking for
        // more than is available, so this only triggers if stock changed after they added items.
        $stock = stock_map($pdo);
        $want  = [];
        foreach ($items as [$key, $title, $tray, $price, $qty]) {
            $want[$key]['title'] = $title;
            $want[$key]['eggs']  = ($want[$key]['eggs'] ?? 0) + $tray * $qty;
        }
        foreach ($want as $key => $w) {
            $avail = $stock[$key]['available'] ?? 0;
            if ($w['eggs'] > $avail) {
                json_out(['error' => 'Sorry, ' . $w['title'] . ' eggs are no longer available in the amount in your cart. '
                    . 'Only ' . intdiv($avail, 12) . ' trays of 12, ' . intdiv($avail, 24) . ' of 24 or '
                    . intdiv($avail, 36) . ' of 36 can be ordered now. Please go back to your cart and lower the quantity.'], 409);
            }
        }

        $pdo->beginTransaction();
        try {
            // A staff-verified cracked-egg report earns a flat discount on the next order.
            // The server decides this; the browser never sends a discount.
            $grant = next_unused_grant($pdo, (int)$me['id']);
            $discPct = $grant ? (int)$grant['percent'] : 0;
            $discAmt = $discPct > 0 ? round($total * $discPct / 100, 2) : 0.0;
            $total   = round($total - $discAmt, 2);

            $pdo->prepare('INSERT INTO orders (receipt_no, user_id, customer_name, address, contact, payment, total, delivery_date, status, remark, created_at, discount_percent, discount_amount)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute(['TMP-' . bin2hex(random_bytes(6)), $me['id'], $d['name'], $d['address'], $d['contact'], $d['payment'],
                           $total, date('Y-m-d', strtotime('+2 days')), 'pending', '', date('Y-m-d H:i:s'), $discPct, $discAmt]);
            $orderId = (int)$pdo->lastInsertId();
            if ($grant) {
                // Only succeeds if nobody else used this discount in the meantime.
                $use = $pdo->prepare('UPDATE discount_grants SET used_order_id = ? WHERE id = ? AND used_order_id IS NULL');
                $use->execute([$orderId, (int)$grant['id']]);
                if (!$use->rowCount()) {
                    $pdo->rollBack();
                    json_out(['error' => 'Your discount was just used on another order. Please place the order again.'], 409);
                }
            }
            $receipt = 'REC-' . date('Y') . '-' . str_pad((string)$orderId, 3, '0', STR_PAD_LEFT);
            $pdo->prepare('UPDATE orders SET receipt_no = ? WHERE id = ?')->execute([$receipt, $orderId]);

            $ins = $pdo->prepare('INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty) VALUES (?,?,?,?,?,?)');
            foreach ($items as [$key, $title, $tray, $price, $qty]) {
                $ins->execute([$orderId, $key, $title, $tray, $price, $qty]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_out(['error' => 'Could not save your order. Please try again.'], 500);
        }
        json_out(['ok' => true, 'receipt' => $receipt, 'total' => $total, 'discount_percent' => $discPct, 'discount_amount' => $discAmt]);
    }

    if ($action === 'cancel') {
        // Customers can cancel their own pending orders; staff can cancel any pending/confirmed order.
        if ($isStaff) {
            $st = $pdo->prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status IN ('pending','confirmed')");
            $st->execute([$id]);
        } else {
            $st = $pdo->prepare("UPDATE orders SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'");
            $st->execute([$id, $me['id']]);
        }
        if (!$st->rowCount()) json_out(['error' => 'This order can no longer be cancelled.'], 409);
        // A cancelled order gives its discount back so the customer can use it on the next order.
        $pdo->prepare('UPDATE discount_grants SET used_order_id = NULL WHERE used_order_id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    // everything below is staff only
    if (!$isStaff) json_out(['error' => 'Staff only.'], 403);

    if ($action === 'confirm') {
        // Confirming RESERVES the order's eggs: they stay in fresh stock until the order is
        // completed, but no other order can be confirmed against them.
        $pdo->beginTransaction();
        try {
            $need = $pdo->prepare('SELECT size_key, MAX(title) AS title, SUM(qty * tray_size) AS eggs
                                   FROM order_items WHERE order_id = ? GROUP BY size_key');
            $need->execute([$id]);
            $needs = $need->fetchAll();

            // Lock the inventory rows involved so two confirmations cannot both claim the last eggs.
            $lock = $pdo->prepare('UPDATE inventory SET fresh = fresh WHERE size_key = ?');
            foreach ($needs as $n) $lock->execute([$n['size_key']]);

            $stock = stock_map($pdo);
            foreach ($needs as $n) {
                $eggs  = (int)$n['eggs'];
                $avail = $stock[$n['size_key']]['available'] ?? 0;
                if ($eggs > $avail) {
                    $pdo->rollBack();
                    json_out(['error' => 'Cannot confirm: this order needs ' . number_format($eggs) . ' ' . $n['title']
                        . ' eggs but only ' . number_format($avail) . ' are available (fresh stock minus eggs already reserved by other confirmed orders). '
                        . 'Update the inventory first.'], 409);
                }
            }

            $st = $pdo->prepare("UPDATE orders SET status='confirmed', remark=? WHERE id=? AND status='pending'");
            $st->execute(['Confirmed and scheduled', $id]);
            if (!$st->rowCount()) {
                $pdo->rollBack();
                json_out(['error' => 'Only pending orders can be confirmed.'], 409);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_out(['error' => 'Could not confirm the order. Please try again.'], 500);
        }
        json_out(['ok' => true]);
    }
    if ($action === 'complete') {
        // Completing an order also takes its eggs out of the FRESH inventory.
        // Everything happens in one transaction, so the order is only marked
        // completed if the stock was deducted, and it can only happen once
        // (the status must be 'confirmed').
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare("UPDATE orders SET status='completed', completed_at=? WHERE id=? AND status='confirmed'");
            $st->execute([date('Y-m-d H:i:s'), $id]);
            if (!$st->rowCount()) {
                $pdo->rollBack();
                json_out(['error' => 'Only confirmed orders can be completed.'], 409);
            }

            $need = $pdo->prepare('SELECT size_key, MAX(title) AS title, SUM(qty * tray_size) AS eggs
                                   FROM order_items WHERE order_id = ? GROUP BY size_key');
            $need->execute([$id]);
            $deduct = $pdo->prepare('UPDATE inventory SET fresh = fresh - ? WHERE size_key = ? AND fresh >= ?');
            $have   = $pdo->prepare('SELECT fresh FROM inventory WHERE size_key = ?');

            foreach ($need->fetchAll() as $n) {
                $eggs = (int)$n['eggs'];
                $deduct->bindValue(1, $eggs, PDO::PARAM_INT);
                $deduct->bindValue(2, $n['size_key']);
                $deduct->bindValue(3, $eggs, PDO::PARAM_INT);
                $deduct->execute();
                if (!$deduct->rowCount()) {
                    $have->execute([$n['size_key']]);
                    $left = (int)($have->fetchColumn() ?: 0);
                    $pdo->rollBack();
                    json_out(['error' => 'Not enough fresh ' . $n['title'] . ' eggs in inventory: this order needs '
                        . number_format($eggs) . ' but only ' . number_format($left)
                        . ' are in stock. Update the inventory, then complete the order.'], 409);
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_out(['error' => 'Could not complete the order. Please try again.'], 500);
        }
        json_out(['ok' => true]);
    }
    if ($action === 'remark') {
        $remark = mb_substr(trim((string)($b['remark'] ?? '')), 0, 255);
        $pdo->prepare('UPDATE orders SET remark=? WHERE id=?')->execute([$remark, $id]);
        json_out(['ok' => true]);
    }

    json_out(['error' => 'Unknown action.'], 400);
}

/* ------------------------------------ GET ------------------------------------ */
$scope = $_GET['scope'] ?? 'mine';

if ($scope === 'all') {
    if (!$isStaff) json_out(['error' => 'Staff only.'], 403);
    $orders = load_orders($pdo, null);

    $today = date('Y-m-d');
    $weekAgo = date('Y-m-d', strtotime('-6 days'));
    $month = date('Y-m');
    $sales = ['daily' => 0.0, 'weekly' => 0.0, 'monthly' => 0.0];
    foreach ($orders as $o) {
        // Only delivered (completed) orders count, on the day they were marked delivered.
        // Orders delivered before completed_at existed fall back to their order date.
        if ($o['status'] !== 'completed') continue;
        $day = substr($o['completed_at'] ?: $o['created_at'], 0, 10);
        if ($day === $today)                $sales['daily']   += $o['total'];
        if ($day >= $weekAgo)               $sales['weekly']  += $o['total'];
        if (substr($day, 0, 7) === $month)  $sales['monthly'] += $o['total'];
    }
    json_out(['orders' => $orders, 'sales' => $sales]);
}

if ($scope === 'reportable') {
    // Delivered orders this customer can still report (no verified report yet).
    if ($isStaff) json_out(['orders' => []]);
    $st = $pdo->prepare("SELECT id, receipt_no, completed_at, created_at, total FROM orders
                         WHERE user_id = ? AND status = 'completed'
                           AND id NOT IN (SELECT order_id FROM discount_grants WHERE order_id IS NOT NULL)
                         ORDER BY id DESC");
    $st->execute([(int)$me['id']]);
    $list = [];
    foreach ($st->fetchAll() as $o) {
        $list[] = ['id' => (int)$o['id'], 'receipt' => $o['receipt_no'],
                   'date' => substr((string)($o['completed_at'] ?: $o['created_at']), 0, 10), 'total' => (float)$o['total']];
    }
    json_out(['orders' => $list]);
}

if ($scope === 'discount') {
    $g = $isStaff ? null : next_unused_grant($pdo, (int)$me['id']);
    json_out(['available' => (bool)$g, 'percent' => $g ? (int)$g['percent'] : 0]);
}

json_out(['orders' => load_orders($pdo, $me['id'])]);