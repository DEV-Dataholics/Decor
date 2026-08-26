<?php
// api/acabados/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'cajero', 'carpintero', 'bodega']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT id, nombre, tipo, codigo_color, descripcion FROM acabados WHERE activo = 1 ORDER BY nombre");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$a) {
        $a['id'] = (int)$a['id'];
    }
    unset($a);
    json_ok(['items' => $items]);
} catch (PDOException $e) {
    errorResponse('Error al consultar acabados: ' . $e->getMessage(), 500);
}
