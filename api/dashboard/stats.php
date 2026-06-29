<?php
// api/dashboard/stats.php
require_once '../config/db.php';
require_once '../config/response.php';

set_json_headers();

try {
    $db = getDB();
    
    // Ventas del día
    $stmt = $db->query("SELECT SUM(total) as total FROM ventas_tienda WHERE DATE(fecha_venta) = CURDATE() AND estatus != 'cancelada'");
    $ventas_hoy = $stmt->fetch()['total'] ?? 0;

    // Pedidos pendientes
    $stmt = $db->query("SELECT COUNT(*) as total FROM ordenes WHERE estatus NOT IN ('entregada', 'cancelada')");
    $pedidos_pendientes = $stmt->fetch()['total'] ?? 0;

    // Items en producción
    $stmt = $db->query("SELECT COUNT(*) as total FROM work_orders WHERE estatus NOT IN ('terminado', 'pagado')");
    $produccion_activa = $stmt->fetch()['total'] ?? 0;

    successResponse([
        'ventas_hoy' => (float)$ventas_hoy,
        'pedidos_pendientes' => (int)$pedidos_pendientes,
        'produccion_activa' => (int)$produccion_activa
    ]);

} catch (Exception $e) {
    errorResponse($e->getMessage());
}
