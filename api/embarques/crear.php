<?php
// api/embarques/crear.php
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
$user = current_user();

$tienda_destino_id = (int)($data['tienda_destino_id'] ?? 0);
$fecha_embarque = $data['fecha_embarque'] ?? date('Y-m-d');
$placas_trailer = $data['placas_trailer'] ?? '';
$transportista = $data['transportista'] ?? '';
$items = $data['items'] ?? [];

if (empty($items)) {
    json_error('Los ítems son requeridos', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // 1. Insertar Embarque
    $stmt = $pdo->prepare("
        INSERT INTO embarques (tienda_destino_id, fecha_embarque, placas_trailer, transportista, estatus, usuario_embarque_id)
        VALUES (?, ?, ?, ?, 'preparando', ?)
    ");
    $stmt->execute([$tienda_destino_id ?: null, $fecha_embarque, $placas_trailer, $transportista, $user['id']]);
    $embarque_id = $pdo->lastInsertId();

    // 2. Insertar items y actualizar estatus de work orders / orden items
    foreach ($items as $it) {
        $producto_id = (int)$it['producto_id'];
        $qr_code = $it['qr_code'] ?? '';
        
        // Extraer work_order_id de "QR-{id}"
        $wo_id = (int)str_replace('QR-', '', $qr_code);

        // Encontrar orden_item_id a partir de la work order
        $stmtWo = $pdo->prepare("SELECT orden_item_id FROM work_orders WHERE id = ?");
        $stmtWo->execute([$wo_id]);
        $orden_item_id = $stmtWo->fetchColumn() ?: null;

        // Insertar item de embarque
        $stmtIt = $pdo->prepare("
            INSERT INTO embarque_items (embarque_id, orden_item_id, producto_id, cantidad_embarcada)
            VALUES (?, ?, ?, 1)
        ");
        $stmtIt->execute([$embarque_id, $orden_item_id, $producto_id]);

        // Actualizar estatus de la work order a 'terminado' (o dejarlo para saber que ya se despachó? Work order estatus for finished is 'terminado').
        if ($orden_item_id) {
            $pdo->prepare("UPDATE orden_items SET estatus_item = 'embarcado' WHERE id = ?")->execute([$orden_item_id]);
        }
    }

    $pdo->commit();
    json_ok(['embarque_id' => $embarque_id]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al crear embarque: ' . $e->getMessage(), 500);
}
