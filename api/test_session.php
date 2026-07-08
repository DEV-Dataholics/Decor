<?php
// api/test_session.php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/response.php';

set_json_headers();

echo json_encode([
    'session_name' => session_name(),
    'session_id' => session_id(),
    'session_status' => session_status(),
    'cookie_params' => session_get_cookie_params(),
    'env_loaded' => defined('DB_HOST') ? 'Yes' : 'No',
    'app_env' => defined('APP_ENV') ? APP_ENV : 'undefined',
    'session_name_defined' => defined('SESSION_NAME') ? SESSION_NAME : 'undefined',
    'session_val' => $_SESSION['user'] ?? null,
    'headers_sent' => headers_sent(),
], JSON_PRETTY_PRINT);
