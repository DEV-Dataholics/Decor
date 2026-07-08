<?php
// api/ordenes/list.php — Lista órdenes con filtros opcionales
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once '../config/db.php';
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$pdo = getDB();
$estatus = $_GET['estatus'] ?? null;
$where = '';
$params = [];
if ($estatus) { $where = 'WHERE o.estatus = ?'; $params[] = $estatus; }

$sql = "
    SELECT o.id, o.tipo_orden, o.fecha_creacion, o.fecha_entrega_estimada,
           o.estatus, o.total, o.notas,
           CASE 
             WHEN o.tipo_orden = 'resurtido_tienda' THEN td.nombre
             ELSE c.nombre 
           END AS cliente_nombre,
           c.tipo AS cliente_tipo,
           t.nombre AS tienda_nombre,
           (SELECT COUNT(*) FROM orden_items oi WHERE oi.orden_id = o.id) AS total_items
    FROM ordenes o
    LEFT JOIN clientes c ON c.id = o.cliente_id
    LEFT JOIN tiendas t ON t.id = o.tienda_origen_id
    LEFT JOIN tiendas td ON td.id = o.cliente_id AND o.tipo_orden = 'resurtido_tienda'
    $where
    ORDER BY o.fecha_creacion DESC
    LIMIT 200
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
echo json_encode(['ok'=>true, 'items'=>$stmt->fetchAll()]);
