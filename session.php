<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

$u = current_user();
header('Cache-Control: no-store');
json_out($u
    ? ['loggedIn' => true, 'id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role']]
    : ['loggedIn' => false]
);
