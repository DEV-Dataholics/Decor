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
if (empty($body['categoria_id']) && empty($body['categoria_nombre'])) json_error('La categoría es requerida');

$nombre       = trim($body['nombre']);
$categoria_id = (int)($body['categoria_id'] ?? 0);
$categoria_nombre = trim($body['categoria_nombre'] ?? '');

if ($categoria_id > 0) {
    $stmtCheckCat = $db->prepare("SELECT id FROM categorias_mueble WHERE id = ?");
    $stmtCheckCat->execute([$categoria_id]);
    if (!$stmtCheckCat->fetchColumn()) {
        $categoria_id = 0;
    }
}

if (!$categoria_id && $categoria_nombre) {
    $stmtCat = $db->prepare("SELECT id FROM categorias_mueble WHERE nombre = ? LIMIT 1");
    $stmtCat->execute([$categoria_nombre]);
    $catId = $stmtCat->fetchColumn();
    if ($catId) {
        $categoria_id = (int)$catId;
    } else {
        $stmtInsCat = $db->prepare("INSERT INTO categorias_mueble (nombre, descripcion) VALUES (?, 'Auto-creada desde formulario')");
        $stmtInsCat->execute([$categoria_nombre]);
        $categoria_id = (int)$db->lastInsertId();
    }
}

if (!$categoria_id) {
    $stmtCat = $db->prepare("SELECT id FROM categorias_mueble LIMIT 1");
    $stmtCat->execute();
    $categoria_id = (int)$stmtCat->fetchColumn();
    if (!$categoria_id) {
        $stmtInsCat = $db->prepare("INSERT INTO categorias_mueble (nombre, descripcion) VALUES ('General', 'Categoría de fallback')");
        $stmtInsCat->execute();
        $categoria_id = (int)$db->lastInsertId();
    }
}
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
              (categoria_id, codigo_sku, nombre, descripcion, precio_venta_base,
               precio_costo_base, es_pieza_unica, medidas_base, notas, foto_url, creado_por)
            VALUES
              (:cat, :sku, :nom, :desc, :pv, :pp, :eu, :medidas, :notas, :foto, :uid)
        ");
        $stmt->execute([
            ':cat'     => $categoria_id, 
            ':sku'     => $sku,
            ':nom'     => $nombre,       
            ':desc'    => $descripcion,
            ':pv'      => $precio_venta, 
            ':pp'      => $precio_prod,
            ':eu'      => $es_unica,     
            ':medidas' => json_encode(['alto' => $alto, 'ancho' => $ancho, 'largo' => $largo]),
            ':notas'   => $notas,        
            ':foto'    => $foto_url,
            ':uid'     => $user['id'],
        ]);
        $producto_id = (int)$db->lastInsertId();

    // ─── ACTUALIZAR ───────────────────────────────────────
    } elseif ($method === 'PUT') {
        if (empty($body['id'])) json_error('Se requiere el id del producto');
        $producto_id = (int)$body['id'];

        $stmt = $db->prepare("
            UPDATE productos SET
              categoria_id = :cat, codigo_sku = :sku, nombre = :nom,
              descripcion = :desc, precio_venta_base = :pv,
              precio_costo_base = :pp, es_pieza_unica = :eu,
              medidas_base = :medidas, notas = :notas, foto_url = :foto
            WHERE id = :pid
        ");
        $stmt->execute([
            ':cat'     => $categoria_id, 
            ':sku'     => $sku,
            ':nom'     => $nombre,       
            ':desc'    => $descripcion,
            ':pv'      => $precio_venta, 
            ':pp'      => $precio_prod,
            ':eu'      => $es_unica,     
            ':medidas' => json_encode(['alto' => $alto, 'ancho' => $ancho, 'largo' => $largo]),
            ':notas'   => $notas,        
            ':foto'    => $foto_url,
            ':pid'     => $producto_id,
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
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    json_error('Error al guardar producto: ' . $e->getMessage(), 500);
}
