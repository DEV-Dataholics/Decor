<?php
// api/pedidos/eliminar.php
// Elimina un pedido y sus work_orders (cancelación).
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'ventas']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$id = (int)($data['id'] ?? 0);

if (!$id) {
    json_error('ID de pedido requerido', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Eliminar Work Orders asociadas
    $pdo->prepare("
        DELETE w FROM work_orders w
        INNER JOIN orden_items oi ON w.orden_item_id = oi.id
        WHERE oi.orden_id = ?
    ")->execute([$id]);

    // Eliminar Orden Items y la Orden
    $pdo->prepare("DELETE FROM orden_items WHERE orden_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM ordenes WHERE id = ?")->execute([$id]);

    $pdo->commit();
    json_ok(['mensaje' => 'Pedido eliminado correctamente']);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error eliminando el pedido: ' . $e->getMessage(), 500);
}
