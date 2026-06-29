<?php
// api/compras/save.php — Registrar compra externa
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST requerido']); exit; }
require_once '../config/db.php';
session_start();
$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$data = json_decode(file_get_contents('php://input'), true);

$proveedor_nombre = trim($data['proveedor_nombre'] ?? '');
$tienda_destino   = (int)($data['tienda_destino_id'] ?? 1);
$folio_factura    = trim($data['folio_factura'] ?? '');
$total_compra     = (float)($data['total_compra'] ?? 0);
$notas            = trim($data['notas'] ?? '');

if (!$proveedor_nombre) {
    http_response_code(422);
    echo json_encode(['error' => 'proveedor_nombre requerido']);
    exit;
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Buscar o crear proveedor
    $stmt = $pdo->prepare("SELECT id FROM proveedores WHERE nombre = ? LIMIT 1");
    $stmt->execute([$proveedor_nombre]);
    $prov = $stmt->fetch();

    if ($prov) {
        $proveedor_id = (int)$prov['id'];
    } else {
        $pdo->prepare("
            INSERT INTO proveedores (nombre, tipo, pais, creado_por) VALUES (?, 'muebles_externos', 'México', ?)
        ")->execute([$proveedor_nombre, $user['id']]);
        $proveedor_id = (int)$pdo->lastInsertId();
    }

    // Insertar compra
    $pdo->prepare("
        INSERT INTO compras_externas (proveedor_id, tienda_destino_id, folio_factura, total_compra, notas, usuario_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ")->execute([$proveedor_id, $tienda_destino, $folio_factura ?: null, $total_compra, $notas ?: null, $user['id']]);

    $compra_id = (int)$pdo->lastInsertId();
    $pdo->commit();

    echo json_encode(['ok'=>true, 'compra_id'=>$compra_id, 'mensaje'=>'Compra registrada']);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'Error guardando la compra']);
}
