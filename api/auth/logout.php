<?php
// api/auth/logout.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

// session_start() ya se ejecuta en db.php
if (!empty($_SESSION['user'])) {
    log_activity('AUTH', 'LOGOUT', "El usuario '{$_SESSION['user']['nombre']}' cerró sesión.");
}
session_destroy();
echo json_encode(['ok' => true, 'message' => 'Sesión cerrada']);
