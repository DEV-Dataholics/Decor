<?php
// api/embarques/crear.php
// POST: Crea un nuevo embarque y asocia los items de work_orders / orden
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller', 'repartidor', 'bodega', 'gerente_tienda']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$orden_id          = isset($input['orden_id']) && is_numeric($input['orden_id']) ? (int)$input['orden_id'] : null;
$tienda_destino_id = isset($input['tienda_destino_id']) ? (int)$input['tienda_destino_id'] : 1;
$transportista     = trim($input['transportista'] ?? 'Transporte Interno');
$placas_trailer    = trim($input['placas_trailer'] ?? '');
$ruta_viaje        = trim($input['ruta_viaje'] ?? 'Taller -> Tienda');
$estatus           = trim($input['estatus'] ?? 'preparando');
$items             = $input['items'] ?? [];
$userId            = $_SESSION['user_id'] ?? 1;

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO embarques (orden_id, tienda_destino_id, fecha_embarque, placas_trailer, transportista, ruta_viaje, estatus, usuario_embarque_id)
        VALUES (:orden_id, :tienda_destino_id, CURDATE(), :placas, :trans, :ruta, :estatus, :user_id)
    ");
    $stmt->execute([
        ':orden_id'          => $orden_id,
        ':tienda_destino_id' => $tienda_destino_id,
        ':placas'            => $placas_trailer,
        ':trans'             => $transportista,
        ':ruta'              => $ruta_viaje,
        ':estatus'           => $estatus,
        ':user_id'           => $userId
    ]);
    $embarqueId = (int)$pdo->lastInsertId();

    // Insertar items
    $stmtItem = $pdo->prepare("
        INSERT INTO embarque_items (embarque_id, orden_item_id, producto_id, cantidad_embarcada, embarcado, recibido_en_tienda)
        VALUES (:emb_id, :orden_item_id, :prod_id, :cant, 1, 0)
    ");

    $ordenesAfectadas = [];
    if ($orden_id) {
        $ordenesAfectadas[$orden_id] = true;
    }

    $itemsInsertados = [];
    foreach ($items as $it) {
        $prodId = (int)($it['producto_id'] ?? 0);
        $cant   = (float)($it['cantidad'] ?? 1);
        $ordenItemId = !empty($it['orden_item_id']) ? (int)$it['orden_item_id'] : null;

        // Si no se proporcionó orden_item_id pero tenemos orden_id y producto_id, buscarlo
        if (!$ordenItemId && $orden_id && $prodId) {
            $findOi = $pdo->prepare("
                SELECT id FROM orden_items 
                WHERE orden_id = ? AND producto_id = ? AND estatus_item != 'embarcado' AND estatus_item != 'entregado'
                ORDER BY id ASC LIMIT 1
            ");
            $findOi->execute([$orden_id, $prodId]);
            $foundId = $findOi->fetchColumn();
            if ($foundId) {
                $ordenItemId = (int)$foundId;
            }
        }

        $stmtItem->execute([
            ':emb_id'        => $embarqueId,
            ':orden_item_id' => $ordenItemId,
            ':prod_id'       => $prodId,
            ':cant'          => $cant
        ]);
        $eiId = (int)$pdo->lastInsertId();

        $itemsInsertados[] = [
            'id' => $eiId,
            'embarque_id' => $embarqueId,
            'orden_item_id' => $ordenItemId,
            'producto_id' => $prodId,
            'producto_nombre' => $it['producto_nombre'] ?? '',
            'codigo_sku' => $it['codigo_sku'] ?? '',
            'precio_unitario' => (float)($it['precio_unitario'] ?? 0),
            'cantidad' => $cant,
            'cantidad_recibida' => 0,
            'cantidad_danada' => 0,
            'embarcado' => true,
            'recibido_en_tienda' => false,
            'qr_code' => 'QR-EMB-' . $eiId,
            'estado_recepcion' => 'pendiente',
            'tienda_destino_id' => $tienda_destino_id,
            'cliente_nombre' => $input['cliente_nombre'] ?? '',
            'orden_id' => $orden_id
        ];

        // Si tenemos orden_item_id, actualizar su estatus a 'embarcado'
        if ($ordenItemId) {
            $pdo->prepare("UPDATE orden_items SET estatus_item = 'embarcado' WHERE id = ?")->execute([$ordenItemId]);
            
            // Registrar orden_id para sincronización
            $oiOrdId = (int)$pdo->query("SELECT orden_id FROM orden_items WHERE id = $ordenItemId")->fetchColumn();
            if ($oiOrdId > 0) {
                $ordenesAfectadas[$oiOrdId] = true;
            }
        }
    }

    // Sincronizar el estatus de las órdenes involucradas
    foreach (array_keys($ordenesAfectadas) as $oid) {
        sincronizar_estatus_orden($pdo, (int)$oid);
    }

    $pdo->commit();
    json_ok([
        'id' => $embarqueId,
        'orden_id' => $orden_id,
        'tienda_destino_id' => $tienda_destino_id,
        'fecha_embarque' => date('Y-m-d'),
        'placas_trailer' => $placas_trailer,
        'transportista' => $transportista,
        'ruta_viaje' => $ruta_viaje,
        'estatus' => $estatus,
        'items' => $itemsInsertados,
        'cliente_nombre' => $input['cliente_nombre'] ?? 'Cliente General',
        'mensaje' => 'Embarque generado con éxito'
    ]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    errorResponse('Error al crear embarque: ' . $e->getMessage(), 500);
}
