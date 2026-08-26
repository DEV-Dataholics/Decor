<?php
// api/embarques/status.php
// POST: Actualiza el estatus de un embarque ('preparando', 'embarcado', 'en_transito', 'entregado')
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller', 'repartidor', 'bodega']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;
$estatus = trim($input['estatus'] ?? '');

$estatusPermitidos = ['preparando', 'embarcado', 'en_transito', 'entregado'];
if (!$id || !in_array($estatus, $estatusPermitidos)) {
    errorResponse('ID o estatus inválido', 400);
}

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("UPDATE embarques SET estatus = :estatus WHERE id = :id");
    $stmt->execute([':estatus' => $estatus, ':id' => $id]);
    json_ok(['mensaje' => 'Estatus de embarque actualizado']);
} catch (PDOException $e) {
    errorResponse('Error al actualizar estatus: ' . $e->getMessage(), 500);
}
