<?php
// api/empleados/save.php
// POST o PUT: Crea o actualiza un empleado
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

$nombre = trim($input['nombre'] ?? '');
$rol    = trim($input['rol'] ?? 'carpintero');
// Validar rol según enum ('carpintero','pintor','tapicero','tallador','embalaje','encargado')
$rolesPermitidos = ['carpintero','pintor','tapicero','tallador','embalaje','encargado'];
if (!in_array($rol, $rolesPermitidos)) {
    $rol = 'carpintero';
}

$especialidades = isset($input['especialidades']) && is_array($input['especialidades']) 
    ? json_encode($input['especialidades'], JSON_UNESCAPED_UNICODE) 
    : '[]';

$tarifa_base = isset($input['tarifa_base']) ? (float)$input['tarifa_base'] : 0.00;
$activo = isset($input['activo']) ? (int)(bool)$input['activo'] : 1;

if (empty($nombre)) {
    errorResponse('El nombre del empleado es obligatorio', 400);
}

try {
    $pdo = getDB();

    if ($id) {
        // Actualizar
        $stmt = $pdo->prepare("
            UPDATE empleados 
            SET nombre = :nombre, rol = :rol, especialidades = :especialidades,
                tarifa_base = :tarifa_base, activo = :activo
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'             => $id,
            ':nombre'         => $nombre,
            ':rol'            => $rol,
            ':especialidades' => $especialidades,
            ':tarifa_base'    => $tarifa_base,
            ':activo'         => $activo
        ]);
        json_ok(['id' => $id, 'mensaje' => 'Empleado actualizado con éxito']);
    } else {
        // Crear
        $stmt = $pdo->prepare("
            INSERT INTO empleados (nombre, rol, especialidades, tarifa_base, activo)
            VALUES (:nombre, :rol, :especialidades, :tarifa_base, :activo)
        ");
        $stmt->execute([
            ':nombre'         => $nombre,
            ':rol'            => $rol,
            ':especialidades' => $especialidades,
            ':tarifa_base'    => $tarifa_base,
            ':activo'         => $activo
        ]);
        $newId = (int)$pdo->lastInsertId();
        json_ok(['id' => $newId, 'mensaje' => 'Empleado registrado con éxito']);
    }
} catch (PDOException $e) {
    errorResponse('Error al guardar empleado: ' . $e->getMessage(), 500);
}
