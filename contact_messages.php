<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/discounts.php';

require_xhr();
$me = current_user();
if (!$me) json_out(['error' => 'Please log in first.'], 401);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
ensure_discount_schema($pdo);

/* Every message must carry a photo, so the table needs somewhere to remember it.
   Added automatically the first time this runs (same idea as orders.completed_at). */
try {
    $pdo->query('SELECT image_file, image_mime FROM contact_messages LIMIT 1');
} catch (Throwable $e) {
    try { $pdo->exec('ALTER TABLE contact_messages ADD COLUMN image_file VARCHAR(64) NULL'); } catch (Throwable $e2) { /* ignore */ }
    try { $pdo->exec('ALTER TABLE contact_messages ADD COLUMN image_mime VARCHAR(30) NULL'); } catch (Throwable $e2) { /* ignore */ }
}

// A report can name the (delivered) order it is about, so a discount can only be given once per order.
try {
    $pdo->query('SELECT order_id FROM contact_messages LIMIT 1');
} catch (Throwable $e) {
    try { $pdo->exec('ALTER TABLE contact_messages ADD COLUMN order_id INT UNSIGNED NULL'); } catch (Throwable $e2) { /* ignore */ }
}

const CONTACT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // matches PHP's default upload_max_filesize (2M)
const CONTACT_IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

if ($method === 'POST') {
    // A photo bigger than PHP's post_max_size arrives as an EMPTY multipart request.
    if (empty($_POST) && empty($_FILES)
        && str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data')
        && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        json_out(['error' => 'That photo is too large. Please choose one under 2 MB.'], 413);
    }

    // New messages arrive as multipart form data (they carry a photo); staff actions arrive as JSON.
    $body = !empty($_POST) ? $_POST : json_body();
    $action = $body['action'] ?? '';

    if ($action === 'create') {
        if ($me['role'] !== 'customer') json_out(['error' => 'Customer accounts only.'], 403);
        $nameValue = $body['name'] ?? null;
        $emailValue = $body['email'] ?? null;
        $messageValue = $body['message'] ?? null;
        if (!is_string($nameValue) || !is_string($emailValue)) {
            json_out(['error' => 'Please provide a valid name and email address.'], 422);
        }
        if (!is_string($messageValue)) {
            json_out(['error' => 'Please enter a message of up to 5,000 characters.'], 422);
        }
        $name = trim($nameValue);
        $email = strtolower(trim($emailValue));
        $message = trim($messageValue);
        if ($name === '' || strlen($name) > 100 || $email === '' || strlen($email) > 150
            || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_out(['error' => 'Please provide a valid name and email address.'], 422);
        }
        if ($message === '' || strlen($message) > 20000 || !preg_match('//u', $message)) {
            json_out(['error' => 'Please enter a message of up to 5,000 characters.'], 422);
        }
        $characterCount = preg_match_all('/./us', $message);
        if ($characterCount === false || $characterCount > 5000) {
            json_out(['error' => 'Please enter a message of up to 5,000 characters.'], 422);
        }

        /* ---- the order this report is about (optional for general messages) ---- */
        $orderId = null;
        $orderRaw = $body['order_id'] ?? '';
        if ($orderRaw !== '' && $orderRaw !== null) {
            $orderId = filter_var($orderRaw, FILTER_VALIDATE_INT);
            if (!$orderId || $orderId < 1) json_out(['error' => 'Please choose one of your delivered orders.'], 422);
            $o = $pdo->prepare("SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'completed'");
            $o->execute([$orderId, (int)$me['id']]);
            if (!$o->fetch()) json_out(['error' => 'Please choose one of your delivered orders.'], 422);
            $dup = $pdo->prepare('SELECT 1 FROM discount_grants WHERE order_id = ?');
            $dup->execute([$orderId]);
            if ($dup->fetch()) json_out(['error' => 'A report for this order has already been verified.'], 409);
        }

        /* ---- the required photo ---- */
        $file = $_FILES['image'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            json_out(['error' => 'Please attach a photo to your message.'], 422);
        }
        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
            || (int)$file['size'] > CONTACT_MAX_IMAGE_BYTES) {
            json_out(['error' => 'That photo is too large. Please choose one under 2 MB.'], 422);
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            json_out(['error' => 'The photo could not be uploaded. Please try again.'], 422);
        }
        // Check what the file REALLY is (not what its name or the browser says it is).
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $dims = @getimagesize($file['tmp_name']);
        if (!is_string($mime) || !isset(CONTACT_IMAGE_TYPES[$mime]) || $dims === false || $dims[0] < 1 || $dims[1] < 1) {
            json_out(['error' => 'Please attach a JPG, PNG or WebP photo.'], 422);
        }

        $dir = __DIR__ . '/uploads/contact';
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            json_out(['error' => 'The server could not store the photo. Please tell the farm staff.'], 500);
        }
        // Never let the web server hand these files out directly or run anything in here.
        if (!is_file($dir . '/.htaccess')) {
            @file_put_contents($dir . '/.htaccess',
                "# Photos are only served through contact_image.php (staff only).\n" .
                "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n" .
                "<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        }
        $stored = bin2hex(random_bytes(16)) . '.' . CONTACT_IMAGE_TYPES[$mime];
        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $stored)) {
            json_out(['error' => 'The server could not store the photo. Please tell the farm staff.'], 500);
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO contact_messages (user_id, sender_name, sender_email, message, image_file, image_mime, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([(int)$me['id'], $name, $email, $message, $stored, $mime, $orderId]);
        } catch (Throwable $e) {
            @unlink($dir . '/' . $stored);      // no orphan photos if the message could not be saved
            json_out(['error' => 'Could not send your message. Please try again.'], 500);
        }
        json_out(['ok' => true, 'id' => (int)$pdo->lastInsertId()], 201);
    }

    if (!in_array($action, ['mark_read', 'archive', 'grant_discount'], true)) {
        json_out(['error' => 'Unknown action.'], 400);
    }
    if ($me['role'] !== 'staff') json_out(['error' => 'Staff only.'], 403);
    $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) json_out(['error' => 'Invalid message.'], 422);

    if ($action === 'grant_discount') {
        // Staff have looked at the photo and confirm the eggs were really cracked:
        // the customer gets a flat discount on their next order (once per report).
        $m = $pdo->prepare('SELECT id, user_id, order_id FROM contact_messages WHERE id = ?');
        $m->execute([$id]);
        $msg = $m->fetch();
        if (!$msg) json_out(['error' => 'Message not found.'], 404);
        if (!$msg['user_id']) json_out(['error' => 'This message has no customer account to give a discount to.'], 422);
        if (!$msg['order_id']) json_out(['error' => 'This message is not linked to an order, so no discount can be given.'], 422);
        // The order must really be one of this customer's delivered orders.
        $o = $pdo->prepare("SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'completed'");
        $o->execute([(int)$msg['order_id'], (int)$msg['user_id']]);
        if (!$o->fetch()) json_out(['error' => 'The linked order is not a delivered order of this customer.'], 422);
        $dup = $pdo->prepare('SELECT 1 FROM discount_grants WHERE order_id = ?');
        $dup->execute([(int)$msg['order_id']]);
        if ($dup->fetch()) json_out(['error' => 'A report for this order was already verified. Only one discount per order.'], 409);
        try {
            $pdo->prepare('INSERT INTO discount_grants (user_id, message_id, order_id, percent, granted_by) VALUES (?, ?, ?, ?, ?)')
                ->execute([(int)$msg['user_id'], $id, (int)$msg['order_id'], REPORT_DISCOUNT_PERCENT, (int)$me['id']]);
        } catch (Throwable $e) {
            json_out(['error' => 'A discount was already given for this report or for this order.'], 409);
        }
        $pdo->prepare("UPDATE contact_messages SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND status = 'unread'")
            ->execute([$id]);
        json_out(['ok' => true]);
    }

    if ($action === 'mark_read') {
        $stmt = $pdo->prepare(
            "UPDATE contact_messages SET status = 'read', read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND status = 'unread'"
        );
    } elseif ($action === 'archive') {
        $stmt = $pdo->prepare(
            "UPDATE contact_messages SET status = 'archived', read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND status <> 'archived'"
        );
    }
    $stmt->execute([$id]);
    if (!$stmt->rowCount()) {
        $check = $pdo->prepare('SELECT id FROM contact_messages WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetch()) json_out(['error' => 'Message not found.'], 404);
    }
    json_out(['ok' => true]);
}

