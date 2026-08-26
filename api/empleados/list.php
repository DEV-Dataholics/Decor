<?php
// api/empleados/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'repartidor', 'bodega']);

$todas = isset($_GET['todas']) && $_GET['todas'] === '1';

try {
    $pdo = getDB();
    $sql = $todas ? "SELECT id, nombre, rol, especialidades, tarifa_base, activo, fecha_ingreso FROM empleados ORDER BY nombre" : "SELECT id, nombre, rol, especialidades, tarifa_base, activo, fecha_ingreso FROM empleados WHERE activo = 1 ORDER BY nombre";
    $stmt = $pdo->query($sql);
    $empleados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($empleados as &$emp) {
        $emp['id'] = (int)$emp['id'];
        $emp['tarifa_base'] = (float)$emp['tarifa_base'];
        $emp['especialidades'] = json_decode($emp['especialidades'], true) ?: [];
        $emp['activo'] = (bool)$emp['activo'];
    }
    unset($emp);
    json_ok(['items' => $empleados]);
} catch (PDOException $e) {
    errorResponse('Error al obtener empleados: ' . $e->getMessage(), 500);
}
