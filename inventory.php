<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/stock.php';

$me = current_user();
if (!$me) json_out(['error' => 'Please log in first.'], 401);
if ($me['role'] !== 'staff') json_out(['error' => 'Staff only.'], 403);

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_xhr();
    $b = json_body();

    $key  = strtolower(trim((string)($b['size_key'] ?? '')));
    $tray = (int)($b['tray_size'] ?? 0);
    $vals = [];
    foreach (['fresh', 'near_expiry', 'unsellable'] as $f) {
        $n = $b[$f] ?? 0;
        if (!is_numeric($n) || (int)$n < 0 || (int)$n > 10000000) {
            json_out(['error' => "Invalid value for $f."], 422);
        }
        $vals[$f] = (int)$n;
    }
    if (!preg_match('/^[a-z0-9_-]{2,30}$/', $key)) json_out(['error' => 'Invalid size.'], 422);
    if (!in_array($tray, [12, 24, 36], true)) json_out(['error' => 'Tray size must be 12, 24 or 36.'], 422);

    // Fresh stock cannot drop below what confirmed orders have already reserved.
    $reserved = stock_map($pdo)[$key]['reserved'] ?? 0;
    if ($vals['fresh'] < $reserved) {
        json_out(['error' => 'Fresh stock cannot be set below ' . number_format($reserved)
            . ' eggs: that many are reserved for confirmed orders. Complete or cancel those orders first.'], 409);
    }

    $exists = $pdo->prepare('SELECT 1 FROM inventory WHERE size_key = ?');
    $exists->execute([$key]);
    if ($exists->fetchColumn()) {
        $pdo->prepare('UPDATE inventory SET tray_size=?, fresh=?, near_expiry=?, unsellable=? WHERE size_key=?')
            ->execute([$tray, $vals['fresh'], $vals['near_expiry'], $vals['unsellable'], $key]);
    } else {
        $pdo->prepare('INSERT INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES (?,?,?,?,?)')
            ->execute([$key, $tray, $vals['fresh'], $vals['near_expiry'], $vals['unsellable']]);
    }
    json_out(['ok' => true]);
}

$stock = stock_map($pdo);
$rows  = $pdo->query('SELECT size_key, tray_size, fresh, near_expiry, unsellable FROM inventory')->fetchAll();
foreach ($rows as &$r) {
    $r['reserved'] = $stock[$r['size_key']]['reserved'] ?? 0;
}
unset($r);
json_out(['rows' => $rows]);