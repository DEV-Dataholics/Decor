<?php
// api/ventas/caja.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

$user = $_SESSION['user'] ?? null;
if (!$user) { 
    http_response_code(401); 
    echo json_encode(['ok' => false, 'error' => 'Sesion requerida']); 
    exit; 
}

$pdo = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tienda_id = (int)($_GET['tienda_id'] ?? 1);
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

    echo json_encode([
        'ok'      => true,
        'caja_id' => null,
        'caja'    => null,
        'mensaje' => 'No hay caja abierta'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data      = json_decode(file_get_contents('php://input'), true) ?: [];
    $tienda_id = (int)($data['tienda_id'] ?? $_POST['tienda_id'] ?? $_GET['tienda_id'] ?? 1);
    $action    = $data['action'] ?? 'cerrar';
    
    if ($action === 'abrir') {
        $fondo = (float)($data['fondo_inicial'] ?? 0);
        $ins = $pdo->prepare("
            INSERT INTO cajas_tienda (tienda_id, nombre, fondo_inicial, total_efectivo_esperado, usuario_apertura_id)
            VALUES (?, 'Caja 1', ?, ?, ?)
        ");
        $ins->execute([$tienda_id, $fondo, $user['id']]);
        echo json_encode(['ok' => true, 'caja_id' => (int)$pdo->lastInsertId()]);
        exit;
    }
    
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
echo json_encode(['error' => 'Metodo no permitido']);
