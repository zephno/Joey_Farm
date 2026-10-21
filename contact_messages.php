<?php
declare(strict_types=1);
require __DIR__ . '/includes/config.php';

require_xhr();
$me = current_user();
if (!$me) json_out(['error' => 'Please log in first.'], 401);

$pdo = db();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = json_body();
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

        $stmt = $pdo->prepare(
            'INSERT INTO contact_messages (user_id, sender_name, sender_email, message) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([(int)$me['id'], $name, $email, $message]);
        json_out(['ok' => true, 'id' => (int)$pdo->lastInsertId()], 201);
    }

    if (!in_array($action, ['mark_read', 'archive'], true)) {
        json_out(['error' => 'Unknown action.'], 400);
    }
    if ($me['role'] !== 'staff') json_out(['error' => 'Staff only.'], 403);
    $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) json_out(['error' => 'Invalid message.'], 422);

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
    'SELECT id, sender_name, sender_email, message, status, created_at, read_at
     FROM contact_messages ORDER BY created_at DESC, id DESC'
);
json_out(['messages' => $stmt->fetchAll()]);
