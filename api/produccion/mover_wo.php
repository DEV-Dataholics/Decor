<?php
// api/produccion/mover_wo.php
// Actualiza el estatus y asignación de un work_order (tablero Kanban de Producción)

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'carpintero']);

$pdo = getDB();
$user = current_user();

$data = get_body();
$id = (int)($data['id'] ?? 0);
$estatusFrontend = trim($data['estatus'] ?? '');
$assignment = $data['assignment'] ?? null;

if (!$id || !$estatusFrontend) {
    json_error('id y estatus requeridos', 422);
}

// Mapeo bidireccional de estatus Frontend <-> MySQL ENUM
$statusMap = [
    'pendiente'      => 'pendiente',
    'en_produccion'  => 'en_progreso',
    'en_progreso'    => 'en_progreso',
    'acabados'       => 'en_revision',
    'en_revision'    => 'en_revision',
    'listo_embarque' => 'terminado',
    'terminado'      => 'terminado',
    'pagado'         => 'pagado'
];

$dbStatus = $statusMap[$estatusFrontend] ?? null;
if (!$dbStatus) {
    json_error("Estatus no reconocido: $estatusFrontend", 422);
}

try {
    $pdo->beginTransaction();

    // 1. Obtener la WO actual
    $stmtWo = $pdo->prepare("SELECT * FROM work_orders WHERE id = ? FOR UPDATE");
    $stmtWo->execute([$id]);
    $wo = $stmtWo->fetch(PDO::FETCH_ASSOC);

    if (!$wo) {
        $pdo->rollBack();
        json_error('Work order no encontrada', 404);
    }

    $cantOriginal = (float)$wo['cantidad_asignada'];
    $cantMover = $cantOriginal;

    if ($assignment && isset($assignment['cantidad_asignada']) && (float)$assignment['cantidad_asignada'] > 0) {
        $cantMover = (float)$assignment['cantidad_asignada'];
    }

    // 2. Extraer datos de asignación si vienen
    $empleado_id = $wo['empleado_id'];
    $costo_unitario = (float)$wo['costo_mano_obra_unitario'];

    if ($assignment) {
        if (!empty($assignment['empleado_id'])) {
            $empleado_id = (int)$assignment['empleado_id'];
        }
        if (isset($assignment['costo_mano_obra_unitario']) && (float)$assignment['costo_mano_obra_unitario'] > 0) {
            $costo_unitario = (float)$assignment['costo_mano_obra_unitario'];
        } elseif (isset($assignment['costo_mano_obra']) && (float)$assignment['costo_mano_obra'] > 0 && $cantMover > 0) {
            $costo_unitario = (float)$assignment['costo_mano_obra'] / $cantMover;
        }
    }

    $monto_pago = $cantMover * $costo_unitario;

    // 3. Lógica de división (Split) si la cantidad a mover es menor a la cantidad actual
    if ($cantMover > 0 && $cantMover < $cantOriginal) {
        // Reducir la original (se queda en su estatus actual)
        $cantRestante = $cantOriginal - $cantMover;
        $montoRestante = $cantRestante * (float)$wo['costo_mano_obra_unitario'];
        
        $pdo->prepare("
            UPDATE work_orders 
            SET cantidad_asignada = ?, monto_pago = ?, actualizado_en = NOW() 
            WHERE id = ?
        ")->execute([$cantRestante, $montoRestante, $id]);

        // Insertar la nueva WO con la cantidad asignada y nuevo estatus
        $stmtInsert = $pdo->prepare("
            INSERT INTO work_orders 
            (orden_item_id, empleado_id, asignado_por, semana_nomina_id, fecha_asignacion, fecha_inicio_real, estatus, cantidad_asignada, costo_mano_obra_unitario, monto_pago, creado_por, actualizado_en)
            VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, NOW())
        ");
        $fechaInicio = in_array($dbStatus, ['en_progreso', 'en_revision', 'terminado']) ? date('Y-m-d') : null;
        $stmtInsert->execute([
            $wo['orden_item_id'],
            $empleado_id,
            $user['empleado_id'] ?: 1,
            $wo['semana_nomina_id'] ?: 1,
            $fechaInicio,
            $dbStatus,
            $cantMover,
            $costo_unitario,
            $monto_pago,
            $user['id'] ?: 1
        ]);

        $nueva_wo_id = $pdo->lastInsertId();

        $pdo->commit();
        json_ok([
            'mensaje' => 'Work order dividida y actualizada correctamente',
            'nueva_wo_id' => $nueva_wo_id,
            'estatus' => $estatusFrontend
        ]);
        exit;
    }

    // 4. Actualización normal de la Work Order
    $fechaInicio = $wo['fecha_inicio_real'];
    if (!$fechaInicio && in_array($dbStatus, ['en_progreso', 'en_revision', 'terminado'])) {
        $fechaInicio = date('Y-m-d');
    }

    $fechaTerminado = $wo['fecha_terminado'];
    if ($dbStatus === 'terminado' && !$fechaTerminado) {
        $fechaTerminado = date('Y-m-d H:i:s');
    }

    $stmtUpd = $pdo->prepare("
        UPDATE work_orders 
        SET estatus = :estatus,
            empleado_id = :empleado_id,
            cantidad_asignada = :cantidad,
            costo_mano_obra_unitario = :costo_unit,
            monto_pago = :monto_pago,
            fecha_inicio_real = :fecha_inicio,
            fecha_terminado = :fecha_terminado,
            actualizado_en = NOW()
        WHERE id = :id
    ");

    $stmtUpd->execute([
        ':estatus'         => $dbStatus,
        ':empleado_id'     => $empleado_id,
        ':cantidad'        => $cantMover,
        ':costo_unit'      => $costo_unitario,
        ':monto_pago'      => $monto_pago,
        ':fecha_inicio'    => $fechaInicio,
        ':fecha_terminado' => $fechaTerminado,
        ':id'              => $id
    ]);

    // 5. Sincronizar estatus del orden_item y de la orden padre
    $itemStatus = 'en_produccion';
    if ($dbStatus === 'terminado' || $dbStatus === 'pagado') {
        $itemStatus = 'terminado';
    } elseif ($dbStatus === 'pendiente') {
        $itemStatus = 'pendiente';
    }

    $pdo->prepare("
        UPDATE orden_items 
        SET estatus_item = ? 
        WHERE id = ?
    ")->execute([$itemStatus, $wo['orden_item_id']]);

    // Obtener orden_id y sincronizar estatus de la orden
    $ordId = (int)$pdo->query("SELECT orden_id FROM orden_items WHERE id = " . (int)$wo['orden_item_id'])->fetchColumn();
    if ($ordId > 0) {
        sincronizar_estatus_orden($pdo, $ordId);
    }

    $pdo->commit();
    json_ok([
        'mensaje' => 'Work order actualizada correctamente',
        'wo_id'   => $id,
        'estatus' => $estatusFrontend
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al mover work order: ' . $e->getMessage(), 500);
}
