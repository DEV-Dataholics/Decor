<?php
// api/tiendas/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'cajero', 'bodega']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT * FROM tiendas WHERE activa = 1");
    json_ok(['items' => $stmt->fetchAll()]);
} catch (PDOException $e) {
    errorResponse('Error al obtener tiendas: ' . $e->getMessage(), 500);
}
