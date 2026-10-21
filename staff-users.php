<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';
require __DIR__ . '/includes/layout.php';

$me  = require_login('staff');
$pdo = db();

/* ------------------------------ ADD / EDIT / DELETE ------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = $_POST['action'] ?? '';
    $id     = (int)($_POST['id'] ?? 0);

    if ($action === 'delete') {
        $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $target->execute([$id]);
        $row = $target->fetch();

        if (!$row) {
            flash('danger', 'That user no longer exists.');
        } elseif ($id === $me['id']) {
            flash('danger', 'You cannot delete the account you are logged in with.');
        } elseif ($row['role'] === 'staff' && (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='staff'")->fetchColumn() <= 1) {
            flash('danger', 'You cannot delete the last staff account.');
        } else {
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            flash('success', 'User deleted.');
        }
        redirect('staff-users.php');
    }

    if ($action === 'add' || $action === 'edit') {
        $f = [
            'name'    => trim((string)($_POST['name'] ?? '')),
            'email'   => strtolower(trim((string)($_POST['email'] ?? ''))),
            'role'    => (string)($_POST['role'] ?? 'customer'),
            'address' => trim((string)($_POST['address'] ?? '')),
            'contact' => trim((string)($_POST['contact'] ?? '')),
        ];
        $pass = (string)($_POST['password'] ?? '');
        $errors = [];

        if ($f['name'] === '') $errors[] = 'Name is required.';
        if (!filter_var($f['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
        if (!in_array($f['role'], ['customer', 'staff'], true)) $errors[] = 'Invalid role.';
        if ($f['contact'] !== '' && !preg_match('/^[0-9]{8}$/', $f['contact'])) $errors[] = 'Contact number must be exactly 8 digits.';
        if ($action === 'add' && strlen($pass) < 6) $errors[] = 'Password must be at least 6 characters.';
        if ($action === 'edit' && $pass !== '' && strlen($pass) < 6) $errors[] = 'New password must be at least 6 characters.';

        if (!$errors) {
            $dup = $pdo->prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?');
            $dup->execute([$f['email'], $id]);
            if ($dup->fetchColumn()) $errors[] = 'That email is already used by another account.';
        }

        if (!$errors && $action === 'edit' && $id === $me['id'] && $f['role'] !== 'staff') {
            $errors[] = 'You cannot remove your own staff role.';
        }
        if (!$errors && $action === 'edit') {
            $cur = $pdo->prepare('SELECT role FROM users WHERE id = ?');
            $cur->execute([$id]);
            $curRole = $cur->fetchColumn();
            if ($curRole === 'staff' && $f['role'] !== 'staff'
                && (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='staff'")->fetchColumn() <= 1) {
                $errors[] = 'There must be at least one staff account.';
            }
        }

        if ($errors) {
            foreach ($errors as $err) flash('danger', $err);
            $_SESSION['old_user'] = $f + ['id' => $id];
            redirect('staff-users.php' . ($action === 'edit' ? '?edit=' . $id : ''));
        }

        if ($action === 'add') {
            $pdo->prepare('INSERT INTO users (name, email, password_hash, role, address, contact) VALUES (?,?,?,?,?,?)')
                ->execute([$f['name'], $f['email'], password_hash($pass, PASSWORD_DEFAULT), $f['role'], $f['address'], $f['contact']]);
            flash('success', 'User added.');
        } else {
            $pdo->prepare('UPDATE users SET name=?, email=?, role=?, address=?, contact=? WHERE id=?')
                ->execute([$f['name'], $f['email'], $f['role'], $f['address'], $f['contact'], $id]);
            if ($pass !== '') {
                $pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')
                    ->execute([password_hash($pass, PASSWORD_DEFAULT), $id]);
            }
            if ($id === $me['id']) {
                $_SESSION['user']['name']  = $f['name'];
                $_SESSION['user']['email'] = $f['email'];
            }
            flash('success', 'User updated.');
        }
        redirect('staff-users.php');
    }
}

/* ------------------------------ LOAD DATA ------------------------------ */
$editing = null;
if (isset($_GET['edit'])) {
    $s = $pdo->prepare('SELECT id, name, email, role, address, contact FROM users WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}
if (!empty($_SESSION['old_user'])) {
    $editing = $_SESSION['old_user'] + ['id' => 0];
    $editing['id'] = $editing['id'] ?: null;
    unset($_SESSION['old_user']);
}
$isEdit = $editing && !empty($editing['id']);
$v = fn(string $k) => e((string)($editing[$k] ?? ''));

$users = $pdo->query('SELECT id, name, email, role, address, contact, created_at FROM users ORDER BY role, name')->fetchAll();

staff_header('User Maintenance', 'users');
?>
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="section-title mb-1">User Maintenance</h2>
        <p class="text-muted small mb-0">Manage customer accounts and staff administrative access.</p>
    </div>
</div>

<div class="card content-card mb-4">
    <div class="card-header bg-white py-3">
        <h5 class="mb-0 font-weight-bold text-dark">
            <i class="fas fa-user-cog text-primary mr-2"></i><?= $isEdit ? 'Edit User #' . (int)$editing['id'] : 'Add New User Account' ?>
        </h5>
    </div>
    <div class="card-body p-4">
        <form method="post" action="staff-users.php">
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="<?= $isEdit ? 'edit' : 'add' ?>">
            <input type="hidden" name="id" value="<?= $isEdit ? (int)$editing['id'] : 0 ?>">
            
            <div class="form-row">
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="name">Name</label>
                    <input class="form-control table-input" id="name" name="name" value="<?= $v('name') ?>" required>
                </div>
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="email">Email Address</label>
                    <input type="email" class="form-control table-input" id="email" name="email" value="<?= $v('email') ?>" required>
                </div>
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="role">Role</label>
                    <select class="form-control table-input" id="role" name="role">
                        <?php foreach (['customer', 'staff'] as $r): ?>
                            <option value="<?= $r ?>" <?= ($editing['role'] ?? 'customer') === $r ? 'selected' : '' ?>><?= ucfirst($r) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="address">Address</label>
                    <input class="form-control table-input" id="address" name="address" value="<?= $v('address') ?>">
                </div>
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="contact">Contact No. (8 digits)</label>
                    <input class="form-control table-input" id="contact" name="contact" maxlength="8" pattern="[0-9]{8}" value="<?= $v('contact') ?>">
                </div>
                <div class="form-group col-md-4">
                    <label class="font-weight-bold" for="password"><?= $isEdit ? 'New Password (optional)' : 'Password' ?></label>
                    <input type="password" class="form-control table-input" id="password" name="password" minlength="6" <?= $isEdit ? '' : 'required' ?>>
                </div>
            </div>

            <div class="mt-2">
                <button class="btn btn-primary rounded-pill px-4" type="submit">
                    <i class="fas <?= $isEdit ? 'fa-save' : 'fa-user-plus' ?> mr-1"></i><?= $isEdit ? 'Save Changes' : 'Add User' ?>
                </button>
                <?php if ($isEdit): ?>
                    <a class="btn btn-outline-secondary rounded-pill px-4 ml-2" href="staff-users.php">Cancel</a>
                <?php endif; ?>
            </div>
        </form>
    </div>
</div>

<div class="card content-card">
    <div class="card-header bg-white py-3">
        <h5 class="mb-0 font-weight-bold text-dark"><i class="fas fa-users mr-2 text-primary"></i>User Directory</h5>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table custom-table mb-0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Address</th>
                        <th>Contact</th>
                        <th>Joined</th>
                        <th class="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($users as $u): ?>
                    <tr>
                        <td class="font-weight-bold text-secondary"><?= (int)$u['id'] ?></td>
                        <td class="font-weight-bold"><?= e($u['name']) ?></td>
                        <td><?= e($u['email']) ?></td>
                        <td>
                            <span class="badge <?= $u['role'] === 'staff' ? 'badge-info' : 'badge-secondary' ?> px-3 py-2">
                                <?= ucfirst(e($u['role'])) ?>
                            </span>
                        </td>
                        <td><?= e($u['address']) ?></td>
                        <td><?= e($u['contact']) ?></td>
                        <td class="text-muted small"><?= e(substr($u['created_at'], 0, 10)) ?></td>
                        <td class="text-center">
                            <a class="btn btn-sm btn-outline-primary rounded-pill px-3" href="staff-users.php?edit=<?= (int)$u['id'] ?>">Edit</a>
                            <?php if ((int)$u['id'] !== $me['id']): ?>
                            <form method="post" action="staff-users.php" class="d-inline ml-1"
                                  onsubmit="return confirm('Delete <?= e(addslashes($u['name'])) ?>? This cannot be undone.');">
                                <?= csrf_field() ?>
                                <input type="hidden" name="action" value="delete">
                                <input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
                                <button class="btn btn-sm btn-outline-danger rounded-pill px-3" type="submit">Delete</button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php staff_footer(); ?>
