<?php
// api/ventas/caja_cerrar.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error' => 'Sesion requerida']); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $caja_id = (int)($data['caja_id'] ?? 0);
    $contado = (float)($data['total_efectivo_contado'] ?? 0);

    if (!$caja_id) {
        http_response_code(422);
        echo json_encode(['error' => 'caja_id requerido']);
        exit;
    }

    try {
        $pdo = getDB();
        $stmt = $pdo->prepare("
            UPDATE cajas_tienda
            SET estatus = 'cerrada',
                fecha_cierre = NOW(),
                total_efectivo_contado = ?,
                usuario_cierre_id = ?
            WHERE id = ? AND estatus = 'abierta'
        ");
        $stmt->execute([$contado, $user['id'], $caja_id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(409);
            echo json_encode(['error' => 'La caja no existe o ya fue cerrada']);
            exit;
        }

        $row = $pdo->prepare("SELECT diferencia, total_efectivo_esperado FROM cajas_tienda WHERE id = ?");
        $row->execute([$caja_id]);
        $result = $row->fetch();

        echo json_encode([
            'ok' => true,
            'diferencia' => (float)$result['diferencia'],
            'esperado' => (float)$result['total_efectivo_esperado'],
            'contado' => $contado,
            'mensaje' => 'Caja cerrada correctamente'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error cerrando la caja']);
    }
    exit;
}
