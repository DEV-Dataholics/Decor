<?php
// api/ventas/caja.php
// GET  → Devuelve la caja abierta del día para una tienda.
//        Si no existe, la crea automáticamente con fondo_inicial = 0.
// POST → Cierra la caja con el monto contado por el cajero.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error' => 'Sesión requerida']); exit; }

$pdo       = getDB();
$tienda_id = (int)($_GET['tienda_id'] ?? $_POST['tienda_id'] ?? 1);

// ── GET: obtener o crear caja abierta ───────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Buscar caja abierta para esta tienda
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
        exit;
    }

    // No hay caja abierta → crear una automáticamente
    $ins = $pdo->prepare("
        INSERT INTO cajas_tienda (tienda_id, nombre, fondo_inicial, usuario_apertura_id)
        VALUES (?, 'Caja 1', 0.00, ?)
    ");
    $ins->execute([$tienda_id, $user['id']]);
    $caja_id = (int)$pdo->lastInsertId();

    echo json_encode([
        'ok'      => true,
        'caja_id' => $caja_id,
        'nueva'   => true,
        'mensaje' => 'Caja abierta automáticamente'
    ]);
    exit;
}

// ── POST: cerrar caja ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data    = json_decode(file_get_contents('php://input'), true);
    $caja_id = (int)($data['caja_id'] ?? 0);
    $contado = (float)($data['total_efectivo_contado'] ?? 0);

    if (!$caja_id) {
        http_response_code(422);
        echo json_encode(['error' => 'caja_id requerido']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE cajas_tienda
            SET estatus                = 'cerrada',
                fecha_cierre           = NOW(),
                total_efectivo_contado = ?,
                usuario_cierre_id      = ?
            WHERE id = ? AND estatus = 'abierta'
        ");
        $stmt->execute([$contado, $user['id'], $caja_id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(409);
            echo json_encode(['error' => 'La caja no existe o ya fue cerrada']);
            exit;
        }

        // Obtener diferencia calculada
        $row = $pdo->prepare("SELECT diferencia, total_efectivo_esperado FROM cajas_tienda WHERE id = ?");
        $row->execute([$caja_id]);
        $result = $row->fetch();

        echo json_encode([
            'ok'         => true,
            'diferencia' => (float)$result['diferencia'],
            'esperado'   => (float)$result['total_efectivo_esperado'],
            'contado'    => $contado,
            'mensaje'    => 'Caja cerrada correctamente'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error cerrando la caja']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
