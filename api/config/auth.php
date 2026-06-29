<?php
// api/config/auth.php
// Middleware de sesión y control de roles

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Verifica que el usuario tenga una sesión activa.
 * Si no, detiene la ejecución con 401.
 */
function requireAuth(): array {
    if (empty($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['error' => 'No autenticado']);
        exit;
    }
    return $_SESSION['user'];
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * @param string[] $roles Lista de roles permitidos
 */
function requireRole(array $roles): array {
    $user = requireAuth();
    if (!in_array($user['rol'], $roles, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado']);
        exit;
    }
    return $user;
}

/**
 * Roles válidos del sistema
 */
const ROLES = [
    'admin',            // Sergio/Norma — acceso total
    'gerente_tienda',   // Norma — pedidos, POS, inventario, reportes
    'encargado_taller', // Víctor — producción, materiales, embarques
    'cajero',           // Solo ventas y consulta inventario tienda
    'carpintero',       // Solo sus work_orders
    'bodega',           // Entradas/salidas de materiales del taller
];
