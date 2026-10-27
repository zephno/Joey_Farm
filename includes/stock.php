<?php
declare(strict_types=1);

/**
 * Stock per egg size, in EGGS.
 *   fresh     = fresh eggs in the inventory table
 *   reserved  = eggs in CONFIRMED orders that are not yet completed (worked out on the fly,
 *               never stored, so it cannot drift out of sync with the orders)
 *   available = fresh - reserved (what can still be promised to customers)
 *
 * Completing an order removes its eggs from fresh (see orders.php); at the same moment the
 * order stops being "confirmed", so available does not change on completion.
 */
function stock_map(PDO $pdo): array
{
    $map = [];
    foreach ($pdo->query('SELECT size_key, fresh FROM inventory')->fetchAll() as $r) {
        $map[$r['size_key']] = ['fresh' => (int)$r['fresh'], 'reserved' => 0, 'available' => 0];
    }

    $sql = "SELECT i.size_key, SUM(i.qty * i.tray_size) AS eggs
            FROM order_items i
            JOIN orders o ON o.id = i.order_id
            WHERE o.status IN ('confirmed', 'replacement')
            GROUP BY i.size_key";
    foreach ($pdo->query($sql)->fetchAll() as $r) {
        if (isset($map[$r['size_key']])) {
            $map[$r['size_key']]['reserved'] = (int)$r['eggs'];
        }
    }

    foreach ($map as $key => $m) {
        $map[$key]['available'] = max(0, $m['fresh'] - $m['reserved']);
    }
    return $map;
}