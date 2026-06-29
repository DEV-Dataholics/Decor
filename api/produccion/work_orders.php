<?php
// api/produccion/work_orders.php — CRUD de work orders

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

$pdo = getDB();
$user = current_user();

// ── GET: listar work orders ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $estatus     = $_GET['estatus'] ?? null;
    $empleado_id = $_GET['empleado_id'] ?? null;

    $where  = [];
    $params = [];
    if ($estatus)     { $where[] = 'wo.estatus = ?';     $params[] = $estatus; }
    if ($empleado_id) { $where[] = 'wo.empleado_id = ?'; $params[] = (int)$empleado_id; }

    $whereStr = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT wo.id, wo.estatus, wo.fecha_asignacion, wo.fecha_terminado,
               wo.monto_pago, wo.rechazos, wo.notas_calidad,
               e.nombre  AS empleado_nombre, e.rol AS empleado_rol,
               p.nombre  AS producto_nombre, p.codigo_sku,
               oi.cantidad, oi.acabado_id,
               o.id AS orden_id, c.nombre AS cliente_nombre,
               a.nombre AS acabado_nombre
        FROM work_orders wo
        INNER JOIN empleados e      ON e.id  = wo.empleado_id
        INNER JOIN orden_items oi   ON oi.id = wo.orden_item_id
        INNER JOIN ordenes o        ON o.id  = oi.orden_id
        INNER JOIN productos p      ON p.id  = oi.producto_id
        LEFT  JOIN clientes c       ON c.id  = o.cliente_id
        LEFT  JOIN acabados a       ON a.id  = oi.acabado_id
        $whereStr
        ORDER BY wo.fecha_asignacion DESC
        LIMIT 300
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_ok(['items' => $stmt->fetchAll()]);
}

// ── POST: actualizar estatus de work order ────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_body();
    $wo_id   = (int)($data['id'] ?? 0);
    $action  = $data['action'] ?? '';

    if (!$wo_id || !$action) {
        json_error('id y action requeridos', 422);
    }

    $validTransitions = [
        'iniciar'   => ['from'=>'pendiente',    'to'=>'en_progreso'],
        'revisar'   => ['from'=>'en_progreso',  'to'=>'en_revision'],
        'terminar'  => ['from'=>'en_revision',  'to'=>'terminado'],
        'rechazar'  => ['from'=>'en_revision',  'to'=>'en_progreso'],
        'enviar'    => ['from'=>'terminado',    'to'=>'entregado'], // Nuevo estado para ingesta
    ];

    if (!isset($validTransitions[$action])) {
        http_response_code(422);
        echo json_encode(['error'=>'Acción no válida: '.$action]);
        exit;
    }

    $t = $validTransitions[$action];
    $extra = '';
    $extraParams = [];

    if ($action === 'iniciar') {
        $extra = ', fecha_inicio_real = CURDATE()';
    } elseif ($action === 'terminar') {
        $extra = ', fecha_terminado = NOW()';
    } elseif ($action === 'rechazar') {
        $extra = ', rechazos = rechazos + 1';
        $notas = trim($data['notas_calidad'] ?? '');
        if ($notas) { $extra .= ', notas_calidad = ?'; $extraParams[] = $notas; }
    } elseif ($action === 'enviar') {
        $extra = ', fecha_terminado = NOW()'; // O fecha_embarque
    }

    $params = array_merge([$t['to']], $extraParams, [$wo_id, $t['from']]);
    $stmt = $pdo->prepare("
        UPDATE work_orders SET estatus = ? $extra, actualizado_en = NOW()
        WHERE id = ? AND estatus = ?
    ");
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        http_response_code(409);
        echo json_encode(['error'=>'La work order no tiene el estatus esperado ('.$t['from'].')']);
        exit;
    }

    // Si terminó, actualizar estatus del orden_item
    if ($action === 'terminar') {
        $pdo->prepare("
            UPDATE orden_items oi
            INNER JOIN work_orders wo ON wo.orden_item_id = oi.id
            SET oi.estatus_item = 'terminado'
            WHERE wo.id = ?
        ")->execute([$wo_id]);
    }

    // --- INGESTA A INVENTARIO (Embarque a Tienda) ---
    if ($action === 'enviar') {
        // Actualizar item a embarcado
        $pdo->prepare("
            UPDATE orden_items oi
            INNER JOIN work_orders wo ON wo.orden_item_id = oi.id
            SET oi.estatus_item = 'embarcado'
            WHERE wo.id = ?
        ")->execute([$wo_id]);

        // Ingesta a inventario_tienda (MVP: Tienda Centro = 1)
        $stmtInfo = $pdo->prepare("
            SELECT oi.producto_id, oi.cantidad, p.precio_venta_base
            FROM orden_items oi
            INNER JOIN work_orders wo ON wo.orden_item_id = oi.id
            INNER JOIN productos p ON p.id = oi.producto_id
            WHERE wo.id = ?
        ");
        $stmtInfo->execute([$wo_id]);
        $info = $stmtInfo->fetch();

        if ($info) {
            $tienda_id = 1; 
            $producto_id = $info['producto_id'];
            $cantidad = (float)$info['cantidad'];
            $precio = (float)$info['precio_venta_base'];
            
            // Ver si ya existe
            $checkInv = $pdo->prepare("SELECT id FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1");
            $checkInv->execute([$tienda_id, $producto_id]);
            $invRow = $checkInv->fetch();
            
            if ($invRow) {
                $inv_id = $invRow['id'];
                // La cantidad se actualizará vía el trigger de movimientos_inventario_tienda
            } else {
                $insInv = $pdo->prepare("
                    INSERT INTO inventario_tienda 
                    (tienda_id, producto_id, cantidad_disponible, cantidad_reservada, origen_stock, costo_unitario, precio_venta)
                    VALUES (?, ?, 0, 0, 'embarque_taller', 0, ?)
                ");
                $insInv->execute([$tienda_id, $producto_id, $precio]);
                $inv_id = $pdo->lastInsertId();
            }
            
            // Registrar movimiento -> Dispara trigger -> Actualiza stock real
            $insMov = $pdo->prepare("
                INSERT INTO movimientos_inventario_tienda
                (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
                VALUES (?, 'entrada', ?, 'embarque', ?, ?, 'Ingesta de Producción (Work Order)')
            ");
            $insMov->execute([$inv_id, $cantidad, $wo_id, $user['id']]);
        }
    }

    json_ok(['nuevo_estatus' => $t['to']]);
}

json_error('Método no permitido', 405);
