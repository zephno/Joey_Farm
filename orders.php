<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/stock.php';
require __DIR__ . '/includes/returns.php';

$me = current_user();
if (!$me) json_out(['error' => 'Please log in first.'], 401);
$isStaff = $me['role'] === 'staff';
$pdo = db();

try {
    $pdo->query('SELECT completed_at FROM orders LIMIT 1');
} catch (Throwable $e) {
    try { $pdo->exec('ALTER TABLE orders ADD COLUMN completed_at DATETIME NULL'); } catch (Throwable $e2) { /* ignore */ }
}

ensure_return_message_column($pdo);
ensure_replacement_schema($pdo);

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

    $returned = $pdo->prepare(
        "SELECT order_id, size_key, SUM(broken_qty) AS returned_eggs FROM egg_returns
         WHERE order_id IN ($in) AND status IN ('pending', 'approved') GROUP BY order_id, size_key"
    );
    $returned->execute($ids);
    $returnedByOrder = [];
    foreach ($returned->fetchAll() as $row) {
        $returnedByOrder[(int)$row['order_id']][$row['size_key']] = (int)$row['returned_eggs'];
    }

    // Each order can only be reported once: any report (even a rejected one) uses it up.
    $reportedSt = $pdo->prepare("SELECT DISTINCT order_id FROM egg_returns WHERE order_id IN ($in)");
    $reportedSt->execute($ids);
    $reportedOrders = array_flip(array_map('intval', $reportedSt->fetchAll(PDO::FETCH_COLUMN)));

    // The result of each reported egg size (pending / approved / rejected) plus the optional staff note.
    $updatesSt = $pdo->prepare(
        "SELECT order_id, size_key, broken_qty, discount_amount, status, staff_message FROM egg_returns
         WHERE order_id IN ($in) ORDER BY id"
    );
    $updatesSt->execute($ids);
    $updatesByOrder = [];
    foreach ($updatesSt->fetchAll() as $row) $updatesByOrder[(int)$row['order_id']][] = $row;

    $out = [];
    foreach ($orders as $o) {
        $lines = [];
        $detailItems = [];
        $purchasedBySize = [];
        foreach ($byOrder[(int)$o['id']] ?? [] as $i) {
            $qty = (int)$i['qty'];
            $tray = (int)$i['tray_size'];
            $eggs = $qty * $tray;
            $lines[] = $qty . ($qty === 1 ? ' Tray' : ' Trays') . " ($tray Eggs/Tray) • " . $eggs . ' Eggs Total - ' . $i['title'];
            $detailItems[] = [
                'title' => $i['title'],
                'qty' => $qty,
                'tray_size' => $tray,
                'eggs_total' => $eggs,
            ];
            $key = $i['size_key'];
            $purchasedBySize[$key]['title'] = $i['title'];
            $purchasedBySize[$key]['eggs'] = ($purchasedBySize[$key]['eggs'] ?? 0) + $qty * $tray;
        }
        $returnable = [];
        $isReported = isset($reportedOrders[(int)$o['id']]);
        if ($o['status'] === 'completed' && !$isReported && empty($o['return_id'])) {
            foreach ($purchasedBySize as $key => $purchased) {
                $available = $purchased['eggs'] - ($returnedByOrder[(int)$o['id']][$key] ?? 0);
                if ($available > 0) {
                    $returnable[$key] = ['title' => $purchased['title'], 'eggs' => $available];
                }
            }
        }
        $reportUpdates = [];
        foreach ($updatesByOrder[(int)$o['id']] ?? [] as $u) {
            $reportUpdates[] = [
                'title'           => $purchasedBySize[$u['size_key']]['title'] ?? $u['size_key'],
                'broken_qty'      => (int)$u['broken_qty'],
                'discount_amount' => (float)$u['discount_amount'],
                'status'          => $u['status'],
                'staff_message'   => $u['staff_message'],
            ];
        }
        $out[] = [
            'id'            => (int)$o['id'],
            'details'       => implode(' | ', $lines),
            'detail_items'  => $detailItems,
            'receipt'       => $o['receipt_no'],
            'total'         => (float)$o['total'],
            'discount_total'=> (float)($o['discount_total'] ?? 0.00),
            'delivery_date' => $o['delivery_date'],
            'status'        => $o['status'],
            'remark'        => $o['remark'],
            'created_at'    => $o['created_at'],
            'completed_at'  => $o['completed_at'] ?? null,
            'return_id'     => isset($o['return_id']) ? (int)$o['return_id'] : null,
            'customer'      => $o['customer_name'],
            'returnable'    => $returnable,
            'reported'      => $isReported,
            'report_updates'=> $reportUpdates,
        ];
    }
    return $out;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_xhr();

    // A photo bigger than PHP's post_max_size arrives as an EMPTY multipart request.
    if (empty($_POST) && empty($_FILES)
        && str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')
        && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        json_out(['error' => 'That photo is too large. Please choose one under 2 MB.'], 413);
    }

    // Broken-egg reports arrive as multipart form data (they carry a photo); everything else is JSON.
    $b = !empty($_POST) ? $_POST : json_body();
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
        if (!preg_match('/^09[0-9]{9}$/', $d['contact'])) {
            json_out(['error' => 'Contact number must be exactly 11 digits starting with 09 (e.g. 09123456789).'], 422);
        }

        $cart = $b['cart'] ?? [];
        if (!is_array($cart) || !$cart || count($cart) > 50) json_out(['error' => 'Your cart is empty.'], 422);

        $find = $pdo->prepare('SELECT title, price_12, price_24, price_36 FROM products WHERE size_key = ? AND is_active = 1');
        $items = [];
        $subtotalBySize = [];
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
            $lineTotal = $price * $qty;
            $subtotalBySize[$key] = ($subtotalBySize[$key] ?? 0) + $lineTotal;
            $total += $lineTotal;
        }

        $stock = stock_map($pdo);
        $want  = [];
        foreach ($items as [$key, $title, $tray, $price, $qty]) {
            $want[$key]['title'] = $title;
            $want[$key]['eggs']  = ($want[$key]['eggs'] ?? 0) + $tray * $qty;
        }
        foreach ($want as $key => $w) {
            $avail = $stock[$key]['available'] ?? 0;
            if ($w['eggs'] > $avail) {
                json_out(['error' => 'Sorry, ' . $w['title'] . ' eggs are no longer available in the amount in your cart.'], 409);
            }
        }

        $discount = 0.0;
        $discountBySize = [];
        $creditUses = [];
        $totalDue = $total;
        $pdo->beginTransaction();
        try {
            $creditSt = $pdo->prepare(
                "SELECT id, credit_remaining FROM egg_returns
                 WHERE user_id = ? AND size_key = ? AND status = 'approved' AND credit_remaining > 0
                 ORDER BY id FOR UPDATE"
            );
            $consumeSt = $pdo->prepare(
                'UPDATE egg_returns SET credit_remaining = credit_remaining - ? WHERE id = ? AND credit_remaining >= ?'
            );
            foreach ($subtotalBySize as $key => $sizeSubtotal) {
                $creditSt->execute([(int)$me['id'], $key]);
                $credits = $creditSt->fetchAll();
                $availableCredit = array_sum(array_map(fn($credit) => (float)$credit['credit_remaining'], $credits));
                $sizeDiscount = min($sizeSubtotal, $availableCredit);
                $discountBySize[$key] = [
                    'title' => $want[$key]['title'],
                    'amount' => round($sizeDiscount, 2),
                ];
                $discount += $sizeDiscount;

                $toConsume = $sizeDiscount;
                foreach ($credits as $credit) {
                    if ($toConsume <= 0) break;
                    $used = min($toConsume, (float)$credit['credit_remaining']);
                    $consumeSt->execute([$used, (int)$credit['id'], $used]);
                    if ($consumeSt->rowCount() !== 1) {
                        throw new RuntimeException('Could not reserve return credit.');
                    }
                    $creditUses[] = ['return_id' => (int)$credit['id'], 'amount' => $used];
                    $toConsume = round($toConsume - $used, 2);
                }
            }
            $discount = round($discount, 2);
            $totalDue = round(max(0, $total - $discount), 2);

            $pdo->prepare('INSERT INTO orders (receipt_no, user_id, customer_name, address, contact, payment, total, discount_total, delivery_date, status, remark, created_at)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute(['TMP-' . bin2hex(random_bytes(6)), $me['id'], $d['name'], $d['address'], $d['contact'], $d['payment'],
                           $totalDue, $discount, date('Y-m-d', strtotime('+2 days')), 'pending', '', date('Y-m-d H:i:s')]);
            $orderId = (int)$pdo->lastInsertId();
            $receipt = 'REC-' . date('Y') . '-' . str_pad((string)$orderId, 3, '0', STR_PAD_LEFT);
            $pdo->prepare('UPDATE orders SET receipt_no = ? WHERE id = ?')->execute([$receipt, $orderId]);

            $creditUseSt = $pdo->prepare('INSERT INTO order_return_credits (order_id, return_id, amount) VALUES (?, ?, ?)');
            foreach ($creditUses as $creditUse) {
                $creditUseSt->execute([$orderId, $creditUse['return_id'], $creditUse['amount']]);
            }

            $ins = $pdo->prepare('INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty) VALUES (?,?,?,?,?,?)');
            foreach ($items as [$key, $title, $tray, $price, $qty]) {
                $ins->execute([$orderId, $key, $title, $tray, $price, $qty]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            json_out(['error' => 'Could not save your order. Please try again.'], 500);
        }
        json_out(['ok' => true, 'receipt' => $receipt, 'total' => $totalDue, 'discount' => $discount, 'discount_by_size' => $discountBySize]);
    }

    if ($action === 'cancel') {
        $pdo->beginTransaction();
        try {
            if ($isStaff) {
                $st = $pdo->prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status IN ('pending','confirmed','replacement')");
                $st->execute([$id]);
            } else {
                $st = $pdo->prepare("UPDATE orders SET status='cancelled' WHERE id=? AND user_id=? AND status='pending'");
                $st->execute([$id, $me['id']]);
            }
            if (!$st->rowCount()) {
                $pdo->rollBack();
                json_out(['error' => 'This order can no longer be cancelled.'], 409);
            }

            $usesSt = $pdo->prepare('SELECT return_id, amount FROM order_return_credits WHERE order_id = ? FOR UPDATE');
            $usesSt->execute([$id]);
            $restoreSt = $pdo->prepare('UPDATE egg_returns SET credit_remaining = credit_remaining + ? WHERE id = ? AND status = \'approved\'');
            foreach ($usesSt->fetchAll() as $creditUse) {
                $restoreSt->execute([(float)$creditUse['amount'], (int)$creditUse['return_id']]);
            }
            $pdo->prepare('DELETE FROM order_return_credits WHERE order_id = ?')->execute([$id]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_out(['error' => 'Could not cancel the order. Please try again.'], 500);
        }
        json_out(['ok' => true]);
    }

    if ($action === 'report_return') {
        if ($me['role'] !== 'customer') json_out(['error' => 'Customer accounts only.'], 403);
        $orderId = (int)($b['order_id'] ?? 0);

        // Multipart forms can't nest data, so the browser sends the sizes as a JSON string.
        $rawItems = $b['items'] ?? null;
        if (is_string($rawItems)) $rawItems = json_decode($rawItems, true);
        if (!is_array($rawItems)) {
            json_out(['error' => 'Please select at least one egg size to report.'], 422);
        }

        try {
            // One photo for the whole report; one return row per egg size. Staff can see the photo before approving.
            $discountAmount = report_broken_eggs($pdo, (int)$me['id'], $orderId, $rawItems, $_FILES['image'] ?? null);
        } catch (DomainException $e) {
            json_out(['error' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            json_out(['error' => 'Could not submit the return request. Please try again.'], 500);
        }

        json_out(['ok' => true, 'message' => 'Return request submitted. Once approved, the broken eggs will be redelivered and ₱' . number_format($discountAmount, 2) . ' credit will apply to your next order, for the same egg sizes you reported.']);
    }

    if (!$isStaff) json_out(['error' => 'Staff only.'], 403);

    if ($action === 'confirm') {
        $pdo->beginTransaction();
        try {
            $need = $pdo->prepare('SELECT size_key, MAX(title) AS title, SUM(qty * tray_size) AS eggs
                                   FROM order_items WHERE order_id = ? GROUP BY size_key');
            $need->execute([$id]);
            $needs = $need->fetchAll();

            $lock = $pdo->prepare('UPDATE inventory SET fresh = fresh WHERE size_key = ?');
            foreach ($needs as $n) $lock->execute([$n['size_key']]);

            $stock = stock_map($pdo);
            foreach ($needs as $n) {
                $eggs  = (int)$n['eggs'];
                $avail = $stock[$n['size_key']]['available'] ?? 0;
                if ($eggs > $avail) {
                    $pdo->rollBack();
                    json_out(['error' => 'Cannot confirm: not enough available stock.'], 409);
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
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare("UPDATE orders SET status='completed', completed_at=? WHERE id=? AND status IN ('confirmed','replacement')");
            $st->execute([date('Y-m-d H:i:s'), $id]);
            if (!$st->rowCount()) {
                $pdo->rollBack();
                json_out(['error' => 'Only confirmed or replacement orders can be completed.'], 409);
            }

            $need = $pdo->prepare('SELECT size_key, MAX(title) AS title, SUM(qty * tray_size) AS eggs
                                   FROM order_items WHERE order_id = ? GROUP BY size_key');
            $need->execute([$id]);
            $deduct = $pdo->prepare('UPDATE inventory SET fresh = fresh - ? WHERE size_key = ? AND fresh >= ?');

            foreach ($need->fetchAll() as $n) {
                $eggs = (int)$n['eggs'];
                $deduct->bindValue(1, $eggs, PDO::PARAM_INT);
                $deduct->bindValue(2, $n['size_key']);
                $deduct->bindValue(3, $eggs, PDO::PARAM_INT);
                $deduct->execute();
                if (!$deduct->rowCount()) {
                    $pdo->rollBack();
                    json_out(['error' => 'Not enough fresh eggs in inventory.'], 409);
                }
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_out(['error' => 'Could not complete the order. Please try again.'], 500);
        }
        json_out(['ok' => true]);
    }

    if (in_array($action, ['approve_return', 'reject_return'], true)) {
        $returnId = (int)($b['return_id'] ?? $id);
        // Optional note shown to the customer next to the result of their report.
        $staffMessage = mb_substr(trim((string)($b['message'] ?? '')), 0, 500);
        if ($staffMessage === '') $staffMessage = null;
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare("SELECT * FROM egg_returns WHERE id = ? AND status = 'pending' FOR UPDATE");
            $st->execute([$returnId]);
            $ret = $st->fetch();
            if (!$ret) {
                $pdo->rollBack();
                json_out(['error' => 'Return request not found or already processed.'], 404);
            }

            if ($action === 'reject_return') {
                $pdo->prepare("UPDATE egg_returns SET status = 'rejected', staff_message = ? WHERE id = ?")->execute([$staffMessage, $returnId]);
                $pdo->commit();
                json_out(['ok' => true, 'message' => 'Return request rejected.']);
            }

            if (empty($ret['user_id'])) {
                throw new RuntimeException('The customer account for this return no longer exists.');
            }
            $brokenQty = (int)$ret['broken_qty'];
            $sizeKey   = (string)$ret['size_key'];

            // Stock must cover the replacement eggs (lock the row first, same as confirming an order).
            $pdo->prepare('UPDATE inventory SET fresh = fresh WHERE size_key = ?')->execute([$sizeKey]);
            $avail = stock_map($pdo)[$sizeKey]['available'] ?? 0;
            if ($brokenQty > $avail) {
                $pdo->rollBack();
                json_out(['error' => 'Cannot approve: only ' . number_format($avail) . ' eggs of this size are available, but '
                    . number_format($brokenQty) . ' are needed for the replacement. Add stock first, or reject the request.'], 409);
            }

            // 1) approve + customer credit
            $pdo->prepare("UPDATE egg_returns SET status = 'approved', credit_remaining = discount_amount, staff_message = ? WHERE id = ?")
                ->execute([$staffMessage, $returnId]);
            // 2) the broken eggs are logged as a loss
            $pdo->prepare(
                'INSERT INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES (?, 36, 0, 0, ?)
                 ON DUPLICATE KEY UPDATE unsellable = unsellable + VALUES(unsellable)'
            )->execute([$sizeKey, $brokenQty]);

            // 3) replacement order (reserves stock now, deducts it when staff complete the delivery)
            $origSt = $pdo->prepare('SELECT receipt_no, customer_name, address, contact FROM orders WHERE id = ?');
            $origSt->execute([(int)$ret['order_id']]);
            $orig = $origSt->fetch();
            if (!$orig) {
                $uSt = $pdo->prepare('SELECT name AS customer_name, address, contact FROM users WHERE id = ?');
                $uSt->execute([(int)$ret['user_id']]);
                $orig = ($uSt->fetch() ?: ['customer_name' => '', 'address' => '', 'contact' => '']) + ['receipt_no' => ''];
            }
            $titleSt = $pdo->prepare('SELECT title FROM order_items WHERE order_id = ? AND size_key = ? LIMIT 1');
            $titleSt->execute([(int)$ret['order_id'], $sizeKey]);
            $title = (string)($titleSt->fetchColumn() ?: $sizeKey);

            $remark = number_format($brokenQty) . ($brokenQty === 1 ? ' egg' : ' eggs') . ' will be redelivered'
                    . ($orig['receipt_no'] ? ' (replacement for ' . $orig['receipt_no'] . ')' : '');
            $pdo->prepare('INSERT INTO orders (receipt_no, user_id, customer_name, address, contact, payment, total, discount_total, delivery_date, status, remark, created_at, return_id)
                           VALUES (?,?,?,?,?,?,0,0,?,?,?,?,?)')
                ->execute(['TMP-' . bin2hex(random_bytes(6)), (int)$ret['user_id'], $orig['customer_name'], $orig['address'], $orig['contact'],
                           'Replacement (no charge)', date('Y-m-d', strtotime('+2 days')), 'replacement', $remark,
                           date('Y-m-d H:i:s'), $returnId]);
            $repId = (int)$pdo->lastInsertId();
            $pdo->prepare('UPDATE orders SET receipt_no = ? WHERE id = ?')
                ->execute(['RPL-' . date('Y') . '-' . str_pad((string)$repId, 3, '0', STR_PAD_LEFT), $repId]);
            // loose eggs: tray_size 1, qty = number of eggs
            $pdo->prepare('INSERT INTO order_items (order_id, size_key, title, tray_size, unit_price, qty) VALUES (?,?,?,?,0,?)')
                ->execute([$repId, $sizeKey, $title, 1, $brokenQty]);

            $pdo->commit();
            json_out(['ok' => true, 'message' => 'Return approved. ' . number_format($brokenQty) . ' eggs are reserved for a replacement delivery '
                . '(see the Replacement orders), and ₱' . number_format((float)$ret['discount_amount'], 2) . ' credit was added for the customer.']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            json_out(['error' => 'Could not process return approval.'], 500);
        }
    }

    if ($action === 'remark') {
        $remark = mb_substr(trim((string)($b['remark'] ?? '')), 0, 255);
        $pdo->prepare('UPDATE orders SET remark=? WHERE id=?')->execute([$remark, $id]);
        json_out(['ok' => true]);
    }

    json_out(['error' => 'Unknown action.'], 400);
}

$scope = $_GET['scope'] ?? 'mine';

if ($scope === 'all') {
    if (!$isStaff) json_out(['error' => 'Staff only.'], 403);
    $orders = load_orders($pdo, null);
    ensure_return_photo_columns($pdo);
    // has_image tells the staff page whether a proof photo exists (the file name itself is never sent to the browser).
    $returnsSt = $pdo->query("SELECT r.id, r.user_id, r.order_id, r.size_key, r.broken_qty, r.discount_amount, r.status, r.created_at,
                                     CASE WHEN r.image_file IS NULL THEN 0 ELSE 1 END AS has_image,
                                     u.name AS customer_name, o.receipt_no
                              FROM egg_returns r
                              LEFT JOIN users u ON u.id = r.user_id
                              LEFT JOIN orders o ON o.id = r.order_id
                              WHERE r.status = 'pending' ORDER BY r.id DESC");
    $pendingReturns = $returnsSt->fetchAll();
    foreach ($pendingReturns as &$pendingReturn) {
        $pendingReturn['has_image'] = (bool)$pendingReturn['has_image'];
    }
    unset($pendingReturn);

    $today = date('Y-m-d');
    $weekAgo = date('Y-m-d', strtotime('-6 days'));
    $month = date('Y-m');
    $sales = ['daily' => 0.0, 'weekly' => 0.0, 'monthly' => 0.0];
    foreach ($orders as $o) {
        if ($o['status'] !== 'completed') continue;
        $day = substr($o['completed_at'] ?: $o['created_at'], 0, 10);
        if ($day === $today)                $sales['daily']   += $o['total'];
        if ($day >= $weekAgo)               $sales['weekly']  += $o['total'];
        if (substr($day, 0, 7) === $month)  $sales['monthly'] += $o['total'];
    }
    // Approved return credit that customers have not used yet (a discount still owed on future orders).
    $creditOutstanding = (float)$pdo->query("SELECT COALESCE(SUM(credit_remaining), 0) FROM egg_returns WHERE status = 'approved'")->fetchColumn();
    json_out(['orders' => $orders, 'sales' => $sales, 'pending_returns' => $pendingReturns, 'credit_outstanding' => round($creditOutstanding, 2)]);
}

$creditSt = $pdo->prepare(
    "SELECT r.size_key, COALESCE(p.title, r.size_key) AS title, SUM(r.credit_remaining) AS amount
     FROM egg_returns r LEFT JOIN products p ON p.size_key = r.size_key
     WHERE r.user_id = ? AND r.status = 'approved' AND r.credit_remaining > 0
     GROUP BY r.size_key, p.title"
);
$creditSt->execute([(int)$me['id']]);
$creditBySize = [];
$creditTotal = 0.0;
foreach ($creditSt->fetchAll() as $creditRow) {
    $amount = (float)$creditRow['amount'];
    $creditBySize[$creditRow['size_key']] = ['title' => $creditRow['title'], 'amount' => $amount];
    $creditTotal += $amount;
}
json_out([
    'orders' => load_orders($pdo, (int)$me['id']),
    'discount_credit' => $creditTotal,
    'discount_credit_by_size' => $creditBySize,
]);