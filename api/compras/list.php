<?php
// api/compras/list.php — Lista de compras externas
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once '../config/db.php';
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$pdo = getDB();
$stmt = $pdo->query("
    SELECT ce.id, ce.fecha_compra, ce.folio_factura, ce.total_compra,
           ce.estatus, ce.notas,
           p.nombre AS proveedor_nombre,
           t.nombre AS tienda_nombre
    FROM compras_externas ce
    LEFT JOIN proveedores p ON p.id = ce.proveedor_id
    LEFT JOIN tiendas t     ON t.id = ce.tienda_destino_id
    ORDER BY ce.fecha_compra DESC
    LIMIT 200
");
echo json_encode(['ok'=>true, 'items'=>$stmt->fetchAll()]);
