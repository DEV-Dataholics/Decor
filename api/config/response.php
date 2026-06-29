<?php
// api/config/response.php
// Helpers para respuestas JSON estandarizadas

function json_ok($data, int $code = 200): void {
    set_json_headers();
    http_response_code($code);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $code = 400): void {
    set_json_headers();
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// Aliases para compatibilidad
function successResponse($data, int $code = 200) { json_ok($data, $code); }
function errorResponse(string $message, int $code = 400) { json_error($message, $code); }

function set_json_headers(): void {
    // Configuración de CORS
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Permitir explícitamente localhost para desarrollo
    if (empty($origin) || preg_match('/^http:\/\/localhost(:\d+)?$/', $origin)) {
        header("Access-Control-Allow-Origin: " . ($origin ?: 'http://localhost:3000'));
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
        exit(0); 
    }
}

function get_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function require_role(array $allowed_roles): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // MODO DEV: Auto-login como admin para facilitar el desarrollo local sin pantalla de login
    if (empty($_SESSION['user']) && preg_match('/localhost/', $_SERVER['HTTP_HOST'] ?? '')) {
        $_SESSION['user'] = [
            'id' => 1,
            'nombre' => 'Dev Admin',
            'rol' => 'admin',
            'tienda_id' => 1
        ];
    }

    if (empty($_SESSION['user'])) {
        json_error('No autenticado', 401);
    }
    if (!in_array($_SESSION['user']['rol'], $allowed_roles)) {
        json_error('Sin permisos para esta acción', 403);
    }
}

function current_user(): array {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return $_SESSION['user'] ?? [];
}
