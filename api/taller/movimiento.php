<?php
// api/taller/movimiento.php
// Registra una entrada o salida de material en el inventario del taller.
// El trigger trg_actualizar_stock_taller actualiza stock_actual en `materiales`.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit; }

require_once '../config/db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error' => 'Sesión requerida']); exit; }

$data            = json_decode(file_get_contents('php://input'), true);
$material_id     = (int)($data['material_id']     ?? 0);
$tipo_movimiento = $data['tipo_movimiento']        ?? '';  // entrada | salida | ajuste
$cantidad        = (float)($data['cantidad']       ?? 0);
$referencia_tipo = $data['referencia_tipo']        ?? 'ajuste_manual';
$referencia_id   = !empty($data['referencia_id'])  ? (int)$data['referencia_id'] : null;
$notas           = trim($data['notas']             ?? '');

// ── Validaciones ───────────────────────────────────────────────
if (!$material_id || !in_array($tipo_movimiento, ['entrada','salida','ajuste']) || $cantidad <= 0) {
    http_response_code(422);
    echo json_encode(['error' => 'Datos inválidos: material_id, tipo_movimiento (entrada|salida|ajuste) y cantidad > 0 son requeridos']);
    exit;
}

try {
    $pdo = getDB();

    // Verificar que no haya salida mayor al stock actual
    if ($tipo_movimiento === 'salida') {
        $stockRow = $pdo->prepare("SELECT stock_actual FROM materiales WHERE id = ? FOR UPDATE");
        $stockRow->execute([$material_id]);
        $mat = $stockRow->fetch();
        if (!$mat) {
            http_response_code(404);
            echo json_encode(['error' => 'Material no encontrado']);
            exit;
        }
        if ($mat['stock_actual'] < $cantidad) {
            http_response_code(409);
            echo json_encode(['error' => "Stock insuficiente (disponible: {$mat['stock_actual']})"]);
            exit;
        }
    }

    // Registrar el movimiento — el TRIGGER actualiza stock_actual en materiales
    $stmt = $pdo->prepare("
        INSERT INTO movimientos_inventario_taller
            (material_id, tipo_movimiento, cantidad, costo_unitario_mov,
             referencia_tipo, referencia_id, usuario_id, notas)
        VALUES (?, ?, ?, 0.00, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $material_id,
        $tipo_movimiento,
        $cantidad,
        $referencia_tipo,
        $referencia_id,
        $user['id'],
        $notas ?: null
    ]);

    // Leer stock actualizado
    $updated = $pdo->prepare("SELECT stock_actual FROM materiales WHERE id = ?");
    $updated->execute([$material_id]);
    $nuevoStock = (float)$updated->fetchColumn();

    echo json_encode([
        'ok'          => true,
        'tipo'        => $tipo_movimiento,
        'cantidad'    => $cantidad,
        'nuevo_stock' => $nuevoStock,
        'mensaje'     => ucfirst($tipo_movimiento) . ' de material registrada correctamente'
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error registrando el movimiento']);
}
