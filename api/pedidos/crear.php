<?php
// api/pedidos/crear.php
// Crea un pedido mayorista / especial y genera automáticamente sus Work Orders en estado "pendiente".

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

$cliente_id       = (int)($data['cliente_id'] ?? 0);
$tienda_origen_id = (int)($data['tienda_origen_id'] ?? 1);
$tipo_orden_raw   = trim($data['tipo_orden'] ?? 'linea');
$notas            = trim($data['notas'] ?? '');
$items            = $data['items'] ?? [];

// Normalizar tipo de orden al ENUM('linea','linea_especial','especial')
$tipo_orden = 'linea';
if ($tipo_orden_raw === 'especial' || $tipo_orden_raw === 'orden_especial') {
    $tipo_orden = 'especial';
} elseif ($tipo_orden_raw === 'linea_especial') {
    $tipo_orden = 'linea_especial';
}

if (empty($items)) {
    json_error('El pedido debe contener al menos un producto o ítem', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // 1. Validar cliente existente
    if ($cliente_id <= 0) {
        $cliRow = $pdo->query("SELECT id FROM clientes WHERE activo = 1 LIMIT 1")->fetchColumn();
        $cliente_id = $cliRow ? (int)$cliRow : 1;
    }

    // 2. Validar tienda origen
    if ($tienda_origen_id <= 0) {
        $tiendaRow = $pdo->query("SELECT id FROM tiendas WHERE activa = 1 LIMIT 1")->fetchColumn();
        $tienda_origen_id = $tiendaRow ? (int)$tiendaRow : 1;
    }

    // 3. Buscar o crear semana de nómina abierta para las Work Orders
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

    // 4. Buscar un empleado artesano/carpintero por defecto para asignación
    $empDefault = (int)$pdo->query("SELECT id FROM empleados WHERE activo = 1 ORDER BY id ASC LIMIT 1")->fetchColumn();
    if (!$empDefault) {
        $empDefault = 1;
    }

    // 5. Calcular total de la orden
    $total = 0;
    foreach ($items as $it) {
        $cant = (float)($it['cantidad'] ?? 1);
        $precio = (float)($it['precio_unitario'] ?? 0);
        $total += ($cant * $precio);
    }

    // 6. Insertar Orden con estatus 'confirmada' (válido en ENUM)
    $stmtO = $pdo->prepare("
        INSERT INTO ordenes 
            (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion, estatus, total, notas, creado_por)
        VALUES 
            (:cliente_id, :tienda_id, :tipo_orden, CURDATE(), 'confirmada', :total, :notas, :creado_por)
    ");
    $stmtO->execute([
        ':cliente_id' => $cliente_id,
        ':tienda_id'  => $tienda_origen_id,
        ':tipo_orden' => $tipo_orden,
        ':total'      => $total,
        ':notas'      => $notas,
        ':creado_por' => $userId
    ]);
    $orden_id = (int)$pdo->lastInsertId();

    // 7. Insertar ítems y generar Work Orders correspondientes
    foreach ($items as $it) {
        $producto_id = (int)($it['producto_id'] ?? 0);
        $cantidad    = (float)($it['cantidad'] ?? 1);
        $precio      = (float)($it['precio_unitario'] ?? 0);
        $subtotal    = $cantidad * $precio;
        $acabado_id  = !empty($it['acabado_id']) ? (int)$it['acabado_id'] : null;

        if (empty($acabado_id) && !empty($it['acabado_nombre'])) {
            $stmtAc = $pdo->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
            $stmtAc->execute([trim($it['acabado_nombre'])]);
            $ac_id = $stmtAc->fetchColumn();
            if ($ac_id) {
                $acabado_id = (int)$ac_id;
            }
        }

        // Si el precio unitario viene en 0, buscarlo del catálogo de productos
        if ($precio <= 0 && $producto_id > 0) {
            $stmtProd = $pdo->prepare("SELECT precio_venta_base, precio_costo_base FROM productos WHERE id = ?");
            $stmtProd->execute([$producto_id]);
            $pData = $stmtProd->fetch();
            if ($pData) {
                $precio = (float)$pData['precio_venta_base'];
                $subtotal = $cantidad * $precio;
            }
        }

        // Insertar Orden Item
        $stmtOi = $pdo->prepare("
            INSERT INTO orden_items 
                (orden_id, producto_id, acabado_id, cantidad, precio_unitario, subtotal, estatus_item)
            VALUES 
                (:orden_id, :producto_id, :acabado_id, :cantidad, :precio_unitario, :subtotal, 'pendiente')
        ");
        $stmtOi->execute([
            ':orden_id'        => $orden_id,
            ':producto_id'     => $producto_id,
            ':acabado_id'      => $acabado_id,
            ':cantidad'        => $cantidad,
            ':precio_unitario' => $precio,
            ':subtotal'        => $subtotal
        ]);
        $orden_item_id = (int)$pdo->lastInsertId();

        // Buscar costo de mano de obra base
        $costo_mano_obra_unitario = 0.00;
        if ($producto_id > 0) {
            $stmtCosto = $pdo->prepare("SELECT precio_costo_base FROM productos WHERE id = ?");
            $stmtCosto->execute([$producto_id]);
            $costo_mano_obra_unitario = (float)($stmtCosto->fetchColumn() ?: 0.00);
        }
        $monto_pago = $cantidad * $costo_mano_obra_unitario;

        // Crear Work Order con estatus 'pendiente' y todas las FK requeridas
        $stmtWo = $pdo->prepare("
            INSERT INTO work_orders 
                (orden_item_id, empleado_id, asignado_por, semana_nomina_id, fecha_asignacion, estatus, cantidad_asignada, costo_mano_obra_unitario, monto_pago, creado_por)
            VALUES 
                (:orden_item_id, :empleado_id, :asignado_por, :semana_id, CURDATE(), 'pendiente', :cantidad, :costo_mo, :monto_pago, :creado_por)
        ");
        $stmtWo->execute([
            ':orden_item_id' => $orden_item_id,
            ':empleado_id'   => $empDefault,
            ':asignado_por'  => $userId,
            ':semana_id'     => $semana_id,
            ':cantidad'      => $cantidad,
            ':costo_mo'      => $costo_mano_obra_unitario,
            ':monto_pago'    => $monto_pago,
            ':creado_por'    => $userId
        ]);
    }

    $pdo->commit();
    json_ok(['orden_id' => $orden_id, 'mensaje' => 'Pedido registrado y órdenes de trabajo creadas con éxito']);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al crear pedido: ' . $e->getMessage(), 500);
}
