<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

// Shows the proof photo a customer attached to a broken-egg report. Staff only: the files in
// uploads/returns cannot be opened directly, so nobody else can guess a link to them.
$me = current_user();
if (!$me || $me['role'] !== 'staff') {
    http_response_code(403);
    exit('Staff only.');
}

$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    http_response_code(404);
    exit('Not found.');
}

$row = false;
try {
    $st = db()->prepare('SELECT image_file, image_mime FROM egg_returns WHERE id = ?');
    $st->execute([$id]);
    $row = $st->fetch();
} catch (Throwable $e) {
    // the photo columns do not exist yet (no report with a photo has been sent)
}

$allowed = ['image/jpeg', 'image/png', 'image/webp'];
$file = $row ? basename((string)$row['image_file']) : '';
$path = __DIR__ . '/uploads/returns/' . $file;
if (!$row || $file === '' || !in_array($row['image_mime'], $allowed, true) || !is_file($path)) {
    http_response_code(404);
    exit('No photo for this report.');
}

header('Content-Type: ' . $row['image_mime']);
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
header('Content-Disposition: inline');
header('Cache-Control: private, max-age=3600');
readfile($path);