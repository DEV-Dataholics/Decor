<?php
// api/embarques/recibir.php — Procesa la recepción de embarque en tienda
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
require_once '../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

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

    // 1. Validar que el embarque existe y está en tránsito o embarcado
    $stmtEmb = $pdo->prepare("SELECT id, estatus, tienda_destino_id FROM embarques WHERE id = ?");
    $stmtEmb->execute([$embarque_id]);
    $embarque = $stmtEmb->fetch();

    if (!$embarque) {
        throw new Exception("Embarque no encontrado");
    }
    if ($embarque['estatus'] !== 'en_transito' && $embarque['estatus'] !== 'embarcado') {
        throw new Exception("El embarque no está en tránsito o embarcado para ser recibido (Estado actual: " . $embarque['estatus'] . ")");
    }

    $tienda_destino_id = $embarque['tienda_destino_id'];

    // 2. Procesar cada item de la recepción
    foreach ($items as $it) {
        $ei_id = (int)$it['embarque_item_id'];
        $cantidad_recibida = (float)$it['cantidad_recibida'];
        $cantidad_danada = (float)$it['cantidad_danada'];

        if ($cantidad_recibida < 0 || $cantidad_danada < 0) {
            throw new Exception("Cantidades no pueden ser negativas");
        }

        // Consultar el item de embarque y datos del producto
        $stmtIt = $pdo->prepare("
            SELECT ei.orden_item_id, ei.producto_id, ei.cantidad_embarcada, 
                   p.precio_costo_base, p.precio_venta_base
            FROM embarque_items ei
            INNER JOIN productos p ON p.id = ei.producto_id
            WHERE ei.id = ? AND ei.embarque_id = ?
        ");
        $stmtIt->execute([$ei_id, $embarque_id]);
        $itemDb = $stmtIt->fetch();

        if (!$itemDb) {
            throw new Exception("Item de embarque no encontrado ($ei_id)");
        }

        $producto_id = $itemDb['producto_id'];
        $orden_item_id = $itemDb['orden_item_id'];

        // Actualizar el item de embarque
        $stmtUpIt = $pdo->prepare("
            UPDATE embarque_items 
            SET cantidad_recibida = ?, 
                cantidad_danada = ?, 
                recibido_en_tienda = 1 
            WHERE id = ? AND embarque_id = ?
        ");
        $stmtUpIt->execute([$cantidad_recibida, $cantidad_danada, $ei_id, $embarque_id]);

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
    }

    // 3. Finalizar el embarque a 'entregado'
    $stmtFin = $pdo->prepare("UPDATE embarques SET estatus = 'entregado', actualizado_en = NOW() WHERE id = ?");
    $stmtFin->execute([$embarque_id]);

    $pdo->commit();
    json_ok(['message' => 'Embarque recibido correctamente en tienda y stock actualizado']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al recibir embarque: ' . $e->getMessage(), 500);
}
