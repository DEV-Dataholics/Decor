<?php
// api/auth/login.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

// session_start() ya se ejecuta en db.php

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$pass  = trim($data['password'] ?? '');

if (!$email || !$pass) {
    json_error('Email y contraseña son obligatorios', 422);
}

try {
    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        json_error('Credenciales incorrectas', 401);
    }

    // Regenerar ID de sesión por seguridad
    session_regenerate_id(true);

    // Guardar en sesión (sin exponer password_hash)
    $_SESSION['user'] = [
        'id'     => (int)$user['id'],
        'nombre' => $user['nombre'],
        'email'  => $user['email'],
        'rol'    => $user['rol'],
    ];

    echo json_encode(['ok' => true, 'user' => $_SESSION['user']], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    json_error('Error interno: ' . $e->getMessage(), 500);
}
