<?php
// api/productos/save.php
// POST /api/productos/save.php  → Crear producto nuevo
// PUT  /api/productos/save.php  → Actualizar producto existente

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

$body   = get_body();
$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ─── Validaciones comunes ──────────────────────────────────
if (empty($body['nombre'])) {
    json_error('El nombre del producto es requerido', 422);
}

$nombre       = trim($body['nombre']);
$descripcion  = trim($body['descripcion'] ?? '');
$sku          = trim($body['sku'] ?? $body['codigo_sku'] ?? '');
$precio_venta = (float)($body['precio_venta_base'] ?? (is_array($body['prices'] ?? null) ? reset($body['prices']) : 0));
$precio_costo = (float)($body['precio_costo_base'] ?? $body['costo_produccion'] ?? $body['precio_produccion_base'] ?? 0);
$es_unica     = (int)!empty($body['es_pieza_unica']);
$origen       = $body['origen'] ?? 'taller';
$tipo_taller  = $body['tipo_orden_taller'] ?? 'linea';

// Orígenes válidos
$origenes_validos = ['taller', 'compra_externa', 'artesania', 'pieza_unica'];
if (!in_array($origen, $origenes_validos)) {
    $origen = 'taller';
}

// Medidas base en pulgadas / cm
$ancho = isset($body['dimensions']['width']) ? (float)$body['dimensions']['width'] : (float)($body['dimension_ancho'] ?? 0);
$alto  = isset($body['dimensions']['height']) ? (float)$body['dimensions']['height'] : (float)($body['dimension_alto'] ?? 0);
$fondo = isset($body['dimensions']['depth']) ? (float)$body['dimensions']['depth'] : (float)($body['dimension_largo'] ?? $body['dimension_fondo'] ?? 0);

$medidas_base = json_encode([
    'ancho' => $ancho,
    'alto'  => $alto,
    'fondo' => $fondo
], JSON_UNESCAPED_UNICODE);

// Foto URL
$foto_url = null;
if (!empty($body['image_url'])) {
    $foto_url = json_encode([$body['image_url']], JSON_UNESCAPED_UNICODE);
} elseif (!empty($body['foto_url'])) {
    $foto_url = is_array($body['foto_url']) 
        ? json_encode($body['foto_url'], JSON_UNESCAPED_UNICODE) 
        : json_encode([$body['foto_url']], JSON_UNESCAPED_UNICODE);
}

// Resolver Categoría (por ID o por nombre)
$categoria_id = 1;
if (!empty($body['categoria_id']) && is_numeric($body['categoria_id'])) {
    $categoria_id = (int)$body['categoria_id'];
} elseif (!empty($body['type']) || !empty($body['categoria_nombre'])) {
    $catNombre = trim($body['type'] ?? $body['categoria_nombre']);
    $catStmt = $db->prepare("SELECT id FROM categorias_mueble WHERE nombre = ? LIMIT 1");
    $catStmt->execute([$catNombre]);
    $catRow = $catStmt->fetch();
    if ($catRow) {
        $categoria_id = (int)$catRow['id'];
    } else {
        // Crear categoría si no existe
        $insCat = $db->prepare("INSERT INTO categorias_mueble (nombre) VALUES (?)");
        $insCat->execute([$catNombre]);
        $categoria_id = (int)$db->lastInsertId();
    }
}

// Generar SKU automático si viene vacío
if (empty($sku)) {
    $prefix = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $nombre), 0, 3));
    if (strlen($prefix) < 3) $prefix = 'DCR';
    $sku = $prefix . '-' . str_pad((string)rand(100, 999), 3, '0', STR_PAD_LEFT);
}

$acabados = $body['acabados'] ?? $body['finishes'] ?? []; // Array de IDs o nombres
$user     = current_user();
$userId   = (int)($user['id'] ?? 1);

