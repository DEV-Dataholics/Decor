<?php
// api/productos/toggle.php
// POST /api/productos/toggle.php  { id, activo: 0|1 }
// Activa o desactiva un producto (soft-delete). Solo admin/gerente.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

$body = get_body();
if (empty($body['id'])) json_error('Se requiere el id del producto');

$id     = (int)$body['id'];
$activo = isset($body['activo']) ? (int)(bool)$body['activo'] : null;

if ($activo === null) json_error('Se requiere el campo activo (0 o 1)');

$db = getDB();
$stmt = $db->prepare("UPDATE productos SET activo = :activo WHERE id = :id");
$stmt->execute([':activo' => $activo, ':id' => $id]);

if ($stmt->rowCount() === 0) json_error('Producto no encontrado', 404);

json_ok(['id' => $id, 'activo' => $activo]);
