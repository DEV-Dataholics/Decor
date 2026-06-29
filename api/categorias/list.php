<?php
// api/categorias/list.php
// GET /api/categorias/list.php
// Devuelve todas las categorías activas.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'cajero', 'carpintero', 'bodega']);

$db = getDB();
$stmt = $db->query("SELECT id, nombre, descripcion FROM categorias_mueble ORDER BY nombre ASC");
json_ok($stmt->fetchAll());
