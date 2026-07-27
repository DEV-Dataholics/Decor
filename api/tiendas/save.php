<?php
// api/tiendas/save.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin']);

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_body();
    $id = isset($data['id']) ? (int)$data['id'] : null;
    $action = $data['action'] ?? '';

    $nombre = trim($data['nombre'] ?? '');
    $ciudad = trim($data['ciudad'] ?? '');
    $direccion = trim($data['direccion'] ?? '');
    $telefono = trim($data['telefono'] ?? '');
    $activa = isset($data['activa']) ? (int)$data['activa'] : 1;

    if ($action === 'delete') {
        if (!$id) {
            json_error('ID requerido para eliminar', 422);
        }
        try {
            $stmt = $pdo->prepare("UPDATE tiendas SET activa = 0 WHERE id = ?");
            $stmt->execute([$id]);
            json_ok(['mensaje' => 'Tienda desactivada correctamente']);
        } catch (PDOException $e) {
            json_error('Error al desactivar tienda: ' . $e->getMessage(), 500);
        }
        exit;
    }

    if (!$nombre || !$ciudad) {
        json_error('Nombre y ciudad son requeridos', 422);
    }

    if ($id) {
        // Editar
        try {
            $stmt = $pdo->prepare("
                UPDATE tiendas 
                SET nombre = ?, ciudad = ?, direccion = ?, telefono = ?, activa = ?
                WHERE id = ?
            ");
            $stmt->execute([$nombre, $ciudad, $direccion, $telefono, $activa, $id]);
            json_ok(['mensaje' => 'Tienda actualizada correctamente']);
        } catch (PDOException $e) {
            json_error('Error al actualizar tienda: ' . $e->getMessage(), 500);
        }
    } else {
        // Crear
        try {
            $stmt = $pdo->prepare("
                INSERT INTO tiendas (nombre, ciudad, direccion, telefono, activa)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nombre, $ciudad, $direccion, $telefono, $activa]);
            json_ok(['mensaje' => 'Tienda creada correctamente', 'id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            json_error('Error al crear tienda: ' . $e->getMessage(), 500);
        }
    }
}
