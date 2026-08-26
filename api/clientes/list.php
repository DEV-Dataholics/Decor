<?php
// api/clientes/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'cajero', 'encargado_taller', 'repartidor', 'bodega']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT id, nombre, razon_social, tipo, email, telefono, ciudad,
               credito_activo, limite_credito, 0 AS saldo_pendiente
        FROM clientes 
        WHERE activo = 1
        ORDER BY nombre
    ");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($items as &$c) {
        $c['id'] = (int)$c['id'];
        $c['credito_activo'] = (bool)$c['credito_activo'];
        $c['limite_credito'] = (float)$c['limite_credito'];
        $c['saldo_pendiente'] = (float)$c['saldo_pendiente'];
    }
    unset($c);

    json_ok(['items' => $items]);
} catch (Exception $e) {
    json_error('Error en listado de clientes: ' . $e->getMessage(), 500);
}
