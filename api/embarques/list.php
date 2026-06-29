<?php
// api/embarques/list.php — Lista de embarques con items
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once '../config/db.php';
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$pdo = getDB();
$stmt = $pdo->query("
    SELECT e.id, e.fecha_embarque, e.placas_trailer, e.transportista,
           e.folio_carta_porte, e.estatus,
           t.nombre AS tienda_destino,
           o.id AS orden_id,
           (SELECT COUNT(*) FROM embarque_items ei WHERE ei.embarque_id = e.id) AS total_items,
           (SELECT SUM(ei.cantidad_embarcada) FROM embarque_items ei WHERE ei.embarque_id = e.id) AS total_piezas
    FROM embarques e
    LEFT JOIN tiendas t ON t.id = e.tienda_destino_id
    LEFT JOIN ordenes o ON o.id = e.orden_id
    ORDER BY e.fecha_embarque DESC
    LIMIT 200
");
echo json_encode(['ok'=>true, 'items'=>$stmt->fetchAll()]);
