<?php
// api/acabados/save.php
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
    $old_nombre = trim($data['old_nombre'] ?? '');
    
    $tipo = $data['tipo'] ?? 'natural';
    $codigo_color = $data['codigo_color'] ?? '#cccccc';
    $descripcion = $data['descripcion'] ?? '';
    $activo = isset($data['activo']) ? (int)$data['activo'] : 1;

    if ($action === 'delete') {
        if (!$nombre) {
            json_error('Nombre requerido para eliminar', 422);
        }
        try {
            $stmt = $pdo->prepare("DELETE FROM acabados WHERE nombre = ?");
            $stmt->execute([$nombre]);
            json_ok(['mensaje' => 'Acabado eliminado correctamente']);
        } catch (PDOException $e) {
            json_error('Error al eliminar acabado: ' . $e->getMessage(), 500);
        }
        exit;
    }

    if (!$nombre) {
        json_error('Nombre del acabado es requerido', 422);
    }

    if ($old_nombre) {
        // Editar por nombre anterior
        try {
            $stmt = $pdo->prepare("
                UPDATE acabados 
                SET nombre = ?, tipo = ?, codigo_color = ?, descripcion = ?, activo = ?
                WHERE nombre = ?
            ");
            $stmt->execute([$nombre, $tipo, $codigo_color, $descripcion, $activo, $old_nombre]);
            json_ok(['mensaje' => 'Acabado actualizado correctamente']);
        } catch (PDOException $e) {
            json_error('Error al actualizar acabado: ' . $e->getMessage(), 500);
        }
    } else {
        // Crear nuevo
        try {
            // Verificar si ya existe
            $check = $pdo->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
            $check->execute([$nombre]);
            if ($check->fetchColumn()) {
                json_ok(['mensaje' => 'El acabado ya existe', 'id' => null]);
                exit;
            }

            $stmt = $pdo->prepare("
                INSERT INTO acabados (nombre, tipo, codigo_color, descripcion, activo)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$nombre, $tipo, $codigo_color, $descripcion, $activo]);
            json_ok(['mensaje' => 'Acabado creado correctamente', 'id' => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            json_error('Error al crear acabado: ' . $e->getMessage(), 500);
        }
    }
}
