<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/layout.php';

require_login('staff');
$pdo = db();

/* ------------------------------ ADD / EDIT / DELETE ------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = $_POST['action'] ?? '';
    $id     = (int)($_POST['id'] ?? 0);

    if ($action === 'delete') {
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        flash('success', 'Product deleted.');
        redirect('staff-products.php');
    }

    if ($action === 'add' || $action === 'edit') {
        $f = [
            'size_key'    => strtolower(trim((string)($_POST['size_key'] ?? ''))),
            'title'       => trim((string)($_POST['title'] ?? '')),
            'description' => trim((string)($_POST['description'] ?? '')),
            'image'       => trim((string)($_POST['image'] ?? '')),
            'price_12'    => trim((string)($_POST['price_12'] ?? '')),
            'price_24'    => trim((string)($_POST['price_24'] ?? '')),
            'price_36'    => trim((string)($_POST['price_36'] ?? '')),
            'is_active'   => isset($_POST['is_active']) ? 1 : 0,
        ];
        $errors = [];

        if (!preg_match('/^[a-z0-9_-]{2,30}$/', $f['size_key'])) $errors[] = 'Size key must be 2-30 characters: lowercase letters, numbers, - or _ (e.g. "extralarge").';
        if ($f['title'] === '') $errors[] = 'Title is required.';
        foreach (['price_12' => '12-egg', 'price_24' => '24-egg', 'price_36' => '36-egg'] as $k => $label) {
            if (!is_numeric($f[$k]) || (float)$f[$k] < 0) $errors[] = "The $label tray price must be a number of 0 or more.";
        }

        if (!$errors) {
            $dup = $pdo->prepare('SELECT 1 FROM products WHERE size_key = ? AND id <> ?');
            $dup->execute([$f['size_key'], $id]);
            if ($dup->fetchColumn()) $errors[] = 'That size key is already used by another product.';
        }

        if ($errors) {
            foreach ($errors as $err) flash('danger', $err);
            $_SESSION['old_product'] = $f + ['id' => $id];
            redirect('staff-products.php' . ($action === 'edit' ? '?edit=' . $id : ''));
        }

        $vals = [$f['size_key'], $f['title'], $f['description'], $f['image'], (float)$f['price_12'], (float)$f['price_24'], (float)$f['price_36'], $f['is_active']];
        if ($action === 'add') {
            $pdo->prepare('INSERT INTO products (size_key, title, description, image, price_12, price_24, price_36, is_active) VALUES (?,?,?,?,?,?,?,?)')->execute($vals);
            try {
                $has = $pdo->prepare('SELECT 1 FROM inventory WHERE size_key = ?');
                $has->execute([$f['size_key']]);
                if (!$has->fetchColumn()) {
                    $pdo->prepare('INSERT INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES (?,36,0,0,0)')
                        ->execute([$f['size_key']]);
                }
            } catch (Throwable $e) { }
            flash('success', 'Product added.');
        } else {
            $pdo->prepare('UPDATE products SET size_key=?, title=?, description=?, image=?, price_12=?, price_24=?, price_36=?, is_active=? WHERE id=?')
                ->execute([...$vals, $id]);
            flash('success', 'Product updated.');
        }
        redirect('staff-products.php');
    }
}

/* ------------------------------ LOAD DATA ------------------------------ */
$editing = null;
if (isset($_GET['edit'])) {
    $s = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}
if (!empty($_SESSION['old_product'])) {
    $editing = $_SESSION['old_product'];
    $editing['id'] = $editing['id'] ?: null;
    unset($_SESSION['old_product']);
}
$isEdit = $editing && !empty($editing['id']);
$v = fn(string $k) => e((string)($editing[$k] ?? ''));
$active = $editing ? !empty($editing['is_active']) : true;

$products = $pdo->query('SELECT * FROM products ORDER BY id')->fetchAll();
$peso = fn($n) => '₱ ' . number_format((float)$n, 2);

staff_header('Product Maintenance', 'products');
?>
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="section-title mb-1">Product Maintenance</h2>
        <p class="text-muted small mb-0">Manage egg sizes, tray pricing tiers, and store visibility.</p>
    </div>
</div>

