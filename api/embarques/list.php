<?php
// api/embarques/list.php — Lista de embarques con items
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
require_once '../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT e.id, e.fecha_embarque, e.placas_trailer, e.transportista,
               e.folio_carta_porte, e.estatus,
               t.nombre AS tienda_destino,
               e.tienda_destino_id,
               e.orden_id
        FROM embarques e
        LEFT JOIN tiendas t ON t.id = e.tienda_destino_id
        ORDER BY e.id DESC
        LIMIT 200
    ");
    $embarques = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($embarques as &$emb) {
        $stmtIt = $pdo->prepare("
            SELECT ei.id, ei.producto_id, p.nombre AS producto_nombre, p.codigo_sku,
                   CONCAT('QR-', wo.id) AS qr_code, 
                   COALESCE(p.precio_venta_base, 0) AS precio_unitario,
                   ei.cantidad_embarcada, ei.recibido_en_tienda, 
                   CASE 
                     WHEN ei.recibido_en_tienda = 1 AND ei.cantidad_danada > 0 THEN 'dañado'
                     WHEN ei.recibido_en_tienda = 1 AND ei.cantidad_recibida = 0 THEN 'faltante'
                     WHEN ei.recibido_en_tienda = 1 THEN 'ok'
                     ELSE 'pendiente'
                   END AS estado_recepcion,
                   e.tienda_destino_id
            FROM embarque_items ei
            JOIN productos p ON p.id = ei.producto_id
            LEFT JOIN orden_items oi ON oi.id = ei.orden_item_id
            LEFT JOIN work_orders wo ON wo.orden_item_id = oi.id
            JOIN embarques e ON e.id = ei.embarque_id
            WHERE ei.embarque_id = ?
        ");
        $stmtIt->execute([$emb['id']]);
        $emb['items'] = $stmtIt->fetchAll(PDO::FETCH_ASSOC);
        
        // Formato para frontend
        $emb['id'] = (int)$emb['id'];
        $emb['orden_id'] = (int)($emb['orden_id'] ?? 0);
        $emb['tienda_destino_id'] = (int)($emb['tienda_destino_id'] ?? 0);
        $emb['ruta_viaje'] = $emb['tienda_destino'] ?: 'Envío';
        $emb['cliente_nombre'] = $emb['tienda_destino'] ?: 'Sucursal';
    }

    json_ok($embarques);
} catch (Exception $e) {
    json_error('Error al listar embarques: ' . $e->getMessage(), 500);
}
