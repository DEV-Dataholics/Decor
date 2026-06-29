<?php
// api/inventario/scan.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
session_start();

$codigo = trim($_GET['codigo'] ?? '');
$tienda_id = (int)($_GET['tienda_id'] ?? 1); // Por defecto tienda principal

if (!$codigo) {
    http_response_code(400);
    echo json_encode(['error' => 'Código no proporcionado']);
    exit;
}

try {
    $pdo = getDB();
    
    // 1. Primero, intentar buscar como SKU de un Producto (Tienda POS)
    $stmtProd = $pdo->prepare("
        SELECT
            p.id,
            p.codigo_sku      AS codigo,
            p.nombre,
            p.es_pieza_unica,
            cm.nombre         AS categoria,
            it.id             AS inventario_tienda_id,
            it.precio_venta,
            IFNULL(it.cantidad_disponible, 0) AS stock_disponible
        FROM productos p
        LEFT JOIN inventario_tienda it  ON it.producto_id = p.id AND it.tienda_id = ?
        LEFT JOIN categorias_mueble cm  ON cm.id = p.categoria_id
        WHERE p.codigo_sku = ? AND p.activo = 1
        LIMIT 1
    ");
    $stmtProd->execute([$tienda_id, $codigo]);
    $producto = $stmtProd->fetch();

    if ($producto) {
        $producto['es_pieza_unica']   = (bool)$producto['es_pieza_unica'];
        $producto['stock_disponible'] = (float)$producto['stock_disponible'];
        $producto['precio_venta']     = (float)($producto['precio_venta'] ?? 0);

        echo json_encode(['ok' => true, 'tipo_item' => 'producto', 'data' => $producto]);
        exit;
    }

    // 2. Si no es producto, buscar como Código de Referencia de un Material (Taller)
    $stmtMat = $pdo->prepare("
        SELECT
            id,
            codigo_referencia AS codigo,
            nombre,
            tipo,
            subtipo,
            stock_actual      AS stock_disponible,
            stock_minimo,
            stock_maximo,
            unidad_medida,
            costo_unitario    AS precio
        FROM materiales
        WHERE codigo_referencia = ? AND activo = 1
    ");
    $stmtMat->execute([$codigo]);
    $material = $stmtMat->fetch();

    if ($material) {
        $material['stock_disponible'] = (float)$material['stock_disponible'];
        $material['stock_minimo']     = (float)$material['stock_minimo'];
        $material['stock_maximo']     = (float)$material['stock_maximo'];
        $material['precio']           = (float)$material['precio'];

        echo json_encode(['ok' => true, 'tipo_item' => 'material', 'data' => $material]);
        exit;
    }

    // 3. No encontrado en ninguna tabla
    http_response_code(404);
    echo json_encode(['error' => 'El código no está registrado en el catálogo ni en inventario']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error buscando el código']);
}