<div class="card content-card mb-4">
    <div class="card-header bg-white py-3">
        <h5 class="mb-0 font-weight-bold text-dark">
            <i class="fas fa-boxes text-primary mr-2"></i><?= $isEdit ? 'Edit Product #' . (int)$editing['id'] : 'Add New Product' ?>
        </h5>
    </div>
    <div class="card-body p-4">
        <form method="post" action="staff-products.php">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="<?= $isEdit ? 'edit' : 'add' ?>">
            <input type="hidden" name="id" value="<?= $isEdit ? (int)$editing['id'] : 0 ?>">
            
            <div class="form-row">
                <div class="form-group col-md-3">
                    <label class="font-weight-bold" for="size_key">Size key (URL identifier)</label>
                    <input class="form-control table-input" id="size_key" name="size_key" value="<?= $v('size_key') ?>" placeholder="e.g. extralarge" required>
                </div>
                <div class="form-group col-md-3">
                    <label class="font-weight-bold" for="title">Title</label>
                    <input class="form-control table-input" id="title" name="title" value="<?= $v('title') ?>" placeholder="e.g. Extra Large Eggs" required>
                </div>
                <div class="form-group col-md-6">
                    <label class="font-weight-bold" for="image">Image path</label>
                    <input class="form-control table-input" id="image" name="image" value="<?= $v('image') ?>" placeholder="images/Large_Egg.jpg">
                </div>
            </div>

            <div class="form-group">
                <label class="font-weight-bold" for="description">Description</label>
                <textarea class="form-control table-input" id="description" name="description" rows="2" placeholder="Product details..."><?= $v('description') ?></textarea>
            </div>

            <div class="form-row align-items-end">
                <?php foreach (['price_12' => '12-egg tray', 'price_24' => '24-egg tray', 'price_36' => '36-egg tray'] as $k => $label): ?>
                <div class="form-group col-md-3">
                    <label class="font-weight-bold" for="<?= $k ?>"><?= $label ?> Price (₱)</label>
                    <input type="number" step="0.01" min="0" class="form-control table-input" id="<?= $k ?>" name="<?= $k ?>" value="<?= $v($k) ?>" required>
                </div>
                <?php endforeach; ?>
                
                <div class="form-group col-md-3 mb-3">
                    <div class="custom-control custom-checkbox">
                        <input type="checkbox" class="custom-control-input" id="is_active" name="is_active" <?= $active ? 'checked' : '' ?>>
                        <label class="custom-control-label font-weight-bold text-secondary" for="is_active">Visible to customers</label>
                    </div>
                </div>
            </div>

            <div class="mt-2">
                <button class="btn btn-primary rounded-pill px-4" type="submit">
                    <i class="fas <?= $isEdit ? 'fa-save' : 'fa-plus' ?> mr-1"></i><?= $isEdit ? 'Save Changes' : 'Add Product' ?>
                </button>
                <?php if ($isEdit): ?>
                    <a class="btn btn-outline-secondary rounded-pill px-4 ml-2" href="staff-products.php">Cancel</a>
                <?php endif; ?>
            </div>
        </form>
    </div>
</div>

<div class="card content-card">
    <div class="card-header bg-white py-3">
        <h5 class="mb-0 font-weight-bold text-dark"><i class="fas fa-list mr-2 text-primary"></i>Product Catalog</h5>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table custom-table mb-0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Size Key</th>
                        <th>Title</th>
                        <th>12-Egg Tray</th>
                        <th>24-Egg Tray</th>
                        <th>36-Egg Tray</th>
                        <th>Status</th>
                        <th class="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($products as $p): ?>
                    <tr>
                        <td class="font-weight-bold text-secondary"><?= (int)$p['id'] ?></td>
                        <td><code><?= e($p['size_key']) ?></code></td>
                        <td><span class="size-badge"><?= e($p['title']) ?></span></td>
                        <td class="font-weight-bold"><?= $peso($p['price_12']) ?></td>
                        <td class="font-weight-bold"><?= $peso($p['price_24']) ?></td>
                        <td class="font-weight-bold"><?= $peso($p['price_36']) ?></td>
                        <td>
                            <span class="badge <?= $p['is_active'] ? 'badge-success' : 'badge-secondary' ?> px-3 py-2">
                                <?= $p['is_active'] ? 'Active' : 'Hidden' ?>
                            </span>
                        </td>
                        <td class="text-center">
                            <a class="btn btn-sm btn-outline-primary rounded-pill px-3" href="staff-products.php?edit=<?= (int)$p['id'] ?>">Edit</a>
                            <form method="post" action="staff-products.php" class="d-inline ml-1"
                                  onsubmit="return confirm('Delete <?= e(addslashes($p['title'])) ?>? This cannot be undone.');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" type="submit">Delete</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php staff_footer(); ?>
