<?php
declare(strict_types=1);

function create_broken_egg_return(PDO $pdo, int $userId, int $orderId, string $sizeKey, int $brokenQty): float
{
    if ($brokenQty < 1) {
        throw new DomainException('Please enter a valid number of broken eggs.');
    }
    if (!preg_match('/^[a-z0-9_-]{2,30}$/', $sizeKey)) {
        throw new DomainException('Invalid egg size selected.');
    }

    $pdo->beginTransaction();
    try {
        $orderSt = $pdo->prepare("SELECT id, total, discount_total FROM orders WHERE id = ? AND user_id = ? AND status = 'completed' FOR UPDATE");
        $orderSt->execute([$orderId, $userId]);
        $order = $orderSt->fetch();
        if (!$order) {
            throw new DomainException('Returns are available only for your delivered orders.');
        }

        $itemSt = $pdo->prepare(
            'SELECT SUM(qty * tray_size) AS purchased_eggs, SUM(qty * unit_price) AS purchase_value
             FROM order_items WHERE order_id = ? AND size_key = ?'
        );
        $itemSt->execute([$orderId, $sizeKey]);
        $item = $itemSt->fetch();
        $purchased = (int)($item['purchased_eggs'] ?? 0);
        if ($purchased < 1) {
            throw new DomainException('That egg size was not part of this delivered order.');
        }

        $usedSt = $pdo->prepare(
            "SELECT COALESCE(SUM(broken_qty), 0) FROM egg_returns
             WHERE order_id = ? AND size_key = ? AND status IN ('pending', 'approved')"
        );
        $usedSt->execute([$orderId, $sizeKey]);
        $available = max(0, $purchased - (int)$usedSt->fetchColumn());
        if ($brokenQty > $available) {
            throw new DomainException('You can return at most ' . $available . ' more eggs of this size from this order.');
        }

        $grossOrderTotal = (float)$order['total'] + (float)$order['discount_total'];
        $paidRatio = $grossOrderTotal > 0
            ? min(1.0, max(0.0, (float)$order['total'] / $grossOrderTotal))
            : 0.0;
        $discount = round(((float)$item['purchase_value'] / $purchased) * $brokenQty * $paidRatio, 2);
        $insert = $pdo->prepare(
            "INSERT INTO egg_returns (user_id, order_id, size_key, broken_qty, discount_amount, status)
             VALUES (?, ?, ?, ?, ?, 'pending')"
        );
        $insert->execute([$userId, $orderId, $sizeKey, $brokenQty, $discount]);
        $pdo->commit();
        return $discount;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
