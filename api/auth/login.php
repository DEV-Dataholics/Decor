<?php
// api/auth/login.php
require_once '../config/response.php';
set_json_headers();

require_once '../config/db.php';

session_start();

$data  = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');
$pass  = trim($data['password'] ?? '');

if (!$email || !$pass) {
    http_response_code(422);
    echo json_encode(['error' => 'Email y contraseña son obligatorios']);
    exit;
}

try {
    $pdo  = getDB();
    $stmt = $pdo->prepare("SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales incorrectas']);
        exit;
    }

    // Guardar en sesión (sin exponer password_hash)
    $_SESSION['user'] = [
        'id'     => $user['id'],
        'nombre' => $user['nombre'],
        'email'  => $user['email'],
        'rol'    => $user['rol'],
    ];

    echo json_encode(['ok' => true, 'user' => $_SESSION['user']]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de servidor']);
}
