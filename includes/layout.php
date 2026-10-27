<?php
declare(strict_types=1);

function staff_header(string $title, string $active): void
{
    $link = fn(string $href, string $label, string $key) =>
        '<li class="nav-item"><a class="nav-link nav-outline-text' . ($active === $key ? ' active' : '') . '" href="' . $href . '">' . $label . '</a></li>';
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Joey's Farm | <?= e($title) ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="staff.css?v=2">
    <link rel="stylesheet" href="navbar.css">
    <link rel="stylesheet" href="brand.css?v=9">
</head>
<body class="has-fixed-nav">
<nav class="navbar navbar-expand-md fixed-top navbar-solid">
    <a class="navbar-brand farm-brand" href="staff.html"><img src="images/logo.png" alt=""><span>Joey's Farm</span></a>
    <button class="navbar-toggler navbar-dark" type="button" data-toggle="collapse" data-target="#main-navigation">
        <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="main-navigation">
        <ul class="navbar-nav align-items-center">
            <?= $link('staff.html', 'Home', 'home') ?>
            <?= $link('staff.html#inventory-section', 'Inventory', 'inventory') ?>
            <?= $link('staff.html#orders-section', 'Orders', 'orders') ?>
            <?= $link('staff.html#messages-section', 'Messages', 'messages') ?>
            <?= $link('staff-products.php', 'Products', 'products') ?>
            <?= $link('staff-users.php', 'Users', 'users') ?>
            <li class="nav-item"><a class="btn nav-login-btn" href="logout.php">Logout</a></li>
        </ul>
    </div>
</nav>
<div class="container-fluid my-4 px-4">
    <div class="main-container rounded">
        <?= flash_render() ?>
<?php
}

function staff_footer(): void
{
    ?>
    </div>
</div>
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
<?php
}