<?php
// api/empleados/crear.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$nombre = trim($data['nombre'] ?? '');
$rol = trim($data['rol'] ?? 'carpintero');
$especialidades = $data['especialidades'] ?? [];
$tarifa_base = (float)($data['tarifa_base'] ?? 0);
$sueldo_base = (float)($data['sueldo_base'] ?? 0);
$bono_semanal = (float)($data['bono_semanal'] ?? 0);
$activo = isset($data['activo']) ? (int)$data['activo'] : 1;

if (empty($nombre)) {
    json_error('El nombre es requerido', 422);
}

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("
        INSERT INTO empleados (nombre, rol, especialidades, tarifa_base, sueldo_base, bono_semanal, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $nombre,
        $rol,
        json_encode($especialidades),
        $tarifa_base,
        $sueldo_base,
        $bono_semanal,
        $activo
    ]);
    
    $new_id = $pdo->lastInsertId();
    json_ok([
        'id' => $new_id,
        'nombre' => $nombre,
        'rol' => $rol,
        'especialidades' => $especialidades,
        'tarifa_base' => $tarifa_base,
        'sueldo_base' => $sueldo_base,
        'bono_semanal' => $bono_semanal,
        'activo' => (bool)$activo
    ]);
} catch (Exception $e) {
    json_error('Error al registrar empleado: ' . $e->getMessage(), 500);
}
