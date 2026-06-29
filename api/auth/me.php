<?php
// api/auth/me.php
require_once '../config/response.php';
set_json_headers();

session_start();
if (empty($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    exit;
}
echo json_encode($_SESSION['user'], JSON_UNESCAPED_UNICODE);
