<?php
// api/acabados/save.php
// POST o PUT: Crea o actualiza un acabado
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

$nombre = trim($input['nombre'] ?? $input['acabado'] ?? '');
$tipo   = trim($input['tipo'] ?? 'natural');
$tiposPermitidos = ['mancha','laca','cera','pintura','distres','cardeado','natural','fashion'];
if (!in_array($tipo, $tiposPermitidos)) {
    $tipo = 'natural';
}
$codigo_color = trim($input['codigo_color'] ?? '');
$descripcion  = trim($input['descripcion'] ?? '');

if (empty($nombre)) {
    errorResponse('El nombre del acabado es obligatorio', 400);
}

try {
    $pdo = getDB();

    if ($id) {
        $stmt = $pdo->prepare("
            UPDATE acabados 
            SET nombre = :nombre, tipo = :tipo, codigo_color = :codigo_color, descripcion = :descripcion
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'           => $id,
            ':nombre'       => $nombre,
            ':tipo'         => $tipo,
            ':codigo_color' => $codigo_color,
            ':descripcion'  => $descripcion
        ]);
        json_ok(['id' => $id, 'mensaje' => 'Acabado actualizado con éxito']);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO acabados (nombre, tipo, codigo_color, descripcion, activo)
            VALUES (:nombre, :tipo, :codigo_color, :descripcion, 1)
            ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), descripcion = VALUES(descripcion)
        ");
        $stmt->execute([
            ':nombre'       => $nombre,
            ':tipo'         => $tipo,
            ':codigo_color' => $codigo_color,
            ':descripcion'  => $descripcion
        ]);
        $newId = (int)$pdo->lastInsertId();
        json_ok(['id' => $newId, 'nombre' => $nombre, 'mensaje' => 'Acabado registrado con éxito']);
    }
} catch (PDOException $e) {
    errorResponse('Error al guardar acabado: ' . $e->getMessage(), 500);
}
