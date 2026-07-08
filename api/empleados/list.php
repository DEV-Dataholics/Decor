<?php
// api/empleados/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'repartidor', 'bodega']);

$pdo = getDB();
$stmt = $pdo->query("
    SELECT id, nombre, rol, especialidades, tarifa_base, activo, fecha_ingreso
    FROM empleados ORDER BY nombre
");
$empleados = $stmt->fetchAll();
foreach ($empleados as &$emp) {
    // MySQL devuelve JSON como string, el frontend espera un Array para usar .map()
    $emp['especialidades'] = json_decode($emp['especialidades'], true) ?: [];
    // Opcionalmente parseamos activo como bool
    $emp['activo'] = (bool) $emp['activo'];
}
json_ok(['items' => $empleados]);
