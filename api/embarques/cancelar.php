<?php
// api/embarques/cancelar.php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
require_once '../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$id = (int)($data['id'] ?? 0);

if (!$id) {
    json_error('ID de embarque es requerido', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Obtener los orden_item_id vinculados para regresar su estado de item a 'pendiente'
    $stmtIt = $pdo->prepare("SELECT orden_item_id FROM embarque_items WHERE embarque_id = ?");
    $stmtIt->execute([$id]);
    $items = $stmtIt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($items as $oi_id) {
        if ($oi_id) {
            $pdo->prepare("UPDATE orden_items SET estatus_item = 'pendiente' WHERE id = ?")->execute([$oi_id]);
        }
    }

    // Eliminar el embarque
    $stmtDel = $pdo->prepare("DELETE FROM embarques WHERE id = ?");
    $stmtDel->execute([$id]);

    $pdo->commit();
    json_ok(['mensaje' => 'Embarque cancelado correctamente']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al cancelar embarque: ' . $e->getMessage(), 500);
}
