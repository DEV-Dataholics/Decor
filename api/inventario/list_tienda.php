<?php
// api/inventario/list_tienda.php
// GET /api/inventario/list_tienda.php?tienda_id=1&buscar=&categoria_id=
// Lista TODO el inventario de la tienda (incluyendo stock 0) para administración.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'cajero']);

$pdo       = getDB();
$tienda_id = (int)($_GET['tienda_id'] ?? 1);
$buscar    = trim($_GET['buscar'] ?? '');
$cat_id    = isset($_GET['categoria_id']) && is_numeric($_GET['categoria_id'])
             ? (int)$_GET['categoria_id'] : null;

$where  = ['p.activo = 1'];
$params = [':tid' => $tienda_id];

if ($buscar) {
    $where[]           = '(p.nombre LIKE :buscar OR p.codigo_sku LIKE :buscar2)';
    $params[':buscar']  = "%$buscar%";
    $params[':buscar2'] = "%$buscar%";
}
if ($cat_id) {
    $where[]      = 'p.categoria_id = :cat';
    $params[':cat'] = $cat_id;
}

$sql_where = implode(' AND ', $where);

try {
    if (isset($_GET['all'])) {
        $stmt = $pdo->prepare("
            SELECT
                it.id                   AS inventario_tienda_id,
                it.tienda_id            AS tienda_id,
                COALESCE(it.cantidad_disponible, 0) AS cantidad_disponible,
                COALESCE(it.cantidad_reservada, 0) AS cantidad_reservada,
                COALESCE(it.origen_stock, 'embarque_taller') AS origen_stock,
                COALESCE(it.costo_unitario, p.precio_costo_base) AS costo_unitario,
                COALESCE(it.precio_venta, p.precio_venta_base) AS precio_venta,
                it.lote_referencia_id,
                it.ultima_actualizacion,
                p.id                    AS producto_id,
                p.codigo_sku            AS sku,
                p.nombre                AS producto_nombre,
                p.es_pieza_unica,
                p.foto_url,
                cm.nombre               AS categoria_nombre,
                t.nombre                AS tienda_nombre
            FROM inventario_tienda it
            INNER JOIN productos p ON p.id = it.producto_id
            LEFT JOIN categorias_mueble cm ON cm.id = p.categoria_id
            LEFT JOIN tiendas t ON t.id = it.tienda_id
            WHERE p.activo = 1
            ORDER BY t.nombre, cm.nombre, p.nombre
        ");
        $stmt->execute();
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['es_pieza_unica']       = (bool)$item['es_pieza_unica'];
            $item['cantidad_disponible']  = (float)$item['cantidad_disponible'];
            $item['cantidad_reservada']   = (float)$item['cantidad_reservada'];
            $item['costo_unitario']       = (float)$item['costo_unitario'];
            $item['precio_venta']         = (float)$item['precio_venta'];
            if ($item['foto_url']) {
                $item['foto_url'] = json_decode($item['foto_url'], true);
            }
        }
        unset($item);

        json_ok([
            'items'  => $items,
            'total'  => count($items),
            'kpis'   => [
                'total_skus'       => count($items),
                'total_piezas'     => array_sum(array_column($items, 'cantidad_disponible')),
                'valor_inventario' => 0,
                'sin_stock'        => 0,
            ],
        ]);
    }


    $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM productos p
        LEFT JOIN inventario_tienda it ON p.id = it.producto_id AND it.tienda_id = :tid
        WHERE $sql_where");
    $count_stmt->execute($params);
    $total = (int)$count_stmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            it.id                   AS inventario_tienda_id,
            COALESCE(it.tienda_id, :tid) AS tienda_id,
            COALESCE(it.cantidad_disponible, 0) AS cantidad_disponible,
            COALESCE(it.cantidad_reservada, 0) AS cantidad_reservada,
            COALESCE(it.origen_stock, 'embarque_taller') AS origen_stock,
            COALESCE(it.costo_unitario, p.precio_costo_base) AS costo_unitario,
            COALESCE(it.precio_venta, p.precio_venta_base) AS precio_venta,
            it.lote_referencia_id,
            it.ultima_actualizacion,
            p.id                    AS producto_id,
            p.codigo_sku            AS sku,
            p.nombre                AS producto_nombre,
            p.es_pieza_unica,
            p.foto_url,
            cm.nombre               AS categoria_nombre,
            t.nombre                AS tienda_nombre
        FROM productos p
        LEFT JOIN inventario_tienda it ON p.id = it.producto_id AND it.tienda_id = :tid
        LEFT JOIN categorias_mueble cm ON cm.id = p.categoria_id
        LEFT JOIN tiendas t          ON t.id  = :tid
        WHERE $sql_where
        ORDER BY cm.nombre, p.nombre
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
        $item['es_pieza_unica']       = (bool)$item['es_pieza_unica'];
        $item['cantidad_disponible']  = (float)$item['cantidad_disponible'];
        $item['cantidad_reservada']   = (float)$item['cantidad_reservada'];
        $item['costo_unitario']       = (float)$item['costo_unitario'];
        $item['precio_venta']         = (float)$item['precio_venta'];
        // Decodificar fotos si existen
        if ($item['foto_url']) {
            $item['foto_url'] = json_decode($item['foto_url'], true);
        }
    }
    unset($item);

    // KPIs de inventario para la tienda
    $kpi_stmt = $pdo->prepare("
        SELECT
            COUNT(p.id)                                      AS total_skus,
            SUM(COALESCE(it.cantidad_disponible, 0))         AS total_piezas,
            SUM(COALESCE(it.cantidad_disponible, 0) * COALESCE(it.precio_venta, p.precio_venta_base)) AS valor_inventario,
            SUM(CASE WHEN COALESCE(it.cantidad_disponible, 0) = 0 THEN 1 ELSE 0 END) AS sin_stock
        FROM productos p
        LEFT JOIN inventario_tienda it ON p.id = it.producto_id AND it.tienda_id = :tid
        WHERE p.activo = 1
    ");
    $kpi_stmt->execute([':tid' => $tienda_id]);
    $kpis = $kpi_stmt->fetch();

    json_ok([
        'items'  => $items,
        'total'  => $total,
        'kpis'   => [
            'total_skus'       => (int)($kpis['total_skus'] ?? 0),
            'total_piezas'     => (float)($kpis['total_piezas'] ?? 0),
            'valor_inventario' => (float)($kpis['valor_inventario'] ?? 0),
            'sin_stock'        => (int)($kpis['sin_stock'] ?? 0),
        ],
    ]);

} catch (PDOException $e) {
    json_error('Error al cargar inventario de tienda: ' . $e->getMessage(), 500);
}
