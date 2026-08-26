<?php
// api/clientes/save.php
// POST o PUT: Crea o actualiza un cliente
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'cajero']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

$nombre    = trim($input['nombre'] ?? '');
$tipo      = trim($input['tipo'] ?? 'particular');
// Normalizar tipo según ENUM ('mayorista','tienda_propia','disenador','publico_general')
$tipoMap = [
    'particular'       => 'publico_general',
    'publico_general'  => 'publico_general',
    'mayorista'        => 'mayorista',
    'arquitecto'       => 'disenador',
    'disenador'        => 'disenador',
    'distribuidor'     => 'tienda_propia',
    'tienda_propia'    => 'tienda_propia'
];
$tipoDB = $tipoMap[$tipo] ?? 'publico_general';

$email     = trim($input['email'] ?? '');
$telefono  = trim($input['telefono'] ?? '');
$direccion = trim($input['direccion'] ?? '');
$ciudad    = trim($input['ciudad'] ?? 'Chihuahua');
$credito_activo = isset($input['credito_activo']) ? (int)(bool)$input['credito_activo'] : 0;
$limite_credito = isset($input['limite_credito']) ? (float)$input['limite_credito'] : 0.00;
$activo    = isset($input['activo']) ? (int)(bool)$input['activo'] : 1;
$userId    = $_SESSION['user_id'] ?? 1;

if (empty($nombre)) {
    errorResponse('El nombre del cliente es obligatorio', 400);
}

try {
    $pdo = getDB();

    if ($id) {
        // Actualizar
        $stmt = $pdo->prepare("
            UPDATE clientes 
            SET nombre = :nombre, tipo = :tipo, email = :email, telefono = :telefono,
                ciudad = :ciudad, credito_activo = :credito_activo, limite_credito = :limite_credito,
                activo = :activo
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'             => $id,
            ':nombre'         => $nombre,
            ':tipo'           => $tipoDB,
            ':email'          => $email,
            ':telefono'       => $telefono,
            ':ciudad'         => $ciudad,
            ':credito_activo' => $credito_activo,
            ':limite_credito' => $limite_credito,
            ':activo'         => $activo
        ]);
        json_ok(['id' => $id, 'mensaje' => 'Cliente actualizado con éxito']);
    } else {
        // Crear
        $stmt = $pdo->prepare("
            INSERT INTO clientes (nombre, tipo, email, telefono, ciudad, credito_activo, limite_credito, activo, creado_por)
            VALUES (:nombre, :tipo, :email, :telefono, :ciudad, :credito_activo, :limite_credito, :activo, :creado_por)
        ");
        $stmt->execute([
            ':nombre'         => $nombre,
            ':tipo'           => $tipoDB,
            ':email'          => $email,
            ':telefono'       => $telefono,
            ':ciudad'         => $ciudad,
            ':credito_activo' => $credito_activo,
            ':limite_credito' => $limite_credito,
            ':activo'         => $activo,
            ':creado_por'     => $userId
        ]);
        $newId = (int)$pdo->lastInsertId();
        json_ok(['id' => $newId, 'mensaje' => 'Cliente registrado con éxito']);
    }
} catch (PDOException $e) {
    errorResponse('Error al guardar cliente: ' . $e->getMessage(), 500);
}
