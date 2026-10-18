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
            // Give the new size an (empty) inventory row so stock can be tracked. Until staff add
            // fresh eggs, customers see it as out of stock.
            try {
                $has = $pdo->prepare('SELECT 1 FROM inventory WHERE size_key = ?');
                $has->execute([$f['size_key']]);
                if (!$has->fetchColumn()) {
                    $pdo->prepare('INSERT INTO inventory (size_key, tray_size, fresh, near_expiry, unsellable) VALUES (?,36,0,0,0)')
                        ->execute([$f['size_key']]);
                }
            } catch (Throwable $e) { /* inventory table missing: product still saved */ }
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
<div class="wireframe-box">
    <h1 class="section-title"><?= $isEdit ? 'Edit product #' . (int)$editing['id'] : 'Add product' ?></h1>
    <form method="post" action="staff-products.php">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="<?= $isEdit ? 'edit' : 'add' ?>">
        <input type="hidden" name="id" value="<?= $isEdit ? (int)$editing['id'] : 0 ?>">
        <div class="form-row">
            <div class="form-group col-md-3"><label for="size_key">Size key (used in URL)</label>
                <input class="form-control" id="size_key" name="size_key" value="<?= $v('size_key') ?>" placeholder="e.g. extralarge" required></div>
            <div class="form-group col-md-3"><label for="title">Title</label>
                <input class="form-control" id="title" name="title" value="<?= $v('title') ?>" required></div>
            <div class="form-group col-md-6"><label for="image">Image path</label>
                <input class="form-control" id="image" name="image" value="<?= $v('image') ?>" placeholder="images/Large_Egg.jpg"></div>
        </div>
        <div class="form-group"><label for="description">Description</label>
            <textarea class="form-control" id="description" name="description" rows="3"><?= $v('description') ?></textarea></div>
        <div class="form-row">
            <?php foreach (['price_12' => '12-egg tray', 'price_24' => '24-egg tray', 'price_36' => '36-egg tray'] as $k => $label): ?>
            <div class="form-group col-md-3"><label for="<?= $k ?>">Price: <?= $label ?> (₱)</label>
                <input type="number" step="0.01" min="0" class="form-control" id="<?= $k ?>" name="<?= $k ?>" value="<?= $v($k) ?>" required></div>
            <?php endforeach; ?>
            <div class="form-group col-md-3 d-flex align-items-end">
                <div class="custom-control custom-checkbox mb-2">
                    <input type="checkbox" class="custom-control-input" id="is_active" name="is_active" <?= $active ? 'checked' : '' ?>>
                    <label class="custom-control-label" for="is_active">Visible to customers</label>
                </div>
            </div>
        </div>
        <button class="btn-pill-action" type="submit"><?= $isEdit ? 'Save changes' : 'Add product' ?></button>
        <?php if ($isEdit): ?><a class="btn btn-link" href="staff-products.php">Cancel</a><?php endif; ?>
    </form>
</div>

<h2 class="section-title">Product Maintenance</h2>
<div class="table-responsive">
    <table class="table wireframe-table">
        <thead><tr><th>ID</th><th>Size key</th><th>Title</th><th>12-egg</th><th>24-egg</th><th>36-egg</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
        <?php foreach ($products as $p): ?>
            <tr>
                <td><?= (int)$p['id'] ?></td>
                <td><?= e($p['size_key']) ?></td>
                <td><span class="size-badge"><?= e($p['title']) ?></span></td>
                <td><?= $peso($p['price_12']) ?></td>
                <td><?= $peso($p['price_24']) ?></td>
                <td><?= $peso($p['price_36']) ?></td>
                <td><span class="badge <?= $p['is_active'] ? 'badge-success' : 'badge-secondary' ?> px-3 py-2"><?= $p['is_active'] ? 'Active' : 'Hidden' ?></span></td>
                <td>
                    <a class="btn-pill-action" href="staff-products.php?edit=<?= (int)$p['id'] ?>">Edit</a>
                    <form method="post" action="staff-products.php" class="d-inline"
                          onsubmit="return confirm('Delete <?= e(addslashes($p['title'])) ?>? This cannot be undone.');">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                        <button class="btn btn-danger btn-sm" style="border-radius:20px" type="submit">Delete</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php staff_footer();