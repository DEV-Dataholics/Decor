<?php
// api/ventas/checkout.php
// Procesa la venta del POS: acepta carrito, cobra y descuenta inventario_tienda.
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    http_response_code(405); 
    echo json_encode(['ok' => false, 'error' => 'Método no permitido'], JSON_UNESCAPED_UNICODE); 
    exit; 
}

$user = $_SESSION['user'] ?? null;
if (!$user) { 
    http_response_code(401); 
    echo json_encode(['ok' => false, 'error' => 'Sesión requerida'], JSON_UNESCAPED_UNICODE); 
    exit; 
}

$data = json_decode(file_get_contents('php://input'), true);

// ── Validaciones básicas ────────────────────────────────────────
$items     = $data['items']     ?? [];     // [{inventario_tienda_id, producto_id, cantidad, precio_unitario, descuento_item}]
$caja_id   = (int)($data['caja_id']   ?? 0);
$tienda_id = (int)($data['tienda_id'] ?? 0);
$pagos     = $data['pagos']     ?? [];     // [{metodo, monto, referencia}]
$cliente_id = !empty($data['cliente_id']) ? (int)$data['cliente_id'] : null;
$cliente_nombre_libre = trim($data['cliente_nombre_libre'] ?? '');

if (empty($items) || !$caja_id || !$tienda_id || empty($pagos)) {
    http_response_code(422);
    echo json_encode(['error' => 'Faltan datos requeridos: items, caja_id, tienda_id, pagos']);
    exit;
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Calcular totales
    $subtotal = 0;
    $descuento_total = 0;
    foreach ($items as &$item) {
        $item['subtotal'] = round(($item['precio_unitario'] * $item['cantidad']) - $item['descuento_item'], 2);
        $subtotal        += $item['precio_unitario'] * $item['cantidad'];
        $descuento_total += $item['descuento_item'];
    }
    unset($item);
    $total = round($subtotal - $descuento_total, 2);

    // Validar que el total de pagos cuadre con el total de la venta (tolerancia $0.01)
    $total_pagado = array_sum(array_column($pagos, 'monto'));
    if (abs($total_pagado - $total) > 0.01) {
        $pdo->rollBack();
        http_response_code(422);
        echo json_encode(['error' => "Total de pagos ($total_pagado) no coincide con total de venta ($total)"]);
        exit;
    }

    // ── 1. Verificar stock por cada ítem ──────────────────────────
    $stmtStock = $pdo->prepare("SELECT cantidad_disponible FROM inventario_tienda WHERE id = ? FOR UPDATE");
    foreach ($items as $item) {
        $stmtStock->execute([(int)$item['inventario_tienda_id']]);
        $row = $stmtStock->fetch();
        if (!$row || $row['cantidad_disponible'] < $item['cantidad']) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(['error' => "Stock insuficiente para el producto (inv_id={$item['inventario_tienda_id']})"]);
            exit;
        }
    }

    // ── 2. Crear cabecera de venta ────────────────────────────────
    $stmtVenta = $pdo->prepare("
        INSERT INTO ventas_tienda
            (tienda_id, cliente_id, cliente_nombre_libre, caja_id,
             estatus, subtotal, descuento_total, impuestos, total, usuario_cajero_id)
        VALUES (?, ?, ?, ?, 'confirmada', ?, ?, 0, ?, ?)
    ");
    $stmtVenta->execute([
        $tienda_id, $cliente_id, $cliente_nombre_libre ?: null,
        $caja_id, $subtotal, $descuento_total, $total, $user['id']
    ]);
    $venta_id = (int)$pdo->lastInsertId();

    // ── 3. Insertar ítems y descontar inventario vía movimiento ──
    $stmtItem = $pdo->prepare("
        INSERT INTO venta_items
            (venta_id, inventario_tienda_id, producto_id, cantidad, precio_unitario, descuento_item, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtMov = $pdo->prepare("
        INSERT INTO movimientos_inventario_tienda
            (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id)
        VALUES (?, 'venta', ?, 'venta', ?, ?)
    ");
    foreach ($items as $item) {
        $stmtItem->execute([
            $venta_id,
            (int)$item['inventario_tienda_id'],
            (int)$item['producto_id'],
            (float)$item['cantidad'],
            (float)$item['precio_unitario'],
            (float)$item['descuento_item'],
            $item['subtotal']
        ]);
        // El trigger trg_actualizar_stock_tienda decrementará cantidad_disponible
        $stmtMov->execute([
            (int)$item['inventario_tienda_id'],
            (float)$item['cantidad'],
            $venta_id,
            $user['id']
        ]);
    }

    // ── 4. Registrar pagos ────────────────────────────────────────
    $stmtPago = $pdo->prepare("
        INSERT INTO pagos_venta (venta_id, metodo, monto, referencia)
        VALUES (?, ?, ?, ?)
    ");
    foreach ($pagos as $pago) {
        $stmtPago->execute([
            $venta_id,
            $pago['metodo'],
            (float)$pago['monto'],
            $pago['referencia'] ?? null
        ]);
    }

    // ── 5. Actualizar total_efectivo_esperado de la caja ─────────
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

    echo json_encode([
        'ok'       => true,
        'venta_id' => $venta_id,
        'total'    => $total,
        'folio'    => str_pad($venta_id, 6, '0', STR_PAD_LEFT),
        'mensaje'  => 'Venta registrada correctamente'
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error interno al procesar la venta']);
}
