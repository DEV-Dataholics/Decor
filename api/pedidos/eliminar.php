<?php
// api/pedidos/eliminar.php
// Elimina un pedido y sus work_orders (cancelación).
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST requerido']); exit; }

require_once '../config/db.php';
require_once '../config/response.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);

if (!$id) { http_response_code(422); echo json_encode(['error'=>'id requerido']); exit; }

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $pdo->prepare("
        DELETE w FROM work_orders w
        INNER JOIN orden_items oi ON w.orden_item_id = oi.id
        WHERE oi.orden_id = ?
    ")->execute([$id]);

    $pdo->prepare("DELETE FROM orden_items WHERE orden_id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM ordenes WHERE id = ?")->execute([$id]);

    $pdo->commit();
    echo json_encode(['ok'=>true, 'mensaje'=>'Pedido eliminado correctamente']);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'Error eliminando la orden: '.$e->getMessage()]);
}