try {
    $db->beginTransaction();

    // ─── CREAR (POST) ──────────────────────────────────────────
    if ($method === 'POST') {
        $stmt = $db->prepare("
            INSERT INTO productos
              (codigo_sku, nombre, descripcion, categoria_id, origen,
               es_pieza_unica, tipo_orden_taller, medidas_base, foto_url,
               precio_venta_base, precio_costo_base, activo, creado_por)
            VALUES
              (:sku, :nom, :desc, :cat, :origen,
               :eu, :tipo_t, :medidas, :foto,
               :pv, :pc, 1, :uid)
        ");
        $stmt->execute([
            ':sku'     => $sku,
            ':nom'     => $nombre,
            ':desc'    => $descripcion,
            ':cat'     => $categoria_id,
            ':origen'  => $origen,
            ':eu'      => $es_unica,
            ':tipo_t'  => $tipo_taller,
            ':medidas' => $medidas_base,
            ':foto'    => $foto_url,
            ':pv'      => $precio_venta,
            ':pc'      => $precio_costo,
            ':uid'     => $userId,
        ]);
        $producto_id = (int)$db->lastInsertId();

    // ─── ACTUALIZAR (PUT) ──────────────────────────────────────
    } elseif ($method === 'PUT') {
        if (empty($body['id'])) {
            json_error('Se requiere el id del producto para actualizar', 422);
        }
        $producto_id = (int)$body['id'];

        $stmt = $db->prepare("
            UPDATE productos SET
              codigo_sku = :sku,
              nombre = :nom,
              descripcion = :desc,
              categoria_id = :cat,
              origen = :origen,
              es_pieza_unica = :eu,
              tipo_orden_taller = :tipo_t,
              medidas_base = :medidas,
              foto_url = :foto,
              precio_venta_base = :pv,
              precio_costo_base = :pc
            WHERE id = :pid
        ");
        $stmt->execute([
            ':sku'     => $sku,
            ':nom'     => $nombre,
            ':desc'    => $descripcion,
            ':cat'     => $categoria_id,
            ':origen'  => $origen,
            ':eu'      => $es_unica,
            ':tipo_t'  => $tipo_taller,
            ':medidas' => $medidas_base,
            ':foto'    => $foto_url,
            ':pv'      => $precio_venta,
            ':pc'      => $precio_costo,
            ':pid'     => $producto_id,
        ]);

        // Limpiar acabados anteriores antes de re-insertar
        $db->prepare("DELETE FROM producto_acabados WHERE producto_id = :pid")
           ->execute([':pid' => $producto_id]);

    } else {
        json_error('Método no permitido', 405);
    }

    // ─── Guardar Acabados (por ID o por nombre) ────────────────
    if (!empty($acabados) && is_array($acabados)) {
        $insAcab = $db->prepare("INSERT IGNORE INTO producto_acabados (producto_id, acabado_id) VALUES (?, ?)");
        foreach ($acabados as $acab) {
            $acabadoId = null;
            if (is_numeric($acab)) {
                $acabadoId = (int)$acab;
            } elseif (is_string($acab)) {
                $searchA = $db->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
                $searchA->execute([$acab]);
                $aRow = $searchA->fetch();
                if ($aRow) {
                    $acabadoId = (int)$aRow['id'];
                }
            }

            if ($acabadoId) {
                $insAcab->execute([$producto_id, $acabadoId]);
            }
        }
    }

    // ─── Guardar Precios Específicos por Cliente (si vienen) ───
    if (!empty($body['prices']) && is_array($body['prices'])) {
        $insPrecio = $db->prepare("
            INSERT INTO listas_precios_clientes (cliente_id, producto_id, precio_acordado)
            VALUES (:cid, :pid, :precio)
            ON DUPLICATE KEY UPDATE precio_acordado = :precio2
        ");
        foreach ($body['prices'] as $cliKey => $precioVal) {
            $clienteId = is_numeric($cliKey) ? (int)$cliKey : null;
            if (!$clienteId && is_string($cliKey)) {
                $cliStmt = $db->prepare("SELECT id FROM clientes WHERE nombre = ? LIMIT 1");
                $cliStmt->execute([$cliKey]);
                $cliRow = $cliStmt->fetch();
                if ($cliRow) $clienteId = (int)$cliRow['id'];
            }

            if ($clienteId && (float)$precioVal > 0) {
                $insPrecio->execute([
                    ':cid'     => $clienteId,
                    ':pid'     => $producto_id,
                    ':precio'  => (float)$precioVal,
                    ':precio2' => (float)$precioVal
                ]);
            }
        }
    }

    $db->commit();

    json_ok([
        'id'         => $producto_id,
        'codigo_sku' => $sku,
        'nombre'     => $nombre,
        'mensaje'    => $method === 'POST' ? 'Producto creado con éxito' : 'Producto actualizado con éxito'
    ], $method === 'POST' ? 201 : 200);

} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    json_error('Error al guardar producto: ' . $e->getMessage(), 500);
}
