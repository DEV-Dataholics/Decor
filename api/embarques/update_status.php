<?php
// api/embarques/update_status.php
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
$estatus = $data['estatus'] ?? '';

if (!$id || !$estatus) {
    json_error('ID y estatus son requeridos', 422);
}

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("UPDATE embarques SET estatus = ?, actualizado_en = NOW() WHERE id = ?");
    $stmt->execute([$estatus, $id]);
    json_ok(['mensaje' => 'Estatus de embarque actualizado correctamente']);
} catch (Exception $e) {
    json_error('Error al actualizar estatus de embarque: ' . $e->getMessage(), 500);
}
