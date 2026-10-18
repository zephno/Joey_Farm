<?php
declare(strict_types=1);

/* ---- Database settings (XAMPP defaults) ---- */
const DB_HOST = '127.0.0.1';
const DB_NAME = 'joeys_farm';
const DB_USER = 'root';
const DB_PASS = '';

/* ---- Where each role lands after login ---- */
const LANDING = [
    'staff'    => 'staff.html',
    'customer' => 'customer-orders.html',
];

date_default_timezone_set('Asia/Manila');

session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
session_start();

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

function e(?string $s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function wants_json(): bool
{
    return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest';
}

function json_out(array $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

/* ---- JSON API helpers (orders.php, inventory.php) ---- */
function require_xhr(): void
{
    // Browsers will not let another website add this header, so it doubles as CSRF protection.
    if (!wants_json()) {
        json_out(['error' => 'Bad request.'], 400);
    }
}

function json_body(): array
{
    $data = json_decode((string)file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

/* ---- CSRF ---- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Invalid or expired form. Go back, refresh the page and try again.');
    }
}

/* ---- Flash messages ---- */
function flash(string $type, string $msg): void
{
    $_SESSION['flash'][] = ['type' => $type, 'msg' => $msg];
}

function flash_render(): string
{
    $out = '';
    foreach ($_SESSION['flash'] ?? [] as $f) {
        $out .= '<div class="alert alert-' . e($f['type']) . ' alert-dismissible fade show" role="alert">'
              . e($f['msg'])
              . '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';
    }
    unset($_SESSION['flash']);
    return $out;
}

/* ---- Auth ---- */
function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_login(?string $role = null): array
{
    $u = current_user();
    if (!$u) {
        redirect('Index.html?login=1');
    }
    if ($role !== null && $u['role'] !== $role) {
        http_response_code(403);
        exit('Access denied: this page is for ' . e($role) . ' accounts only.');
    }
    return $u;
}
