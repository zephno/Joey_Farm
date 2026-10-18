<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/stock.php';

// Public read-only product list, shaped like the `products` object in Product-script.js,
// plus live stock: how many eggs (and so how many trays of each size) can still be ordered.
header('Cache-Control: no-store');

$pdo   = db();
$stock = stock_map($pdo);

$out = [];
foreach ($pdo->query('SELECT * FROM products WHERE is_active = 1 ORDER BY id') as $p) {
    $eggs = $stock[$p['size_key']]['available'] ?? 0;   // no inventory row = nothing to sell
    $out[$p['size_key']] = [
        'title'  => $p['title'],
        'desc'   => $p['description'],
        'image'  => $p['image'],
        'prices' => ['12' => (float)$p['price_12'], '24' => (float)$p['price_24'], '36' => (float)$p['price_36']],
        'stock'  => [
            'eggs'  => $eggs,
            'trays' => ['12' => intdiv($eggs, 12), '24' => intdiv($eggs, 24), '36' => intdiv($eggs, 36)],
        ],
    ];
}
json_out($out);