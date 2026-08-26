<?php
// api/productos/list.php
// GET /api/productos/list.php?categoria_id=&buscar=&pagina=1&cliente_id=X
// Lista productos activos con sus acabados disponibles. Si se envía cliente_id, trae precios de mayorista.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'cajero', 'carpintero', 'bodega']);

$db  = getDB();
$todos       = isset($_GET['todos']) && ($_GET['todos'] === '1' || $_GET['todos'] === 'true');
$per_page    = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : ($todos ? 2000 : (isset($_GET['pagina']) ? 24 : 2000));
$pagina      = max(1, (int)($_GET['pagina'] ?? 1));
$offset      = ($pagina - 1) * $per_page;
$categoria   = isset($_GET['categoria_id']) && is_numeric($_GET['categoria_id'])
               ? (int)$_GET['categoria_id'] : null;
$cliente_id  = isset($_GET['cliente_id']) && is_numeric($_GET['cliente_id'])
               ? (int)$_GET['cliente_id'] : null;
$buscar      = trim($_GET['buscar'] ?? '');

$where  = ["p.activo = 1"];
$params = [];

if ($categoria) {
    $where[]  = "p.categoria_id = :cat";
    $params[':cat'] = $categoria;
}
if ($buscar) {
    $where[]  = "(p.nombre LIKE :buscar OR p.codigo_sku LIKE :buscar2)";
    $params[':buscar']  = "%$buscar%";
    $params[':buscar2'] = "%$buscar%";
}
if ($cliente_id) {
    $params[':cliente_id'] = $cliente_id;
}

$sql_where = implode(' AND ', $where);

// Total para paginación
$count_sql = "SELECT COUNT(*) FROM productos p WHERE $sql_where";
$count_stmt = $db->prepare($count_sql);
// Bind parameters carefully because count doesn't need :cliente_id but params might have it
$count_params = $params;
if (isset($count_params[':cliente_id'])) { unset($count_params[':cliente_id']); }
$count_stmt->execute($count_params);
$total = (int)$count_stmt->fetchColumn();

// Construir consulta base
$select_fields = "p.id, p.codigo_sku AS sku, p.nombre, p.descripcion, 
                  p.precio_costo_base AS precio_produccion_base, p.es_pieza_unica, p.foto_url,
                  p.medidas_base, c.nombre AS categoria_nombre";
$join_clause = "LEFT JOIN categorias_mueble c ON c.id = p.categoria_id";

if ($cliente_id) {
    // Si hay cliente, buscamos el precio acordado, si no, tomamos el venta_base
    $select_fields .= ", COALESCE(lpc.precio_acordado, p.precio_venta_base) AS precio_venta_base, IF(lpc.id IS NOT NULL, 1, 0) AS tiene_precio_especial";
    $join_clause .= " LEFT JOIN listas_precios_clientes lpc ON lpc.producto_id = p.id AND lpc.cliente_id = :cliente_id";
} else {
    $select_fields .= ", p.precio_venta_base";
}

$sql = "
    SELECT $select_fields
    FROM   productos p
    $join_clause
    WHERE  $sql_where
    ORDER  BY p.nombre ASC
    LIMIT  $per_page OFFSET $offset
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$productos = $stmt->fetchAll();

// Cargar acabados disponibles para cada producto
foreach ($productos as &$prod) {
    $sql_acab = "
        SELECT a.id, a.nombre, a.tipo, a.codigo_color
        FROM   producto_acabados pa
        JOIN   acabados a ON a.id = pa.acabado_id
        WHERE  pa.producto_id = :pid
        ORDER  BY a.tipo, a.nombre
    ";
    $sa = $db->prepare($sql_acab);
    $sa->execute([':pid' => $prod['id']]);
    $prod['acabados'] = $sa->fetchAll();

    // Decodificar JSONs si existen
    if ($prod['foto_url']) {
        $prod['foto_url'] = json_decode($prod['foto_url'], true);
    }
    if ($prod['medidas_base']) {
        $medidas = json_decode($prod['medidas_base'], true);
        $prod['dimension_alto'] = $medidas['alto'] ?? null;
        $prod['dimension_ancho'] = $medidas['ancho'] ?? null;
        $prod['dimension_largo'] = $medidas['fondo'] ?? null;
    } else {
        $prod['dimension_alto'] = null;
        $prod['dimension_ancho'] = null;
        $prod['dimension_largo'] = null;
    }
}
unset($prod);

json_ok([
    'productos' => $productos,
    'total'     => $total,
    'pagina'    => $pagina,
    'paginas'   => (int)ceil($total / $per_page),
]);
