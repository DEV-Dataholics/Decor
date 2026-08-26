<?php
// api/tiendas/save.php
// POST o PUT: Crea o actualiza una tienda / sucursal
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

$nombre = trim($input['nombre'] ?? '');
$ciudad = trim($input['ciudad'] ?? 'Chihuahua');
$direccion = trim($input['direccion'] ?? '');
$telefono = trim($input['telefono'] ?? '');
$activa = isset($input['activa']) ? (int)(bool)$input['activa'] : 1;
$encargado_id = isset($input['encargado_id']) && is_numeric($input['encargado_id']) ? (int)$input['encargado_id'] : null;

if (empty($nombre)) {
    errorResponse('El nombre de la sucursal es obligatorio', 400);
}

try {
    $pdo = getDB();

    if ($id) {
        // Actualizar
        $stmt = $pdo->prepare("
            UPDATE tiendas 
            SET nombre = :nombre, ciudad = :ciudad, direccion = :direccion,
                telefono = :telefono, activa = :activa, encargado_id = :encargado_id
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'           => $id,
            ':nombre'       => $nombre,
            ':ciudad'       => $ciudad,
            ':direccion'    => $direccion,
            ':telefono'     => $telefono,
            ':activa'       => $activa,
            ':encargado_id' => $encargado_id
        ]);
        json_ok(['id' => $id, 'mensaje' => 'Sucursal actualizada con éxito']);
    } else {
        // Crear
        $stmt = $pdo->prepare("
            INSERT INTO tiendas (nombre, ciudad, direccion, telefono, activa, encargado_id)
            VALUES (:nombre, :ciudad, :direccion, :telefono, :activa, :encargado_id)
        ");
        $stmt->execute([
            ':nombre'       => $nombre,
            ':ciudad'       => $ciudad,
            ':direccion'    => $direccion,
            ':telefono'     => $telefono,
            ':activa'       => $activa,
            ':encargado_id' => $encargado_id
        ]);
        $newId = (int)$pdo->lastInsertId();
        json_ok(['id' => $newId, 'mensaje' => 'Sucursal creada con éxito']);
    }
} catch (PDOException $e) {
    errorResponse('Error al guardar sucursal: ' . $e->getMessage(), 500);
}
