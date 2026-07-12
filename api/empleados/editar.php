<?php
// api/empleados/editar.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$id = (int)($data['id'] ?? 0);
$nombre = trim($data['nombre'] ?? '');
$rol = trim($data['rol'] ?? '');
$especialidades = $data['especialidades'] ?? null;
$tarifa_base = isset($data['tarifa_base']) ? (float)$data['tarifa_base'] : null;
$sueldo_base = isset($data['sueldo_base']) ? (float)$data['sueldo_base'] : null;
$bono_semanal = isset($data['bono_semanal']) ? (float)$data['bono_semanal'] : null;
$activo = isset($data['activo']) ? (int)$data['activo'] : null;

if (!$id) {
    json_error('ID requerido', 422);
}

try {
    $pdo = getDB();
    
    // Construir consulta dinámica
    $fields = [];
    $params = [];
    
    if ($nombre !== '') { $fields[] = "nombre = ?"; $params[] = $nombre; }
    if ($rol !== '') { $fields[] = "rol = ?"; $params[] = $rol; }
    if ($especialidades !== null) { $fields[] = "especialidades = ?"; $params[] = json_encode($especialidades); }
    if ($tarifa_base !== null) { $fields[] = "tarifa_base = ?"; $params[] = $tarifa_base; }
    if ($sueldo_base !== null) { $fields[] = "sueldo_base = ?"; $params[] = $sueldo_base; }
    if ($bono_semanal !== null) { $fields[] = "bono_semanal = ?"; $params[] = $bono_semanal; }
    if ($activo !== null) { $fields[] = "activo = ?"; $params[] = $activo; }
    
    if (empty($fields)) {
        json_error('No hay campos para actualizar', 422);
    }
    
    $params[] = $id;
    $sql = "UPDATE empleados SET " . implode(", ", $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    json_ok(['mensaje' => 'Empleado actualizado correctamente']);
} catch (Exception $e) {
    json_error('Error al editar empleado: ' . $e->getMessage(), 500);
}
