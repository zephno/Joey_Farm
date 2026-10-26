<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // The static login modal sends an XMLHttpRequest header, which browsers will not
    // let another site add, so only the plain HTML form needs the CSRF token.
    if (!wants_json()) {
        csrf_check();
    }
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $pass  = (string)($_POST['password'] ?? '');

    $stmt = db()->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'    => (int)$user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];
        $to = LANDING[$user['role']] ?? 'Index.html';
        if (wants_json()) {
            json_out(['ok' => true, 'redirect' => $to]);
        }
        redirect($to);
    }

    $error = 'Incorrect email or password.';
    if (wants_json()) {
        json_out(['ok' => false, 'error' => $error], 401);
    }
}

if (current_user() && $_SERVER['REQUEST_METHOD'] === 'GET') {
    redirect(LANDING[current_user()['role']] ?? 'Index.html');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Joey's Farm | Login</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="main.css">
    <link rel="stylesheet" href="brand.css?v=6">
</head>
<body>
<div class="container" style="max-width:420px;padding-top:80px">
    <div class="modal-content p-4">
        <h1 class="h4 mb-3">Login to Joey's Farm</h1>
        <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
        <form method="post" action="login.php">
            <?= csrf_field() ?>
            <div class="form-group modal-body p-0">
                <label for="email">Email address</label>
                <input type="email" class="form-control" id="email" name="email" required autofocus>
            </div>
            <div class="form-group modal-body p-0 mt-3">
                <label for="password">Password</label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block mt-3">Login</button>
        </form>
        <p class="small mt-3 mb-0">No account? <a href="register.php">Sign up</a> &middot; <a href="Index.html">Back to home</a></p>
    </div>
</div>
</body>
</html>