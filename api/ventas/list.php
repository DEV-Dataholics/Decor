<?php
// api/ventas/list.php
// Consulta listado de ventas confirmadas con sus ítems, pagos y cliente
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
set_json_headers();

$user = $_SESSION['user'] ?? null;
if (!$user) { 
    http_response_code(401); 
    echo json_encode(['ok' => false, 'error' => 'Sesión requerida'], JSON_UNESCAPED_UNICODE); 
    exit; 
}

try {
    $pdo = getDB();

    $tienda_id    = isset($_GET['tienda_id']) && $_GET['tienda_id'] !== '' && $_GET['tienda_id'] !== 'todas' ? (int)$_GET['tienda_id'] : null;
    $fecha_inicio = $_GET['fecha_inicio'] ?? null;
    $fecha_fin    = $_GET['fecha_fin'] ?? null;
    $limit        = isset($_GET['limit']) ? (int)$_GET['limit'] : 150;

    $where = ["vt.estatus != 'cancelada'"];
    $params = [];

    if ($tienda_id) {
        $where[] = "vt.tienda_id = ?";
        $params[] = $tienda_id;
    }
    if ($fecha_inicio) {
        $where[] = "DATE(vt.fecha_venta) >= ?";
        $params[] = $fecha_inicio;
    }
    if ($fecha_fin) {
        $where[] = "DATE(vt.fecha_venta) <= ?";
        $params[] = $fecha_fin;
    }

    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT 
            vt.id AS venta_id,
            vt.tienda_id,
            t.nombre AS tienda_nombre,
            vt.caja_id,
            vt.cliente_id,
            COALESCE(c.nombre, vt.cliente_nombre_libre, 'Público General') AS cliente_nombre,
            c.email AS cliente_email,
            vt.fecha_venta,
            vt.estatus,
            vt.subtotal,
            vt.descuento_total,
            vt.impuestos,
            vt.total,
            u.nombre AS cajero_nombre
        FROM ventas_tienda vt
        INNER JOIN tiendas t ON t.id = vt.tienda_id
        LEFT JOIN clientes c ON c.id = vt.cliente_id
        INNER JOIN usuarios u ON u.id = vt.usuario_cajero_id
        WHERE {$whereSql}
        ORDER BY vt.fecha_venta DESC
        LIMIT {$limit}
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $ventas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!empty($ventas)) {
        $ventaIds = array_column($ventas, 'venta_id');
        $inPlaceholders = implode(',', array_fill(0, count($ventaIds), '?'));

        // Obtener items
        $stmtItems = $pdo->prepare("
            SELECT 
                vi.id,
                vi.venta_id,
                vi.inventario_tienda_id,
                vi.producto_id,
                p.nombre AS producto_nombre,
                p.codigo_sku,
                vi.cantidad,
                vi.precio_unitario,
                vi.descuento_item,
                vi.subtotal
            FROM venta_items vi
            INNER JOIN productos p ON p.id = vi.producto_id
            WHERE vi.venta_id IN ($inPlaceholders)
        ");
        $stmtItems->execute($ventaIds);
        $allItems = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        // Obtener pagos
        $stmtPagos = $pdo->prepare("
            SELECT 
                id,
                venta_id,
                metodo,
                monto,
                referencia,
                fecha
            FROM pagos_venta
            WHERE venta_id IN ($inPlaceholders)
        ");
        $stmtPagos->execute($ventaIds);
        $allPagos = $stmtPagos->fetchAll(PDO::FETCH_ASSOC);

        // Agrupar items y pagos por venta_id
        $itemsByVenta = [];
        foreach ($allItems as $item) {
            $itemsByVenta[$item['venta_id']][] = $item;
        }

        $pagosByVenta = [];
        foreach ($allPagos as $pago) {
            $pagosByVenta[$pago['venta_id']][] = $pago;
        }

        foreach ($ventas as &$v) {
            $vid = $v['venta_id'];
            $v['items'] = $itemsByVenta[$vid] ?? [];
            $v['pagos'] = $pagosByVenta[$vid] ?? [];
            $v['total'] = (float)$v['total'];
            $v['subtotal'] = (float)$v['subtotal'];
            $v['descuento_total'] = (float)$v['descuento_total'];
        }
        unset($v);
    }

    $totalMonto = array_sum(array_column($ventas, 'total'));

    echo json_encode([
        'ok' => true,
        'data' => [
            'items'        => $ventas,
            'total_monto'  => $totalMonto,
            'total_ventas' => count($ventas)
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Error al consultar ventas: ' . $e->getMessage()]);
}
