<?php
// api/acabados/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'cajero', 'carpintero', 'bodega']);

$pdo = getDB();
$stmt = $pdo->query("SELECT id, nombre, tipo, codigo_color, descripcion FROM acabados ORDER BY nombre");
json_ok(['items' => $stmt->fetchAll()]);
