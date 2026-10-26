<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

$errors = [];
$old = ['name' => '', 'email' => '', 'address' => '', 'contact' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $old = [
        'name'    => trim((string)($_POST['name'] ?? '')),
        'email'   => strtolower(trim((string)($_POST['email'] ?? ''))),
        'address' => trim((string)($_POST['address'] ?? '')),
        'contact' => trim((string)($_POST['contact'] ?? '')),
    ];
    $pass  = (string)($_POST['password'] ?? '');
    $pass2 = (string)($_POST['password2'] ?? '');

    if ($old['name'] === '') $errors[] = 'Name is required.';
    if (!filter_var($old['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'Enter a valid email address.';
    if (strlen($pass) < 6) $errors[] = 'Password must be at least 6 characters.';
    if ($pass !== $pass2) $errors[] = 'Passwords do not match.';
    if ($old['contact'] !== '' && !preg_match('/^09[0-9]{9}$/', $old['contact'])) {
        $errors[] = 'Contact number must be exactly 11 digits starting with 09 (e.g. 09123456789).';
    }

    if (!$errors) {
        $chk = db()->prepare('SELECT 1 FROM users WHERE email = ?');
        $chk->execute([$old['email']]);
        if ($chk->fetchColumn()) {
            $errors[] = 'That email is already registered.';
        }
    }

    if (!$errors) {
        $ins = db()->prepare('INSERT INTO users (name, email, password_hash, role, address, contact) VALUES (?, ?, ?, "customer", ?, ?)');
        $ins->execute([$old['name'], $old['email'], password_hash($pass, PASSWORD_DEFAULT), $old['address'], $old['contact']]);

        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => (int)db()->lastInsertId(), 'name' => $old['name'], 'email' => $old['email'], 'role' => 'customer'];
        redirect(LANDING['customer']);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Joey's Farm | Sign up</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="main.css">
    <link rel="stylesheet" href="brand.css?v=6">
</head>
<body>
<div class="container" style="max-width:480px;padding:60px 15px">
    <div class="modal-content p-4">
        <h1 class="h4 mb-3">Create your account</h1>
        <?php foreach ($errors as $err): ?><div class="alert alert-danger py-2"><?= e($err) ?></div><?php endforeach; ?>
        <form method="post" action="register.php" class="modal-body p-0">
            <?= csrf_field() ?>
            <div class="form-group"><label for="name">Full name</label>
                <input class="form-control" id="name" name="name" value="<?= e($old['name']) ?>" required></div>
            <div class="form-group"><label for="email">Email address</label>
                <input type="email" class="form-control" id="email" name="email" placeholder="e.g. name@example.com" value="<?= e($old['email']) ?>" required></div>
            <div class="form-group"><label for="address">Address</label>
                <input class="form-control" id="address" name="address" value="<?= e($old['address']) ?>"></div>
            <div class="form-group"><label for="contact">Contact No. (11 digits, 09XXXXXXXXX)</label>
                <input type="tel" class="form-control" id="contact" name="contact" maxlength="11" pattern="09[0-9]{9}" inputmode="numeric" oninput="this.value = this.value.replace(/[^0-9]/g, '')" placeholder="09123456789" value="<?= e($old['contact']) ?>" title="Must be 11 digits starting with 09"></div>
            <div class="form-group"><label for="password">Password</label>
                <input type="password" class="form-control" id="password" name="password" minlength="6" required></div>
            <div class="form-group"><label for="password2">Confirm password</label>
                <input type="password" class="form-control" id="password2" name="password2" minlength="6" required></div>
            <button type="submit" class="btn btn-primary btn-block">Sign up</button>
        </form>
        <p class="small mt-3 mb-0">Already registered? <a href="login.php">Login</a> &middot; <a href="Index.html">Back to home</a></p>
    </div>
</div>
</body>
</html>