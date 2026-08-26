<?php
// api/embarques/recibir.php — Procesa la recepción de embarque en tienda
require_once '../config/db.php';
require_once '../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'repartidor']);


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$embarque_id = (int)($data['embarque_id'] ?? 0);
$items = $data['items'] ?? []; // Array de { embarque_item_id, cantidad_recibida, cantidad_danada }
$user = current_user();

if (!$embarque_id || empty($items)) {
    json_error('embarque_id e items son requeridos', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // 1. Validar que el embarque existe y está activo
    $stmtEmb = $pdo->prepare("SELECT id, estatus, tienda_destino_id FROM embarques WHERE id = ?");
    $stmtEmb->execute([$embarque_id]);
    $embarque = $stmtEmb->fetch();

    if (!$embarque) {
        throw new Exception("Embarque no encontrado");
    }
    if ($embarque['estatus'] === 'entregado') {
        throw new Exception("El embarque ya fue recibido y entregado previamente.");
    }

    $tienda_destino_id = $embarque['tienda_destino_id'];

    // 2. Procesar cada item de la recepción
    foreach ($items as $it) {
        $ei_id = (int)($it['embarque_item_id'] ?? 0);
        $prod_id_input = (int)($it['producto_id'] ?? 0);
        $orden_item_id_input = (int)($it['orden_item_id'] ?? 0);
        $cantidad_recibida = (float)($it['cantidad_recibida'] ?? 0);
        $cantidad_danada = (float)($it['cantidad_danada'] ?? 0);

        if ($cantidad_recibida < 0 || $cantidad_danada < 0) {
            throw new Exception("Cantidades no pueden ser negativas");
        }

        // Consultar el item de embarque y datos del producto (resolución tolerante)
        $stmtIt = $pdo->prepare("
            SELECT ei.id, ei.orden_item_id, ei.producto_id, ei.cantidad_embarcada, 
                   p.precio_costo_base, p.precio_venta_base
            FROM embarque_items ei
            INNER JOIN productos p ON p.id = ei.producto_id
            WHERE (ei.id = ? AND ei.embarque_id = ?)
               OR (ei.embarque_id = ? AND (ei.producto_id = ? OR (ei.orden_item_id IS NOT NULL AND ei.orden_item_id = ?)))
            ORDER BY (ei.id = ?) DESC
            LIMIT 1
        ");
        $stmtIt->execute([$ei_id, $embarque_id, $embarque_id, $prod_id_input, $orden_item_id_input, $ei_id]);
        $itemDb = $stmtIt->fetch();

        if (!$itemDb) {
            // Si el embarque tiene algún ítem disponible, tomar el primero
            $stmtFallback = $pdo->prepare("
                SELECT ei.id, ei.orden_item_id, ei.producto_id, ei.cantidad_embarcada, 
                       p.precio_costo_base, p.precio_venta_base
                FROM embarque_items ei
                INNER JOIN productos p ON p.id = ei.producto_id
                WHERE ei.embarque_id = ?
                LIMIT 1
            ");
            $stmtFallback->execute([$embarque_id]);
            $itemDb = $stmtFallback->fetch();
        }

        if (!$itemDb) {
            throw new Exception("Item de embarque no encontrado para el embarque #$embarque_id");
        }

        $realEiId = (int)$itemDb['id'];
        $producto_id = (int)$itemDb['producto_id'];
        $orden_item_id = $itemDb['orden_item_id'] ? (int)$itemDb['orden_item_id'] : null;

        // Actualizar el item de embarque
        $recibido = ($cantidad_recibida > 0) ? 1 : 0;
        $stmtUpIt = $pdo->prepare("
            UPDATE embarque_items 
            SET cantidad_recibida = ?, 
                cantidad_danada = ?, 
                recibido_en_tienda = ? 
            WHERE id = ? AND embarque_id = ?
        ");
        $stmtUpIt->execute([$cantidad_recibida, $cantidad_danada, $recibido, $realEiId, $embarque_id]);

        // Cargar stock en tienda si hay cantidad recibida
        if ($cantidad_recibida > 0) {
            // Comprobar si ya existe el inventario en esa tienda para ese producto con origen 'embarque_taller'
            $stmtInv = $pdo->prepare("
                SELECT id 
                FROM inventario_tienda 
                WHERE tienda_id = ? AND producto_id = ? AND origen_stock = 'embarque_taller'
                LIMIT 1
            ");
            $stmtInv->execute([$tienda_destino_id, $producto_id]);
            $invRow = $stmtInv->fetch();

            if ($invRow) {
                $inventario_tienda_id = $invRow['id'];
            } else {
                // Si no existe, crearlo en 0
                $stmtNewInv = $pdo->prepare("
                    INSERT INTO inventario_tienda 
                    (tienda_id, producto_id, cantidad_disponible, cantidad_reservada, origen_stock, costo_unitario, precio_venta, lote_referencia_tipo, lote_referencia_id)
                    VALUES (?, ?, 0, 0, 'embarque_taller', ?, ?, 'embarque', ?)
                ");
                $stmtNewInv->execute([
                    $tienda_destino_id,
                    $producto_id,
                    $itemDb['precio_costo_base'],
                    $itemDb['precio_venta_base'],
                    $embarque_id
                ]);
                $inventario_tienda_id = $pdo->lastInsertId();
            }

            // Registrar movimiento -> Esto dispara el trigger MySQL que actualiza la cantidad_disponible
            $stmtMov = $pdo->prepare("
                INSERT INTO movimientos_inventario_tienda
                (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
                VALUES (?, 'entrada', ?, 'embarque', ?, ?, 'Recepción física en sucursal')
            ");
            $stmtMov->execute([
                $inventario_tienda_id,
                $cantidad_recibida,
                $embarque_id,
                $user['id']
            ]);
        }

        // Si hay piezas dañadas, registrar en devoluciones para logística inversa
        if ($cantidad_danada > 0) {
            $stmtDev = $pdo->prepare("
                INSERT INTO devoluciones 
                (origen, referencia_id, producto_id, cantidad, motivo, estatus, tienda_id, fecha, usuario_id, notas)
                VALUES ('orden_produccion', ?, ?, ?, 'Pieza dañada o defectuosa al recibir en tienda', 'recibida', ?, CURDATE(), ?, 'Generado automáticamente por incidencia en recepción de embarque')
            ");
            $stmtDev->execute([
                $orden_item_id,
                $producto_id,
                $cantidad_danada,
                $tienda_destino_id,
                $user['id']
            ]);
        }

        // Actualizar estatus del orden_item a entregado si aplica
        if ($orden_item_id) {
            $pdo->prepare("UPDATE orden_items SET estatus_item = 'entregado' WHERE id = ?")->execute([$orden_item_id]);
        }
    }

    // 3. Finalizar el embarque a 'entregado'
    $stmtFin = $pdo->prepare("UPDATE embarques SET estatus = 'entregado', actualizado_en = NOW() WHERE id = ?");
    $stmtFin->execute([$embarque_id]);

    // 4. Sincronizar órdenes relacionadas
    $stmtOrds = $pdo->prepare("
        SELECT DISTINCT oi.orden_id 
        FROM embarque_items ei
        JOIN orden_items oi ON oi.id = ei.orden_item_id
        WHERE ei.embarque_id = ? AND oi.orden_id IS NOT NULL
    ");
    $stmtOrds->execute([$embarque_id]);
    $ords = $stmtOrds->fetchAll(PDO::FETCH_COLUMN);

    if ($embarque['orden_id'] && !in_array($embarque['orden_id'], $ords)) {
        $ords[] = $embarque['orden_id'];
    }

    foreach ($ords as $oid) {
        $nuevoEst = sincronizar_estatus_orden($pdo, (int)$oid);
        if ($nuevoEst === 'entregada') {
            $pdo->prepare("UPDATE ordenes SET fecha_entrega_real = CURDATE() WHERE id = ?")->execute([(int)$oid]);
        }
    }

    $pdo->commit();
    json_ok(['message' => 'Embarque recibido correctamente y trazabilidad actualizada']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al recibir embarque: ' . $e->getMessage(), 500);
}
