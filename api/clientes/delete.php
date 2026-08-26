<?php
// api/clientes/delete.php
// POST: Elimina o desactiva un cliente con protección relacional
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

if (!$id) {
    errorResponse('ID de cliente no proporcionado', 400);
}

try {
    $pdo = getDB();

    // Comprobar si tiene pedidos o ventas
    $hasOrdenes = (int)$pdo->query("SELECT COUNT(*) FROM ordenes WHERE cliente_id = $id")->fetchColumn();
    $hasVentas  = (int)$pdo->query("SELECT COUNT(*) FROM ventas_tienda WHERE cliente_id = $id")->fetchColumn();

    if ($hasOrdenes > 0 || $hasVentas > 0) {
        // Baja lógica
        $stmt = $pdo->prepare("UPDATE clientes SET activo = 0 WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'desactivado', 'mensaje' => 'Cliente desactivado (mantiene historial de compras/pedidos)']);
    } else {
        // Borrado físico limpio
        $stmt = $pdo->prepare("DELETE FROM clientes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        json_ok(['accion' => 'eliminado', 'mensaje' => 'Cliente eliminado permanentemente']);
    }
} catch (PDOException $e) {
    errorResponse('Error al eliminar cliente: ' . $e->getMessage(), 500);
}