if ($method !== 'GET') json_out(['error' => 'Method not allowed.'], 405);
if ($me['role'] !== 'staff') json_out(['error' => 'Staff only.'], 403);

$stmt = $pdo->query(
    'SELECT id, sender_name, sender_email, message, status, created_at, read_at,
            CASE WHEN image_file IS NULL THEN 0 ELSE 1 END AS has_image,
            (SELECT COUNT(*) FROM discount_grants g WHERE g.message_id = contact_messages.id) AS discount_granted,
            contact_messages.order_id AS order_id,
            (SELECT o.receipt_no FROM orders o WHERE o.id = contact_messages.order_id) AS order_receipt,
            (SELECT COUNT(*) FROM discount_grants g2 WHERE g2.order_id = contact_messages.order_id) AS order_discounted
     FROM contact_messages ORDER BY created_at DESC, id DESC'
);
$rows = $stmt->fetchAll();
foreach ($rows as &$r) {
    $r['discount_granted'] = (int)$r['discount_granted'] > 0;
    $r['order_discounted'] = (int)$r['order_discounted'] > 0;      // some report for this order was already verified
    $r['order_id'] = $r['order_id'] !== null ? (int)$r['order_id'] : null;
    $r['has_image'] = (bool)$r['has_image'];     // the file name itself is never sent to the browser
}
unset($r);
json_out(['messages' => $rows]);