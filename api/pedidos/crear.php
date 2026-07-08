<?php
// api/pedidos/crear.php
// Crea un pedido mayorista y genera automáticamente sus Work Orders en estado "pendiente".

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'ventas']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('POST requerido', 405);
}

$data = get_body();
$user = current_user();

$cliente_id = (int)($data['cliente_id'] ?? 0);
$tienda_origen_id = (int)($data['tienda_origen_id'] ?? 1);
$tipo_orden = $data['tipo_orden'] ?? 'linea';
$notas = trim($data['notas'] ?? '');
$items = $data['items'] ?? [];

if (!$cliente_id || empty($items)) {
    json_error('Cliente e ítems son requeridos', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Calcular total
    $total = 0;
    foreach ($items as $it) {
        $total += ((float)$it['cantidad'] * (float)$it['precio_unitario']);
    }

    // 1. Insertar Orden
    $stmtO = $pdo->prepare("
        INSERT INTO ordenes (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion, estatus, total, notas, creado_por)
        VALUES (?, ?, ?, CURDATE(), 'pendiente', ?, ?, ?)
    ");
    $stmtO->execute([$cliente_id, $tienda_origen_id, $tipo_orden, $total, $notas, $user['id']]);
    $orden_id = $pdo->lastInsertId();

    foreach ($items as $it) {
        $producto_id = (int)$it['producto_id'];
        $cantidad = (float)$it['cantidad'];
        $precio = (float)$it['precio_unitario'];
        $subtotal = $cantidad * $precio;
        $acabado_id = isset($it['acabado_id']) ? (int)$it['acabado_id'] : null;
        if (empty($acabado_id) && !empty($it['acabado_nombre'])) {
            $stmtAc = $pdo->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
            $stmtAc->execute([trim($it['acabado_nombre'])]);
            $ac_id = $stmtAc->fetchColumn();
            if ($ac_id) {
                $acabado_id = (int)$ac_id;
            }
        }
        // 2. Insertar Orden Item
        $stmtOi = $pdo->prepare("
            INSERT INTO orden_items (orden_id, producto_id, acabado_id, cantidad, precio_unitario, subtotal, estatus_item)
            VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
        ");
        $stmtOi->execute([$orden_id, $producto_id, $acabado_id, $cantidad, $precio, $subtotal]);
        $orden_item_id = $pdo->lastInsertId();

        // 3. Crear Work Order en pendiente
        $stmtWo = $pdo->prepare("
            INSERT INTO work_orders (orden_item_id, estatus, cantidad_asignada)
            VALUES (?, 'pendiente', ?)
        ");
        $stmtWo->execute([$orden_item_id, $cantidad]);
    }

    $pdo->commit();
    json_ok(['orden_id' => $orden_id]);
} catch (PDOException $e) {
    $pdo->rollBack();
    json_error('Error al crear pedido: ' . $e->getMessage(), 500);
}
