<?php
// api/empleados/delete.php
// POST: Elimina o desactiva un empleado con protección relacional
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

if (!$id) {
    errorResponse('ID de empleado no proporcionado', 400);
}

try {
    $pdo = getDB();

    // Comprobar si tiene work_orders asignadas
    $hasWos = (int)$pdo->query("SELECT COUNT(*) FROM work_orders WHERE empleado_id = $id OR empleado_acabado_id = $id")->fetchColumn();

    if ($hasWos > 0) {
        // Baja lógica
        $stmt = $pdo->prepare("UPDATE empleados SET activo = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'desactivado', 'mensaje' => 'Empleado desactivado (mantiene historial de órdenes trabajadas)']);
    } else {
        // Borrado físico limpio
        $stmt = $pdo->prepare("DELETE FROM empleados WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'eliminado', 'mensaje' => 'Empleado eliminado permanentemente']);
    }
} catch (PDOException $e) {
    errorResponse('Error al eliminar empleado: ' . $e->getMessage(), 500);
}
