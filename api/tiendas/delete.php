<?php
// api/tiendas/delete.php
// POST: Elimina o desactiva una sucursal con protección relacional
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

if (!$id) {
    errorResponse('ID de sucursal no proporcionado', 400);
}

try {
    $pdo = getDB();

    // Comprobar si tiene registros asociados
    $hasVentas = (int)$pdo->query("SELECT COUNT(*) FROM ventas_tienda WHERE tienda_id = $id")->fetchColumn();
    $hasInv    = (int)$pdo->query("SELECT COUNT(*) FROM inventario_tienda WHERE tienda_id = $id AND cantidad_disponible > 0")->fetchColumn();
    $hasEmb    = (int)$pdo->query("SELECT COUNT(*) FROM embarques WHERE tienda_destino_id = $id")->fetchColumn();

    if ($hasVentas > 0 || $hasInv > 0 || $hasEmb > 0) {
        // Baja lógica
        $stmt = $pdo->prepare("UPDATE tiendas SET activa = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'desactivado', 'mensaje' => 'Sucursal desactivada (mantiene historial transaccional)']);
    } else {
        // Borrado físico limpio
        $pdo->prepare("DELETE FROM inventario_tienda WHERE tienda_id = :id")->execute([':id' => $id]);
        $stmt = $pdo->prepare("DELETE FROM tiendas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'eliminado', 'mensaje' => 'Sucursal eliminada permanentemente']);
    }
} catch (PDOException $e) {
    errorResponse('Error al eliminar sucursal: ' . $e->getMessage(), 500);
}
