<?php
// api/embarques/list.php — Lista de embarques con items y estatus
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'repartidor', 'bodega']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT e.id, e.fecha_embarque, e.placas_trailer, e.transportista,
               e.ruta_viaje, e.folio_carta_porte, e.estatus, e.tienda_destino_id,
               t.nombre AS tienda_destino,
               o.id AS orden_id,
               COALESCE(c.nombre, t.nombre, 'Cliente General') AS cliente_nombre
        FROM embarques e
        LEFT JOIN tiendas t ON t.id = e.tienda_destino_id
        LEFT JOIN ordenes o ON o.id = e.orden_id
        LEFT JOIN clientes c ON c.id = o.cliente_id
        ORDER BY e.fecha_embarque DESC, e.id DESC
        LIMIT 200
    ");
    $embarques = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmtItems = $pdo->prepare("
        SELECT ei.id, ei.embarque_id, ei.orden_item_id, ei.producto_id,
               ei.cantidad_embarcada as cantidad, ei.cantidad_recibida, ei.cantidad_danada,
               ei.recibido_en_tienda,
               p.nombre as producto_nombre, p.codigo_sku, p.precio_venta_base as precio_unitario,
               oi.orden_id,
               a.nombre as acabado
        FROM embarque_items ei
        JOIN productos p ON p.id = ei.producto_id
        LEFT JOIN orden_items oi ON oi.id = ei.orden_item_id
        LEFT JOIN acabados a ON a.id = oi.acabado_id
        WHERE ei.embarque_id = ?
    ");

    foreach ($embarques as &$emb) {
        $emb['id'] = (int)$emb['id'];
        $emb['tienda_destino_id'] = (int)$emb['tienda_destino_id'];
        $emb['orden_id'] = (int)($emb['orden_id'] ?? 0);
        $stmtItems->execute([$emb['id']]);
        $emb['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        foreach ($emb['items'] as &$it) {
            $it['id'] = (int)$it['id'];
            $it['producto_id'] = (int)$it['producto_id'];
            $it['orden_item_id'] = $it['orden_item_id'] ? (int)$it['orden_item_id'] : null;
            $it['orden_id'] = $it['orden_id'] ? (int)$it['orden_id'] : $emb['orden_id'];
            $it['acabado'] = $it['acabado'] ?: 'Natural';
            $it['cantidad'] = (float)$it['cantidad'];
            $it['cantidad_recibida'] = (float)$it['cantidad_recibida'];
            $it['cantidad_danada'] = (float)$it['cantidad_danada'];
            $it['precio_unitario'] = (float)$it['precio_unitario'];
            $it['qr_code'] = 'QR-EMB-' . $it['id'];
            $it['estado_recepcion'] = ((float)$it['cantidad_danada'] > 0) 
                ? 'danado' 
                : ((int)$it['recibido_en_tienda'] === 1 ? 'ok' : ($emb['estatus'] === 'entregado' ? 'rechazado' : 'pendiente'));
            $it['tienda_destino_id'] = $emb['tienda_destino_id'];
        }
        unset($it);
    }
    unset($emb);

    json_ok(['items' => $embarques]);
} catch (PDOException $e) {
    errorResponse('Error al listar embarques: ' . $e->getMessage(), 500);
}
