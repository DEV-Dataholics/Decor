<?php
// api/auth/logout.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

// session_start() ya se ejecuta en db.php
session_destroy();
echo json_encode(['ok' => true, 'message' => 'Sesión cerrada']);
