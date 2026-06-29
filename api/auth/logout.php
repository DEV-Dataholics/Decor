<?php
// api/auth/logout.php
require_once '../config/response.php';
set_json_headers();

session_start();
session_destroy();
echo json_encode(['ok' => true, 'message' => 'Sesión cerrada']);
