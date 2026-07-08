<?php
// api/embarques/list.php — Lista de embarques con items
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once '../config/db.php';
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT e.id, e.fecha_embarque, e.placas_trailer, e.transportista,
               e.folio_carta_porte, e.estatus,
               t.nombre AS tienda_destino,
               e.tienda_destino_id,
               o.id AS orden_id
        FROM embarques e
        LEFT JOIN tiendas t ON t.id = e.tienda_destino_id
        LEFT JOIN ordenes o ON o.id = e.orden_id
        ORDER BY e.id DESC
        LIMIT 200
    ");
    $embarques = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($embarques as &$emb) {
        $stmtIt = $pdo->prepare("
            SELECT ei.id, ei.producto_id, p.nombre AS producto_nombre, p.codigo_sku,
                   CONCAT('QR-', wo.id) AS qr_code, p.precio_venta AS precio_unitario,
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
        $emb['orden_id'] = (int)$emb['orden_id'];
        $emb['tienda_destino_id'] = (int)$emb['tienda_destino_id'];
        $emb['ruta_viaje'] = $emb['tienda_destino'] ?: 'Envío';
        $emb['cliente_nombre'] = $emb['tienda_destino'] ?: 'Sucursal';
    }

    echo json_encode(['ok'=>true, 'items'=>$embarques]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error al listar embarques: '.$e->getMessage()]);
}
