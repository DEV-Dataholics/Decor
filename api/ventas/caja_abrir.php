<?php
// api/ventas/caja_abrir.php
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
    $tienda_id = (int)($data['tienda_id'] ?? 1);
    $fondo_inicial = (float)($data['fondo_inicial'] ?? 0);

    try {
        $pdo = getDB();
        
        // Verificar si ya hay una abierta
        $check = $pdo->prepare("SELECT id FROM cajas_tienda WHERE tienda_id = ? AND estatus = 'abierta'");
        $check->execute([$tienda_id]);
        if ($check->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Ya existe una caja abierta para esta tienda']);
            exit;
        }

        $ins = $pdo->prepare("
            INSERT INTO cajas_tienda (tienda_id, nombre, fondo_inicial, usuario_apertura_id)
            VALUES (?, 'Caja 1', ?, ?)
        ");
        $ins->execute([$tienda_id, $fondo_inicial, $user['id']]);
        $caja_id = (int)$pdo->lastInsertId();

        echo json_encode([
            'ok' => true,
            'caja_id' => $caja_id,
            'mensaje' => 'Caja abierta correctamente'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al abrir caja']);
    }
    exit;
}
