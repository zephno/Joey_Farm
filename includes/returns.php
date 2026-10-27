<?php
declare(strict_types=1);

/* A broken-egg report must come with a photo as proof, so staff can see the damage before they approve.
   Photos are stored in uploads/returns and can only be opened by staff (return_image.php). */
const RETURN_MAX_IMAGE_BYTES = 2 * 1024 * 1024;   // matches PHP's default upload_max_filesize (2M)
const RETURN_IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

/** The photo columns are added automatically the first time this runs (older databases do not have them). */
function ensure_return_photo_columns(PDO $pdo): void
{
    try {
        $pdo->query('SELECT image_file, image_mime FROM egg_returns LIMIT 1');
    } catch (Throwable $e) {
        try { $pdo->exec('ALTER TABLE egg_returns ADD COLUMN image_file VARCHAR(64) NULL'); } catch (Throwable $e2) { /* ignore */ }
        try { $pdo->exec('ALTER TABLE egg_returns ADD COLUMN image_mime VARCHAR(30) NULL'); } catch (Throwable $e2) { /* ignore */ }
    }
}

/** The optional note staff can leave when approving or rejecting; added automatically on first use. */
function ensure_return_message_column(PDO $pdo): void
{
    try {
        $pdo->query('SELECT staff_message FROM egg_returns LIMIT 1');
    } catch (Throwable $e) {
        try { $pdo->exec('ALTER TABLE egg_returns ADD COLUMN staff_message VARCHAR(500) NULL'); } catch (Throwable $e2) { /* ignore */ }
    }
}

/** Checks the uploaded proof photo and saves it. Returns [stored file name, mime type]. */
function store_return_photo($file): array
{
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new DomainException('Please attach a photo of the broken eggs as proof.');
    }
    if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
        || (int)$file['size'] > RETURN_MAX_IMAGE_BYTES) {
        throw new DomainException('That photo is too large. Please choose one under 2 MB.');
    }
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new DomainException('The photo could not be uploaded. Please try again.');
    }
    // Check what the file REALLY is (not what its name or the browser says it is).
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $dims = @getimagesize($file['tmp_name']);
    if (!is_string($mime) || !isset(RETURN_IMAGE_TYPES[$mime]) || $dims === false || $dims[0] < 1 || $dims[1] < 1) {
        throw new DomainException('Please attach a JPG, PNG or WebP photo.');
    }

    $dir = dirname(__DIR__) . '/uploads/returns';
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new DomainException('The server could not store the photo. Please tell the farm staff.');
    }
    // Never let the web server hand these files out directly or run anything in here.
    if (!is_file($dir . '/.htaccess')) {
        @file_put_contents($dir . '/.htaccess',
            "# Photos are only served through return_image.php (staff only).\n" .
            "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    }
    $stored = bin2hex(random_bytes(16)) . '.' . RETURN_IMAGE_TYPES[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $stored)) {
        throw new DomainException('The server could not store the photo. Please tell the farm staff.');
    }
    return [$stored, $mime];
}

/** Checks the list of sizes the customer picked. Returns [size_key => broken_qty]. */
function normalize_return_items(array $items): array
{
    $clean = [];
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $key = strtolower(trim((string)($item['size_key'] ?? '')));
        $qty = (int)($item['broken_qty'] ?? 0);
        if (!preg_match('/^[a-z0-9_-]{2,30}$/', $key)) {
            throw new DomainException('Invalid egg size selected.');
        }
        if ($qty < 1) {
            throw new DomainException('Please enter a valid number of broken eggs for each selected size.');
        }
        if (isset($clean[$key])) {
            throw new DomainException('Each egg size can only be listed once.');
        }
        $clean[$key] = $qty;
    }
    if (!$clean) {
        throw new DomainException('Please select at least one egg size to report.');
    }
    if (count($clean) > 20) {
        throw new DomainException('Too many egg sizes in one report.');
    }
    return $clean;
}

/**
 * The one entry point for a customer's broken-egg report: one photo, one or more egg sizes.
 * $items is a list of ['size_key' => ..., 'broken_qty' => ...]. Returns the total credit requested.
 * If the report is refused, the photo that was just saved is deleted again.
 */
function report_broken_eggs(PDO $pdo, int $userId, int $orderId, array $items, $photoFile): float
{
    ensure_return_photo_columns($pdo);
    $items = normalize_return_items($items);          // validate before anything is saved
    [$stored, $mime] = store_return_photo($photoFile);
    try {
        return create_broken_egg_returns($pdo, $userId, $orderId, $items, $stored, $mime);
    } catch (Throwable $e) {
        @unlink(dirname(__DIR__) . '/uploads/returns/' . $stored);
        throw $e;
    }
}

function create_broken_egg_returns(PDO $pdo, int $userId, int $orderId, array $items, string $imageFile, string $imageMime): float
{
    if ($imageFile === '' || $imageMime === '') {
        throw new DomainException('Please attach a photo of the broken eggs as proof.');
    }

    $pdo->beginTransaction();
    try {
        $orderSt = $pdo->prepare("SELECT id, total, discount_total FROM orders WHERE id = ? AND user_id = ? AND status = 'completed' FOR UPDATE");
        $orderSt->execute([$orderId, $userId]);
        $order = $orderSt->fetch();
        if (!$order) {
            throw new DomainException('Returns are available only for your delivered orders.');
        }

        // Each order can only be reported once (the order row is locked, so two taps can't both pass).
        $dupSt = $pdo->prepare('SELECT 1 FROM egg_returns WHERE order_id = ? LIMIT 1');
        $dupSt->execute([$orderId]);
        if ($dupSt->fetch()) {
            throw new DomainException('This order has already been reported. Each order can only be reported once.');
        }

        $grossOrderTotal = (float)$order['total'] + (float)$order['discount_total'];
        $paidRatio = $grossOrderTotal > 0
            ? min(1.0, max(0.0, (float)$order['total'] / $grossOrderTotal))
            : 0.0;

        $itemSt = $pdo->prepare(
            'SELECT SUM(qty * tray_size) AS purchased_eggs, SUM(qty * unit_price) AS purchase_value
             FROM order_items WHERE order_id = ? AND size_key = ?'
        );
        $insert = $pdo->prepare(
            "INSERT INTO egg_returns (user_id, order_id, size_key, broken_qty, discount_amount, status, image_file, image_mime)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)"
        );

        $totalDiscount = 0.0;
        foreach ($items as $sizeKey => $brokenQty) {
            $itemSt->execute([$orderId, $sizeKey]);
            $item = $itemSt->fetch();
            $purchased = (int)($item['purchased_eggs'] ?? 0);
            if ($purchased < 1) {
                throw new DomainException('One of the selected egg sizes was not part of this delivered order.');
            }
            if ($brokenQty > $purchased) {
                throw new DomainException('You can return at most ' . $purchased . ' eggs of a size you ordered.');
            }
            $discount = round(((float)$item['purchase_value'] / $purchased) * $brokenQty * $paidRatio, 2);
            $insert->execute([$userId, $orderId, $sizeKey, $brokenQty, $discount, $imageFile, $imageMime]);
            $totalDiscount += $discount;
        }

        $pdo->commit();
        return round($totalDiscount, 2);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}