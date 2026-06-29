<?php
// api/ordenes/save.php — Crear o actualizar orden de producción
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST requerido']); exit; }
require_once '../config/db.php';
session_start();
$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$data = json_decode(file_get_contents('php://input'), true);
$id              = (int)($data['id'] ?? 0);
$cliente_id      = (int)($data['cliente_id'] ?? 0);
$tienda_id       = (int)($data['tienda_origen_id'] ?? 1);
$tipo_orden      = $data['tipo_orden'] ?? 'linea';
$fecha_creacion  = $data['fecha_creacion'] ?? date('Y-m-d');
$fecha_entrega   = $data['fecha_entrega_estimada'] ?? null;
$estatus         = $data['estatus'] ?? 'borrador';
$notas           = trim($data['notas'] ?? '');
$items           = $data['items'] ?? [];

if (!$cliente_id) { http_response_code(422); echo json_encode(['error'=>'cliente_id requerido']); exit; }

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    if ($id) {
        // Actualizar cabecera
        $pdo->prepare("
            UPDATE ordenes SET cliente_id=?, tienda_origen_id=?, tipo_orden=?,
                fecha_entrega_estimada=?, estatus=?, notas=?, actualizado_en=NOW()
            WHERE id=?
        ")->execute([$cliente_id, $tienda_id, $tipo_orden, $fecha_entrega, $estatus, $notas ?: null, $id]);
        // Borrar items previos y reinsertar
        $pdo->prepare("DELETE FROM orden_items WHERE orden_id=?")->execute([$id]);
    } else {
        // Nueva orden
        $pdo->prepare("
            INSERT INTO ordenes (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion,
                fecha_entrega_estimada, estatus, notas, creado_por)
            VALUES (?,?,?,?,?,?,?,?)
        ")->execute([$cliente_id, $tienda_id, $tipo_orden, $fecha_creacion, $fecha_entrega, $estatus, $notas ?: null, $user['id']]);
        $id = (int)$pdo->lastInsertId();
    }

    // Insertar items
    $total = 0;
    if (!empty($items)) {
        $stmtItem = $pdo->prepare("
            INSERT INTO orden_items (orden_id, producto_id, cantidad, acabado_id,
                especificaciones_custom, precio_unitario, descuento_item, subtotal)
            VALUES (?,?,?,?,?,?,?,?)
        ");
        foreach ($items as $item) {
            $qty   = (float)($item['cantidad'] ?? 1);
            $price = (float)($item['precio_unitario'] ?? 0);
            $desc  = (float)($item['descuento_item'] ?? 0);
            $sub   = round(($price * $qty) - $desc, 2);
            $total += $sub;
            $stmtItem->execute([
                $id,
                (int)$item['producto_id'],
                $qty,
                !empty($item['acabado_id']) ? (int)$item['acabado_id'] : null,
                !empty($item['especificaciones_custom']) ? json_encode($item['especificaciones_custom']) : null,
                $price, $desc, $sub
            ]);
        }
    }

    // Actualizar total
    $pdo->prepare("UPDATE ordenes SET total=? WHERE id=?")->execute([$total, $id]);

    $pdo->commit();
    echo json_encode(['ok'=>true, 'orden_id'=>$id, 'total'=>$total]);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'Error guardando la orden: '.$e->getMessage()]);
}
