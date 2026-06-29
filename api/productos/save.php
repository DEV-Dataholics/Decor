<?php
// api/productos/save.php
// POST /api/productos/save.php  → Crear producto
// PUT  /api/productos/save.php  → Actualizar (requiere id en body)

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

$body   = get_body();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ─── Validaciones comunes ──────────────────────────────────
if (empty($body['nombre'])) json_error('El nombre del producto es requerido');
if (empty($body['categoria_id'])) json_error('La categoría es requerida');

$nombre       = trim($body['nombre']);
$categoria_id = (int)$body['categoria_id'];
$sku          = trim($body['sku'] ?? '');
$descripcion  = trim($body['descripcion'] ?? '');
$precio_venta = (float)($body['precio_venta_base'] ?? 0);
$precio_prod  = (float)($body['precio_produccion_base'] ?? 0);
$es_unica     = (int)!empty($body['es_pieza_unica']);
$alto         = $body['dimension_alto'] ?? null;
$ancho        = $body['dimension_ancho'] ?? null;
$largo        = $body['dimension_largo'] ?? null;
$notas        = trim($body['notas'] ?? '');
$foto_url     = isset($body['foto_url']) && is_array($body['foto_url'])
                ? json_encode($body['foto_url']) : null;
$acabados     = $body['acabados'] ?? []; // Array de acabado_id[]
$user         = current_user();

try {
    $db->beginTransaction();

    // ─── CREAR ────────────────────────────────────────────
    if ($method === 'POST') {
        $stmt = $db->prepare("
            INSERT INTO productos
              (categoria_id, sku, nombre, descripcion, precio_venta_base,
               precio_produccion_base, es_pieza_unica, dimension_alto,
               dimension_ancho, dimension_largo, notas, foto_url, creado_por)
            VALUES
              (:cat, :sku, :nom, :desc, :pv, :pp, :eu, :alto,
               :ancho, :largo, :notas, :foto, :uid)
        ");
        $stmt->execute([
            ':cat'  => $categoria_id, ':sku'  => $sku,
            ':nom'  => $nombre,       ':desc' => $descripcion,
            ':pv'   => $precio_venta, ':pp'   => $precio_prod,
            ':eu'   => $es_unica,     ':alto' => $alto,
            ':ancho'=> $ancho,        ':largo'=> $largo,
            ':notas'=> $notas,        ':foto' => $foto_url,
            ':uid'  => $user['id'],
        ]);
        $producto_id = (int)$db->lastInsertId();

    // ─── ACTUALIZAR ───────────────────────────────────────
    } elseif ($method === 'PUT') {
        if (empty($body['id'])) json_error('Se requiere el id del producto');
        $producto_id = (int)$body['id'];

        $stmt = $db->prepare("
            UPDATE productos SET
              categoria_id = :cat, sku = :sku, nombre = :nom,
              descripcion = :desc, precio_venta_base = :pv,
              precio_produccion_base = :pp, es_pieza_unica = :eu,
              dimension_alto = :alto, dimension_ancho = :ancho,
              dimension_largo = :largo, notas = :notas, foto_url = :foto
            WHERE id = :pid
        ");
        $stmt->execute([
            ':cat'  => $categoria_id, ':sku'  => $sku,
            ':nom'  => $nombre,       ':desc' => $descripcion,
            ':pv'   => $precio_venta, ':pp'   => $precio_prod,
            ':eu'   => $es_unica,     ':alto' => $alto,
            ':ancho'=> $ancho,        ':largo'=> $largo,
            ':notas'=> $notas,        ':foto' => $foto_url,
            ':pid'  => $producto_id,
        ]);

        // Limpiar acabados anteriores antes de re-insertar
        $db->prepare("DELETE FROM producto_acabados WHERE producto_id = :pid")
           ->execute([':pid' => $producto_id]);

    } else {
        json_error('Método no permitido', 405);
    }

    // ─── Acabados: siempre se re-insertan (captura única en tabla pivote) ─
    if (!empty($acabados)) {
        $ins = $db->prepare("
            INSERT IGNORE INTO producto_acabados (producto_id, acabado_id)
            VALUES (:pid, :aid)
        ");
        foreach ($acabados as $aid) {
            $ins->execute([':pid' => $producto_id, ':aid' => (int)$aid]);
        }
    }

    $db->commit();
    json_ok(['id' => $producto_id], $method === 'POST' ? 201 : 200);

} catch (Exception $e) {
    $db->rollBack();
    json_error('Error al guardar producto: ' . $e->getMessage(), 500);
}
