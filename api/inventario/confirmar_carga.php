<?php
// api/inventario/confirmar_carga.php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$user = current_user();
$items = $data['items'] ?? [];
$notasGlobal = trim($data['notas'] ?? '');

if (!is_array($items)) {
    json_error('El campo items debe ser un array', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT id, cantidad_disponible FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1 FOR UPDATE");
    $stmtInsInv = $pdo->prepare("
        INSERT INTO inventario_tienda 
            (tienda_id, producto_id, cantidad_disponible, cantidad_reservada, origen_stock, costo_unitario, precio_venta, lote_referencia_tipo, lote_referencia_id)
        VALUES (?, ?, 0, 0, 'compra_externa', 0, 0, NULL, NULL)
    ");
    $stmtUpdInv = $pdo->prepare("UPDATE inventario_tienda SET cantidad_disponible = ? WHERE id = ?");
    $stmtGetPrice = $pdo->prepare("SELECT precio_venta_base FROM productos WHERE id = ?");
    $stmtSetPrice = $pdo->prepare("UPDATE inventario_tienda SET precio_venta = ? WHERE id = ?");

    $stmtMov = $pdo->prepare("
        INSERT INTO movimientos_inventario_tienda
            (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
        VALUES (?, ?, ?, 'ajuste_manual', NULL, ?, ?)
    ");

    foreach ($items as $item) {
        $producto_id = (int)($item['producto_id'] ?? 0);
        $tienda_id = (int)($item['tienda_id'] ?? 0);
        $cantidad = (float)($item['cantidad'] ?? 0);
        $action = $item['action'] ?? 'sumar'; // 'sumar' | 'reemplazar'

        if (!$producto_id || !$tienda_id || $cantidad <= 0) {
            continue;
        }

        // 1. Obtener o crear inventario_tienda
        $stmtCheck->execute([$tienda_id, $producto_id]);
        $inv = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($inv) {
            $inv_id = (int)$inv['id'];
            $stock_actual = (float)$inv['cantidad_disponible'];
        } else {
            $stmtInsInv->execute([$tienda_id, $producto_id]);
            $inv_id = (int)$pdo->lastInsertId();
            $stock_actual = 0.0;

            // Poner precio base por defecto
            $stmtGetPrice->execute([$producto_id]);
            $pBase = (float)$stmtGetPrice->fetchColumn();
            if ($pBase > 0) {
                $stmtSetPrice->execute([$pBase, $inv_id]);
            }
        }

        // 2. Determinar tipo movimiento y cantidad final
        if ($action === 'reemplazar') {
            $diff = $cantidad - $stock_actual;
            $tipo_mov = 'ajuste';
        } else {
            // Action is 'sumar'
            $diff = $cantidad;
            $tipo_mov = 'entrada';
        }

        if ($diff == 0) {
            continue; // No hay cambios para este item
        }

        // 3. Aplicar stock
        $nuevo_stock = $stock_actual + $diff;
        $stmtUpdInv->execute([$nuevo_stock, $inv_id]);

        // 4. Logear movimiento
        $comentario = $notasGlobal ?: "Entrada inicial de inventario / carga manual";
        if ($action === 'reemplazar') {
            $comentario .= " (Reemplazo absoluto a $cantidad)";
        } else {
            $comentario .= " (Sumado $cantidad piezas)";
        }

        $stmtMov->execute([
            $inv_id,
            $tipo_mov,
            $diff,
            $user['id'],
            $comentario
        ]);
    }

    $pdo->commit();
    json_ok(['mensaje' => 'Inventario inicial cargado exitosamente']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al registrar inventario inicial: ' . $e->getMessage(), 500);
}
