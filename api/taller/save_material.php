<?php
// api/taller/save_material.php
// POST o PUT: Crea o actualiza una materia prima o insumo de taller
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller']);

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : null;

$nombre           = trim($input['nombre'] ?? '');
$tipo             = trim($input['tipo'] ?? 'insumo');
$tiposPermitidos  = ['madera', 'quimico', 'insumo', 'herramienta'];
if (!in_array($tipo, $tiposPermitidos)) {
    $tipo = 'insumo';
}

$subtipo          = trim($input['subtipo'] ?? '');
$unidad_medida    = trim($input['unidad_medida'] ?? $input['unidad'] ?? 'pza');
$proveedor_id     = isset($input['proveedor_id']) && is_numeric($input['proveedor_id']) ? (int)$input['proveedor_id'] : 1;
$stock_actual     = isset($input['stock_actual']) ? (float)$input['stock_actual'] : (isset($input['cantidad']) ? (float)$input['cantidad'] : 0.00);
$stock_minimo     = isset($input['stock_minimo']) ? (float)$input['stock_minimo'] : (isset($input['minimo']) ? (float)$input['minimo'] : 10.00);
$stock_maximo     = isset($input['stock_maximo']) ? (float)$input['stock_maximo'] : (isset($input['maximo']) ? (float)$input['maximo'] : 100.00);
$costo_unitario   = isset($input['costo_unitario']) ? (float)$input['costo_unitario'] : 0.00;
$codigo_referencia= trim($input['codigo_referencia'] ?? '');
$notas            = trim($input['notas'] ?? '');
$userId           = $_SESSION['user_id'] ?? 1;

if (empty($nombre)) {
    errorResponse('El nombre de la materia prima es obligatorio', 400);
}

if (empty($codigo_referencia)) {
    // Generar código automático
    $prefix = strtoupper(substr($tipo, 0, 3));
    $codigo_referencia = 'MAT-' . $prefix . '-' . strtoupper(substr(uniqid(), -4));
}

try {
    $pdo = getDB();

    if ($proveedor_id <= 0) {
        $provRow = $pdo->query("SELECT id FROM proveedores LIMIT 1")->fetchColumn();
        $proveedor_id = $provRow ? (int)$provRow : 1;
    }

    if ($id) {
        // Actualizar
        $stmt = $pdo->prepare("
            UPDATE materiales 
            SET nombre = :nombre, tipo = :tipo, subtipo = :subtipo,
                unidad_medida = :unidad, proveedor_id = :prov_id,
                stock_actual = :stock, stock_minimo = :min, stock_maximo = :max,
                costo_unitario = :costo, codigo_referencia = :cod, notas = :notas
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'       => $id,
            ':nombre'   => $nombre,
            ':tipo'     => $tipo,
            ':subtipo'  => $subtipo,
            ':unidad'   => $unidad_medida,
            ':prov_id'  => $proveedor_id,
            ':stock'    => $stock_actual,
            ':min'      => $stock_minimo,
            ':max'      => $stock_maximo,
            ':costo'    => $costo_unitario,
            ':cod'      => $codigo_referencia,
            ':notas'    => $notas
        ]);
        json_ok(['id' => $id, 'mensaje' => 'Materia prima actualizada con éxito']);
    } else {
        // Crear
        $stmt = $pdo->prepare("
            INSERT INTO materiales 
                (nombre, tipo, subtipo, unidad_medida, proveedor_id, stock_actual, stock_minimo, stock_maximo, costo_unitario, codigo_referencia, notas, activo, creado_por)
            VALUES 
                (:nombre, :tipo, :subtipo, :unidad, :prov_id, :stock, :min, :max, :costo, :cod, :notas, 1, :user_id)
        ");
        $stmt->execute([
            ':nombre'   => $nombre,
            ':tipo'     => $tipo,
            ':subtipo'  => $subtipo,
            ':unidad'   => $unidad_medida,
            ':prov_id'  => $proveedor_id,
            ':stock'    => $stock_actual,
            ':min'      => $stock_minimo,
            ':max'      => $stock_maximo,
            ':costo'    => $costo_unitario,
            ':cod'      => $codigo_referencia,
            ':notas'    => $notas,
            ':user_id'  => $userId
        ]);
        $newId = (int)$pdo->lastInsertId();
        json_ok(['id' => $newId, 'mensaje' => 'Materia prima registrada con éxito en catálogo de taller']);
    }
} catch (PDOException $e) {
    errorResponse('Error al guardar materia prima: ' . $e->getMessage(), 500);
}
