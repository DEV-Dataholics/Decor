<?php
// api/inventario/ajuste_manual.php
// POST — Carga inicial de stock o ajuste manual de inventario en tienda.
// Crea un movimiento de tipo "entrada" o "ajuste" y actualiza inventario_tienda.
// Si el producto NO tiene fila en inventario_tienda, la crea automáticamente.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$user = current_user();

// ── Campos requeridos ──────────────────────────────────────────────────────
$producto_id  = (int)($data['producto_id']  ?? 0);
$tienda_id    = (int)($data['tienda_id']    ?? 0);
$tipo         = $data['tipo'] ?? 'entrada';          // 'entrada' | 'ajuste'
$cantidad     = (float)($data['cantidad']   ?? 0);
$precio_venta = (float)($data['precio_venta'] ?? 0);
$costo        = (float)($data['costo_unitario'] ?? 0);
$origen_stock = $data['origen_stock'] ?? 'compra_externa';  // 'artesania'|'compra_externa'|'pieza_unica'
$notas        = trim($data['notas'] ?? '');

// Para ajuste tipo "establecer cantidad absoluta"
$es_absoluto  = (bool)($data['es_absoluto'] ?? false);

if (!$producto_id || !$tienda_id) {
    json_error('producto_id y tienda_id son requeridos', 422);
}

$origenes_validos = ['embarque_taller', 'compra_externa', 'artesania', 'pieza_unica'];
if (!in_array($origen_stock, $origenes_validos)) {
    json_error("origen_stock inválido. Valores válidos: " . implode(', ', $origenes_validos), 422);
}

$tipos_validos = ['entrada', 'ajuste'];
if (!in_array($tipo, $tipos_validos)) {
    json_error("tipo inválido. Valores válidos: entrada, ajuste", 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // ── 1. Verificar si ya existe fila en inventario_tienda ──────────────
    $checkStmt = $pdo->prepare("
        SELECT id, cantidad_disponible
        FROM inventario_tienda
        WHERE tienda_id = ? AND producto_id = ?
        LIMIT 1
        FOR UPDATE
    ");
    $checkStmt->execute([$tienda_id, $producto_id]);
    $existente = $checkStmt->fetch();

    if ($existente) {
        $inv_id = (int)$existente['id'];
        $stock_actual = (float)$existente['cantidad_disponible'];

        // Actualizar precio/costo si se proporcionan
        if ($precio_venta > 0 || $costo > 0) {
            $upd = $pdo->prepare("
                UPDATE inventario_tienda
                SET precio_venta  = CASE WHEN :pv > 0 THEN :pv2 ELSE precio_venta END,
                    costo_unitario = CASE WHEN :cu > 0 THEN :cu2 ELSE costo_unitario END
                WHERE id = :id
            ");
            $upd->execute([
                ':pv' => $precio_venta, ':pv2' => $precio_venta,
                ':cu' => $costo, ':cu2' => $costo,
                ':id' => $inv_id
            ]);
        }
    } else {
        // ── 2. Crear fila en inventario_tienda si no existe ──────────────
        if ($precio_venta <= 0) {
            // Tomar precio base del producto como fallback
            $pBase = $pdo->prepare("SELECT precio_venta_base FROM productos WHERE id = ?");
            $pBase->execute([$producto_id]);
            $prod = $pBase->fetch();
            $precio_venta = $prod ? (float)$prod['precio_venta_base'] : 0;
        }

        $ins = $pdo->prepare("
            INSERT INTO inventario_tienda
                (tienda_id, producto_id, cantidad_disponible, cantidad_reservada,
                 origen_stock, costo_unitario, precio_venta,
                 lote_referencia_tipo, lote_referencia_id)
            VALUES (?, ?, 0, 0, ?, ?, ?, NULL, NULL)
        ");
        $ins->execute([
            $tienda_id, $producto_id, $origen_stock,
            $costo, $precio_venta
        ]);
        $inv_id = (int)$pdo->lastInsertId();
        $stock_actual = 0;
    }

    // ── 3. Calcular cantidad del movimiento ──────────────────────────────
    if ($es_absoluto && $tipo === 'ajuste') {
        // El usuario quiere ESTABLECER el stock a un valor específico
        $cantidad_mov = $cantidad - $stock_actual;  // Puede ser negativa (bajar stock)
        $tipo_mov = 'ajuste';
    } else {
        $cantidad_mov = $cantidad;
        $tipo_mov = $tipo;
    }

    if ($cantidad_mov == 0) {
        $pdo->rollBack();
        json_error('La cantidad no tiene diferencia con el stock actual', 422);
    }

    // ── 4. Registrar movimiento (el trigger actualiza inventario_tienda) ─
    $movStmt = $pdo->prepare("
        INSERT INTO movimientos_inventario_tienda
            (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
        VALUES (?, ?, ?, 'ajuste_manual', NULL, ?, ?)
    ");
    $movStmt->execute([
        $inv_id, $tipo_mov, $cantidad_mov,
        $user['id'],
        $notas ?: ($es_absoluto ? "Ajuste absoluto a $cantidad piezas" : "Carga inicial / ajuste manual")
    ]);

    $pdo->commit();

    // Obtener stock final
    $finalStmt = $pdo->prepare("SELECT cantidad_disponible FROM inventario_tienda WHERE id = ?");
    $finalStmt->execute([$inv_id]);
    $stock_final = (float)$finalStmt->fetchColumn();

    json_ok([
        'inventario_tienda_id' => $inv_id,
        'stock_anterior'       => $stock_actual,
        'cantidad_movimiento'  => $cantidad_mov,
        'stock_final'          => $stock_final,
        'mensaje'              => 'Ajuste registrado correctamente',
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    json_error('Error al registrar ajuste: ' . $e->getMessage(), 500);
}
