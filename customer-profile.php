<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$user = current_user();
if (!$user) json_out(['error' => 'Please log in first.'], 401);
if ($user['role'] !== 'customer') json_out(['error' => 'Customer accounts only.'], 403);

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT name, address, contact FROM users WHERE id = ? AND role = \'customer\'');
    $stmt->execute([(int)$user['id']]);
    $profile = $stmt->fetch();
    if (!$profile) json_out(['error' => 'Customer account not found.'], 404);
    json_out($profile);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    json_out(['error' => 'Method not allowed.'], 405);
}

require_xhr();
$details = json_body();
$name = trim((string)($details['name'] ?? ''));
$address = trim((string)($details['address'] ?? ''));
$contact = trim((string)($details['contact'] ?? ''));

if ($name === '' || $address === '') {
    json_out(['error' => 'Name and address are required.'], 422);
}
if (strlen($name) > 100 || strlen($address) > 255) {
    json_out(['error' => 'Name or address is too long.'], 422);
}
if (!preg_match('/^09[0-9]{9}$/', $contact)) {
    json_out(['error' => 'Contact number must be exactly 11 digits starting with 09 (e.g. 09123456789).'], 422);
}

$stmt = $pdo->prepare('UPDATE users SET name = ?, address = ?, contact = ? WHERE id = ? AND role = \'customer\'');
$stmt->execute([$name, $address, $contact, (int)$user['id']]);
$_SESSION['user']['name'] = $name;

json_out(['ok' => true]);
