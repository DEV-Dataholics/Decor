<?php
// api/acabados/delete.php
// POST: Elimina un acabado por ID o por nombre
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;
$nombre = trim($input['nombre'] ?? $input['acabado'] ?? '');

if (!$id && empty($nombre)) {
    errorResponse('Identificador de acabado no proporcionado', 400);
}

try {
    $pdo = getDB();

    if ($id) {
        $stmt = $pdo->prepare("DELETE FROM acabados WHERE id = :id");
        $stmt->execute([':id' => $id]);
    } else {
        $stmt = $pdo->prepare("DELETE FROM acabados WHERE nombre = :nombre");
        $stmt->execute([':nombre' => $nombre]);
    }

    json_ok(['mensaje' => 'Acabado eliminado con éxito']);
} catch (PDOException $e) {
    errorResponse('Error al eliminar acabado: ' . $e->getMessage(), 500);
}
