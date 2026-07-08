<?php
// api/clientes/list.php

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
// Permitimos a varios roles consultar el listado de clientes
require_role(['admin', 'gerente_tienda', 'ventas', 'cajero', 'encargado_taller']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT id, nombre, razon_social, tipo, email, telefono, ciudad,
               credito_activo, limite_credito, 0 AS saldo_pendiente
        FROM clientes ORDER BY nombre
    ");

    json_ok(['items' => $stmt->fetchAll()]);
} catch (Exception $e) {
    json_error('Error en listado de clientes: ' . $e->getMessage(), 500);
}
