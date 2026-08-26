<?php
// api/ordenes/save.php — Crear o actualizar orden de producción
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'ventas', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$user = current_user();
$userId = !empty($user['id']) ? (int)$user['id'] : 1;

$id              = (int)($data['id'] ?? 0);
$cliente_id      = (int)($data['cliente_id'] ?? 0);
$tienda_id       = (int)($data['tienda_origen_id'] ?? 1);
$tipo_orden_raw  = trim($data['tipo_orden'] ?? 'linea');
$tipo_orden      = in_array($tipo_orden_raw, ['linea', 'linea_especial', 'especial']) ? $tipo_orden_raw : ($tipo_orden_raw === 'orden_especial' ? 'especial' : 'linea');
$fecha_creacion  = $data['fecha_creacion'] ?? date('Y-m-d');
$fecha_entrega   = $data['fecha_entrega_estimada'] ?? null;
$estatus_raw     = trim($data['estatus'] ?? 'confirmada');
$validStatuses   = ['borrador','confirmada','en_produccion','lista','embarcada','entregada','cancelada'];
$estatus         = in_array($estatus_raw, $validStatuses) ? $estatus_raw : 'confirmada';
$notas           = trim($data['notas'] ?? '');
$items           = $data['items'] ?? [];

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    if ($cliente_id <= 0) {
        $cliRow = $pdo->query("SELECT id FROM clientes WHERE activo = 1 LIMIT 1")->fetchColumn();
        $cliente_id = $cliRow ? (int)$cliRow : 1;
    }

    // Buscar o crear semana de nómina abierta
    $stmtSemana = $pdo->query("SELECT id FROM semanas_nomina WHERE estatus = 'abierta' ORDER BY id DESC LIMIT 1");
    $semana_id = $stmtSemana->fetchColumn();
    if (!$semana_id) {
        $stmtNuevaSemana = $pdo->prepare("
            INSERT INTO semanas_nomina (fecha_inicio, fecha_corte, estatus)
            VALUES (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'abierta')
        ");
        $stmtNuevaSemana->execute();
        $semana_id = (int)$pdo->lastInsertId();
    }

    // Empleado por defecto
    $empDefault = (int)$pdo->query("SELECT id FROM empleados WHERE activo = 1 ORDER BY id ASC LIMIT 1")->fetchColumn();
    if (!$empDefault) {
        $empDefault = 1;
    }

    if ($id > 0) {
        // Actualizar cabecera
        $pdo->prepare("
            UPDATE ordenes SET cliente_id=?, tienda_origen_id=?, tipo_orden=?,
                fecha_entrega_estimada=?, estatus=?, notas=?, actualizado_en=NOW()
            WHERE id=?
        ")->execute([$cliente_id, $tienda_id, $tipo_orden, $fecha_entrega, $estatus, $notas ?: null, $id]);

        // Borrar work orders previas y items previos si aún están en pendiente
        $pdo->prepare("
            DELETE w FROM work_orders w
            INNER JOIN orden_items oi ON w.orden_item_id = oi.id
            WHERE oi.orden_id = ?
        ")->execute([$id]);
        $pdo->prepare("DELETE FROM orden_items WHERE orden_id=?")->execute([$id]);
    } else {
        // Nueva orden
        $pdo->prepare("
            INSERT INTO ordenes (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion,
                fecha_entrega_estimada, estatus, notas, creado_por)
            VALUES (?,?,?,?,?,?,?,?)
        ")->execute([$cliente_id, $tienda_id, $tipo_orden, $fecha_creacion, $fecha_entrega, $estatus, $notas ?: null, $userId]);
        $id = (int)$pdo->lastInsertId();
    }

    // Insertar items
    $total = 0;
    if (!empty($items)) {
        $stmtItem = $pdo->prepare("
            INSERT INTO orden_items (orden_id, producto_id, cantidad, acabado_id,
                especificaciones_custom, precio_unitario, descuento_item, subtotal, estatus_item)
            VALUES (?,?,?,?,?,?,?,?,'pendiente')
        ");
        $stmtWo = $pdo->prepare("
            INSERT INTO work_orders 
                (orden_item_id, empleado_id, asignado_por, semana_nomina_id, fecha_asignacion, estatus, cantidad_asignada, costo_mano_obra_unitario, monto_pago, creado_por)
            VALUES (?, ?, ?, ?, CURDATE(), 'pendiente', ?, ?, ?, ?)
        ");
        foreach ($items as $item) {
            $qty   = (float)($item['cantidad'] ?? 1);
            $price = (float)($item['precio_unitario'] ?? 0);
            $desc  = (float)($item['descuento_item'] ?? 0);
            $sub   = round(($price * $qty) - $desc, 2);
            $total += $sub;
            
            $acabado_id = !empty($item['acabado_id']) ? (int)$item['acabado_id'] : null;
            if (empty($acabado_id) && !empty($item['acabado_nombre'])) {
                $stmtAc = $pdo->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
                $stmtAc->execute([trim($item['acabado_nombre'])]);
                $ac_id = $stmtAc->fetchColumn();
                if ($ac_id) {
                    $acabado_id = (int)$ac_id;
                }
            }

            $prod_id = (int)($item['producto_id'] ?? 0);
            $stmtItem->execute([
                $id,
                $prod_id,
                $qty,
                $acabado_id,
                !empty($item['especificaciones_custom']) ? json_encode($item['especificaciones_custom']) : null,
                $price, $desc, $sub
            ]);
            
            $orden_item_id = (int)$pdo->lastInsertId();

            // Buscar costo de mano de obra
            $costo_mo = 0.00;
            if ($prod_id > 0) {
                $stmtCosto = $pdo->prepare("SELECT precio_costo_base FROM productos WHERE id = ?");
                $stmtCosto->execute([$prod_id]);
                $costo_mo = (float)($stmtCosto->fetchColumn() ?: 0.00);
            }
            $monto_pago = $qty * $costo_mo;

            // Recrear work orders con todas las columnas no nulas
            $stmtWo->execute([
                $orden_item_id,
                $empDefault,
                $userId,
                $semana_id,
                $qty,
                $costo_mo,
                $monto_pago,
                $userId
            ]);
        }
    }

    // Actualizar total
    $pdo->prepare("UPDATE ordenes SET total=? WHERE id=?")->execute([$total, $id]);

    $pdo->commit();
    json_ok(['orden_id' => $id, 'total' => $total, 'mensaje' => 'Orden guardada con éxito']);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error guardando la orden: ' . $e->getMessage(), 500);
}
