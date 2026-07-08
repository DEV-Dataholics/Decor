<?php
// api/embarques/crear.php
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

$orden_id = (int)($data['orden_id'] ?? 0);
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

    // Obtener un usuario_embarque_id válido
    $user_id = $user['id'] ?? null;
    if (!$user_id && !empty($user['email'])) {
        $stmtUsr = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? LIMIT 1");
        $stmtUsr->execute([$user['email']]);
        $user_id = $stmtUsr->fetchColumn();
    }
    if (!$user_id) {
        $user_id = $pdo->query("SELECT id FROM usuarios LIMIT 1")->fetchColumn() ?: 1;
    }

    // 1. Insertar Embarque
    $stmt = $pdo->prepare("
        INSERT INTO embarques (orden_id, tienda_destino_id, fecha_embarque, placas_trailer, transportista, estatus, usuario_embarque_id)
        VALUES (?, ?, ?, ?, ?, 'preparando', ?)
    ");
    $stmt->execute([$orden_id ?: null, $tienda_destino_id ?: null, $fecha_embarque, $placas_trailer, $transportista, $user_id]);
    $embarque_id = $pdo->lastInsertId();

    // 2. Insertar items y actualizar estatus de work orders / orden items
    foreach ($items as $it) {
        $producto_id = (int)($it['producto_id'] ?? 0);
        $qr_code = $it['qr_code'] ?? '';
        
        // Extraer work_order_id de "QR-{id}"
        $wo_id = (int)str_replace('QR-', '', $qr_code);

        // Encontrar orden_item_id y producto_id a partir de la work order
        $orden_item_id = null;
        if ($wo_id > 0) {
            $stmtWo = $pdo->prepare("SELECT orden_item_id FROM work_orders WHERE id = ?");
            $stmtWo->execute([$wo_id]);
            $orden_item_id = $stmtWo->fetchColumn() ?: null;
            
            // Si no tenemos producto_id, obtenerlo de orden_items
            if ($producto_id <= 0 && $orden_item_id) {
                $stmtProd = $pdo->prepare("SELECT producto_id FROM orden_items WHERE id = ?");
                $stmtProd->execute([$orden_item_id]);
                $producto_id = (int)$stmtProd->fetchColumn();
            }
        }

        // Skip items sin producto válido
        if ($producto_id <= 0) continue;

        // Insertar item de embarque
        $stmtIt = $pdo->prepare("
            INSERT INTO embarque_items (embarque_id, orden_item_id, producto_id, cantidad_embarcada)
            VALUES (?, ?, ?, 1)
        ");
        $stmtIt->execute([$embarque_id, $orden_item_id, $producto_id]);

        // Actualizar estatus del orden item
        if ($orden_item_id) {
            $pdo->prepare("UPDATE orden_items SET estatus_item = 'embarcado' WHERE id = ?")->execute([$orden_item_id]);
        }
    }

    $pdo->commit();
    json_ok(['embarque_id' => $embarque_id]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al crear embarque: ' . $e->getMessage(), 500);
}
