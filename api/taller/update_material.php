<?php
// api/taller/update_material.php
// POST: Actualiza el stock o aplica un delta a un material
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller', 'carpintero']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;
$delta = isset($input['delta']) ? (float)$input['delta'] : null;
$cantidad_fija = isset($input['cantidad']) ? (float)$input['cantidad'] : null;

if (!$id) {
    errorResponse('ID de material no proporcionado', 400);
}

try {
    $pdo = getDB();

    if ($cantidad_fija !== null) {
        $stmt = $pdo->prepare("UPDATE materiales SET stock_actual = GREATEST(0, :cant) WHERE id = :id");
        $stmt->execute([':cant' => $cantidad_fija, ':id' => $id]);
    } elseif ($delta !== null) {
        $stmt = $pdo->prepare("UPDATE materiales SET stock_actual = GREATEST(0, stock_actual + :delta) WHERE id = :id");
        $stmt->execute([':delta' => $delta, ':id' => $id]);
    } else {
        errorResponse('Debe proporcionar un delta o una cantidad fija', 400);
    }

    $nuevoStock = (float)$pdo->query("SELECT stock_actual FROM materiales WHERE id = $id")->fetchColumn();
    json_ok(['id' => $id, 'stock_actual' => $nuevoStock, 'mensaje' => 'Stock de material actualizado']);
} catch (PDOException $e) {
    errorResponse('Error al actualizar material: ' . $e->getMessage(), 500);
}
