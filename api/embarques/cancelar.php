<?php
// api/embarques/cancelar.php
// POST: Cancela o elimina un embarque si no ha sido entregado
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

if (!$id) {
    errorResponse('ID de embarque no proporcionado', 400);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT estatus FROM embarques WHERE id = ?");
    $stmtCheck->execute([$id]);
    $emb = $stmtCheck->fetch();

    if (!$emb) {
        throw new Exception("Embarque no encontrado");
    }
    if ($emb['estatus'] === 'entregado') {
        throw new Exception("No se puede cancelar un embarque que ya fue entregado y recibido en tienda");
    }

    $pdo->prepare("DELETE FROM embarque_items WHERE embarque_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM embarques WHERE id = ?")->execute([$id]);

    $pdo->commit();
    json_ok(['mensaje' => 'Embarque cancelado con éxito']);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    errorResponse('Error al cancelar embarque: ' . $e->getMessage(), 500);
}
