<?php
// api/auth/me.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

// session_start() ya se ejecuta en db.php
if (empty($_SESSION['user'])) {
    json_error('No autenticado', 401);
}
echo json_encode(['ok' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_UNICODE);
