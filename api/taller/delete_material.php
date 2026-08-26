<?php
// api/taller/delete_material.php
// POST: Elimina o desactiva una materia prima de taller
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

if (!$id) {
    errorResponse('ID de materia prima no proporcionado', 400);
}

try {
    $pdo = getDB();

    // Comprobar si tiene movimientos históricos
    $hasMovs = (int)$pdo->query("SELECT COUNT(*) FROM movimientos_inventario_taller WHERE material_id = $id")->fetchColumn();

    if ($hasMovs > 0) {
        // Baja lógica
        $stmt = $pdo->prepare("UPDATE materiales SET activo = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'desactivado', 'mensaje' => 'Materia prima desactivada (mantiene historial de consumo en taller)']);
    } else {
        // Eliminación física
        $stmt = $pdo->prepare("DELETE FROM materiales WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'eliminado', 'mensaje' => 'Materia prima eliminada permanentemente']);
    }
} catch (PDOException $e) {
    errorResponse('Error al eliminar materia prima: ' . $e->getMessage(), 500);
}
