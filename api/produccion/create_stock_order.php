<?php
// api/produccion/create_stock_order.php
// Crea una orden de stock y la asigna directamente al taller como una Work Order.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$producto_id = (int)($data['producto_id'] ?? 0);
$empleado_id = (int)($data['empleado_id'] ?? 0);
$cantidad    = (int)($data['cantidad'] ?? 1);
$notas       = trim($data['notas'] ?? '');
$user        = current_user();

if (!$producto_id || !$empleado_id || $cantidad <= 0) {
    json_error('Datos incompletos', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // 1. Obtener datos del producto
    $stmtProd = $pdo->prepare("SELECT precio_costo_base, precio_venta_base FROM productos WHERE id = ?");
    $stmtProd->execute([$producto_id]);
    $prod = $stmtProd->fetch();
    if (!$prod) {
        throw new Exception("Producto no encontrado");
    }

    // 2. Crear Orden (Tipo Stock)
    // Asignamos cliente_id a null (requiere que la DB permita null en cliente_id para ordenes de stock)
    // Nota: en db/02_ordenes.sql cliente_id no permite NULL. 
    // Vamos a buscar un cliente "Tienda / Stock" o usar un ID dummy, o mejor, actualizar schema.
    // Asumiremos que cliente_id = 1 es cliente general/mostrador por defecto.
    
    // Buscar cliente "Mostrador" o usar 1
    $stmtCl = $pdo->query("SELECT id FROM clientes WHERE nombre LIKE '%Mostrador%' OR id = 1 LIMIT 1");
    $cliente = $stmtCl->fetch();
    $cliente_id = $cliente ? $cliente['id'] : 1;

    $stmtO = $pdo->prepare("
        INSERT INTO ordenes (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion, estatus, creado_por, notas)
        VALUES (?, 1, 'stock', CURDATE(), 'en_produccion', ?, ?)
    ");
    $stmtO->execute([$cliente_id, $user['id'], $notas]);
    $orden_id = $pdo->lastInsertId();

    // 3. Crear Orden Item
    $stmtOi = $pdo->prepare("
        INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario, subtotal, estatus_item)
        VALUES (?, ?, ?, ?, ?, 'en_produccion')
    ");
    $subtotal = $prod['precio_venta_base'] * $cantidad;
    $stmtOi->execute([$orden_id, $producto_id, $cantidad, $prod['precio_venta_base'], $subtotal]);
    $orden_item_id = $pdo->lastInsertId();

    // 4. Buscar o crear Semana de Nómina abierta
    $stmtSemana = $pdo->query("SELECT id FROM semanas_nomina WHERE estatus = 'abierta' ORDER BY id DESC LIMIT 1");
    $semana = $stmtSemana->fetch();
    if ($semana) {
        $semana_id = $semana['id'];
    } else {
        // Crear una nueva semana
        $stmtNuevaSemana = $pdo->prepare("
            INSERT INTO semanas_nomina (fecha_inicio, fecha_corte, estatus)
            VALUES (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'abierta')
        ");
        $stmtNuevaSemana->execute();
        $semana_id = $pdo->lastInsertId();
    }

    // 5. Obtener el ID del empleado como encargado (para asignado_por)
    // Solo necesitamos el ID del usuario actual, pero work_orders.asignado_por es FK a empleados.
    // Así que usamos el empleado_id de la sesión, o si es admin, el mismo empleado 1 por defecto.
    $asignado_por = $user['empleado_id'] ?? 1;

    // 6. Crear Work Order(s)
    // ¿Una WO por cantidad, o una WO para toda la cantidad? 
    // work_orders apunta a un orden_item, que tiene cantidad.
    // Así que una WO por item.
    $stmtWo = $pdo->prepare("
        INSERT INTO work_orders (orden_item_id, empleado_id, asignado_por, semana_nomina_id, fecha_asignacion, estatus, creado_por)
        VALUES (?, ?, ?, ?, CURDATE(), 'pendiente', ?)
    ");
    $stmtWo->execute([$orden_item_id, $empleado_id, $asignado_por, $semana_id, $user['id']]);

    $pdo->commit();
    json_ok(['message' => 'Orden de producción creada correctamente', 'orden_id' => $orden_id]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error creando orden de stock: ' . $e->getMessage(), 500);
}
