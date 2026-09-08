<?php
error_reporting(E_ALL); ini_set('display_errors', 1);
require_once __DIR__ . '/api/config/db.php';
require_once __DIR__ . '/api/config/response.php';
set_json_headers();

$user = $_SESSION['user'] ?? null;
if (!$user) { 
    echo json_encode(['error' => 'No session']); exit; 
}

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

$tienda_id = (int)($data['tienda_id'] ?? 1);
$caja_id   = (int)($data['caja_id'] ?? 0);
$cliente_id= (int)($data['cliente_id'] ?? 1);
$items     = $data['items'] ?? [];
$pagos     = $data['pagos'] ?? [];

$total_venta = 0;
foreach ($items as $it) {
    $sub = ((float)$it['precio_unitario'] * (int)$it['cantidad']) - (float)($it['descuento_item'] ?? 0);
    $total_venta += $sub;
}

try {
    $pdo->beginTransaction();

    // 1. Crear venta
    $stmt = $pdo->prepare("
        INSERT INTO ventas_tienda (tienda_id, caja_id, usuario_id, cliente_id, total, estatus)
        VALUES (?, ?, ?, ?, ?, 'completada')
    ");
    $stmt->execute([$tienda_id, $caja_id, $user['id'], $cliente_id, $total_venta]);
    $venta_id = $pdo->lastInsertId();

    // 2. Items
    $stmtItem = $pdo->prepare("
        INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, descuento)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmtInv = $pdo->prepare("
        UPDATE inventario_tienda 
        SET stock_actual = stock_actual - ? 
        WHERE id = ? AND stock_actual >= ?
    ");

    foreach ($items as $it) {
        $stmtItem->execute([
            $venta_id,
            $it['producto_id'],
            $it['cantidad'],
            $it['precio_unitario'],
            $it['descuento_item'] ?? 0
        ]);

        $stmtInv->execute([
            $it['cantidad'],
            $it['inventario_tienda_id'],
            $it['cantidad']
        ]);
        if ($stmtInv->rowCount() === 0) {
            throw new Exception("Stock insuficiente para el producto (inv_id={$it['inventario_tienda_id']})");
        }
    }

    // 3. Pagos
    $stmtPago = $pdo->prepare("
        INSERT INTO pagos_venta (venta_id, metodo_pago, monto_pagado, referencia_pago)
        VALUES (?, ?, ?, ?)
    ");
    foreach ($pagos as $p) {
        $stmtPago->execute([
            $venta_id,
            $p['metodo'],
            $p['monto'],
            $p['referencia'] ?? null
        ]);
    }

    // 5. Caja
    $efectivo = array_sum(array_map(
        fn($p) => $p['metodo'] === 'efectivo' ? (float)$p['monto'] : 0,
        $pagos
    ));
    if ($efectivo > 0) {
        $pdo->prepare("
            UPDATE cajas_tienda
            SET total_efectivo_esperado = total_efectivo_esperado + ?
            WHERE id = ?
        ")->execute([$efectivo, $caja_id]);
    }

    $pdo->commit();
    echo json_encode(['ok' => true, 'venta_id' => $venta_id]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['error' => 'EX: ' . $e->getMessage()]);
}
?>
