<?php
// api/empleados/eliminar.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$id = (int)($data['id'] ?? 0);

if (!$id) {
    json_error('ID requerido', 422);
}

try {
    $pdo = getDB();
    // En lugar de eliminar físicamente para evitar romper históricos, marcamos como inactivo (activo = 0)
    // O si se requiere eliminar físicamente, lo eliminamos. La interfaz de eliminar original hace deleteEmpleado.
    // Probemos eliminando físicamente primero, si hay clave foránea fallará de forma controlada.
    $stmt = $pdo->prepare("DELETE FROM empleados WHERE id = ?");
    $stmt->execute([$id]);
    
    json_ok(['mensaje' => 'Empleado eliminado correctamente']);
} catch (Exception $e) {
    // Si falla por clave foránea, lo desactivamos automáticamente como fallback
    try {
        $stmt = $pdo->prepare("UPDATE empleados SET activo = 0 WHERE id = ?");
        $stmt->execute([$id]);
        json_ok(['mensaje' => 'Empleado desactivado porque tiene historial de producción registrado']);
    } catch (Exception $ex) {
        json_error('Error al eliminar empleado: ' . $e->getMessage(), 500);
    }
}
