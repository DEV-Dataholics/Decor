<?php
// api/ventas/caja.php
// GET -> Devuelve la caja abierta actual para una tienda.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error' => 'Sesion requerida']); exit; }

$pdo = getDB();
$tienda_id = (int)($_GET['tienda_id'] ?? 1);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("
        SELECT id AS caja_id, nombre, fondo_inicial, total_efectivo_esperado, fecha_apertura
        FROM cajas_tienda
        WHERE tienda_id = ? AND estatus = 'abierta'
        ORDER BY fecha_apertura DESC
        LIMIT 1
    ");
    $stmt->execute([$tienda_id]);
    $caja = $stmt->fetch();

    if ($caja) {
        echo json_encode(['ok' => true, 'caja_id' => (int)$caja['caja_id'], 'caja' => $caja]);
    } else {
        echo json_encode(['ok' => true, 'caja_id' => null, 'caja' => null]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo no permitido']);
