<?php
// api/inventario/catalogo.php
// Devuelve todos los productos con stock disponible de una tienda,
// listos para mostrarse en el catalogo del POS.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../config/db.php';
session_start();

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesión requerida']);
    exit;
}

$tienda_id = (int)($_GET['tienda_id'] ?? 1);

try {
    $pdo = getDB();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.codigo_sku,
            p.nombre,
            p.es_pieza_unica,
            cm.nombre  AS categoria,
            it.id      AS inventario_tienda_id,
            it.precio_venta,
            it.origen_stock,
            IFNULL(it.cantidad_disponible, 0) AS stock_disponible
        FROM inventario_tienda it
        INNER JOIN productos p  ON p.id  = it.producto_id
        LEFT  JOIN categorias_mueble cm ON cm.id = p.categoria_id
        WHERE it.tienda_id = ?
          AND p.activo = 1
          AND it.cantidad_disponible > 0
        ORDER BY cm.nombre, p.nombre
    ");
    $stmt->execute([$tienda_id]);
    $items = $stmt->fetchAll();

    // Formatear tipos
    foreach ($items as &$item) {
        $item['es_pieza_unica']   = (bool)$item['es_pieza_unica'];
        $item['stock_disponible'] = (float)$item['stock_disponible'];
        $item['precio_venta']     = (float)$item['precio_venta'];
    }

    echo json_encode(['ok' => true, 'items' => $items]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error cargando catálogo']);
}
