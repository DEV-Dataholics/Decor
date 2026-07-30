<?php
// api/inventario/confirmar_carga.php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$user = current_user();
$items = $data['items'] ?? [];
$notasGlobal = trim($data['notas'] ?? '');

if (!is_array($items)) {
    json_error('El campo items debe ser un array', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    $stmtCheck = $pdo->prepare("SELECT id, cantidad_disponible FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1 FOR UPDATE");
    $stmtInsInv = $pdo->prepare("
        INSERT INTO inventario_tienda 
            (tienda_id, producto_id, cantidad_disponible, cantidad_reservada, origen_stock, costo_unitario, precio_venta, lote_referencia_tipo, lote_referencia_id)
        VALUES (?, ?, 0, 0, 'compra_externa', 0, 0, NULL, NULL)
    ");
    $stmtUpdInv = $pdo->prepare("UPDATE inventario_tienda SET cantidad_disponible = ? WHERE id = ?");
    $stmtGetPrice = $pdo->prepare("SELECT precio_venta_base FROM productos WHERE id = ?");
    $stmtSetPrice = $pdo->prepare("UPDATE inventario_tienda SET precio_venta = ? WHERE id = ?");

    $stmtMov = $pdo->prepare("
        INSERT INTO movimientos_inventario_tienda
            (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
        VALUES (?, ?, ?, 'ajuste_manual', NULL, ?, ?)
    ");

    foreach ($items as $item) {
        $producto_id = (int)($item['producto_id'] ?? 0);
        $sku = trim($item['sku'] ?? '');
        $tienda_id = (int)($item['tienda_id'] ?? 0);
        $cantidad = (float)($item['cantidad'] ?? 0);
        $action = $item['action'] ?? 'sumar'; // 'sumar' | 'reemplazar'

        if ((!$producto_id && !$sku) || !$tienda_id || $cantidad <= 0) {
            continue;
        }

        // A. Buscar o crear Categoría
        $categoria_id = 1;
        if (!empty($item['categoria'])) {
            $catName = trim($item['categoria']);
            $stmtCat = $pdo->prepare("SELECT id FROM categorias_mueble WHERE nombre = ? LIMIT 1");
            $stmtCat->execute([$catName]);
            $catId = $stmtCat->fetchColumn();
            if ($catId) {
                $categoria_id = (int)$catId;
            } else {
                $stmtInsCat = $pdo->prepare("INSERT INTO categorias_mueble (nombre, descripcion) VALUES (?, 'Auto-creado desde carga masiva')");
                $stmtInsCat->execute([$catName]);
                $categoria_id = (int)$pdo->lastInsertId();
            }
        }

        // B. Buscar o crear/actualizar Producto
        if ($producto_id > 0) {
            $stmtGetProd = $pdo->prepare("SELECT * FROM productos WHERE id = ?");
            $stmtGetProd->execute([$producto_id]);
            $prodRow = $stmtGetProd->fetch(PDO::FETCH_ASSOC);
            if ($prodRow) {
                $medidas = json_decode($prodRow['medidas_base'] ?? '{}', true);
                if (isset($item['alto'])) $medidas['alto'] = $item['alto'];
                if (isset($item['ancho'])) $medidas['ancho'] = $item['ancho'];
                if (isset($item['fondo'])) $medidas['largo'] = $item['fondo'];

                $stmtUpdProd = $pdo->prepare("
                    UPDATE productos SET
                        nombre = COALESCE(?, nombre),
                        categoria_id = COALESCE(?, categoria_id),
                        precio_venta_base = COALESCE(?, precio_venta_base),
                        precio_costo_base = COALESCE(?, precio_costo_base),
                        medidas_base = ?
                    WHERE id = ?
                ");
                $stmtUpdProd->execute([
                    !empty($item['producto_nombre']) ? $item['producto_nombre'] : null,
                    $categoria_id ?: null,
                    isset($item['precio_publico']) ? (float)$item['precio_publico'] : null,
                    isset($item['costo_produccion']) ? (float)$item['costo_produccion'] : null,
                    json_encode($medidas),
                    $producto_id
                ]);
            }
        } else {
            $stmtLookup = $pdo->prepare("SELECT id FROM productos WHERE codigo_sku = ? LIMIT 1");
            $stmtLookup->execute([$sku]);
            $existId = $stmtLookup->fetchColumn();
            if ($existId) {
                $producto_id = (int)$existId;
            } else {
                $medidas = [
                    'alto' => $item['alto'] ?? 0,
                    'ancho' => $item['ancho'] ?? 0,
                    'largo' => $item['fondo'] ?? 0
                ];
                $stmtInsProd = $pdo->prepare("
                    INSERT INTO productos
                        (categoria_id, codigo_sku, nombre, descripcion, precio_venta_base, precio_costo_base, medidas_base, creado_por)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmtInsProd->execute([
                    $categoria_id,
                    $sku,
                    !empty($item['producto_nombre']) ? $item['producto_nombre'] : 'Producto Nuevo',
                    !empty($item['producto_nombre']) ? $item['producto_nombre'] : 'Producto Nuevo',
                    isset($item['precio_publico']) ? (float)$item['precio_publico'] : 0.0,
                    isset($item['costo_produccion']) ? (float)$item['costo_produccion'] : 0.0,
                    json_encode($medidas),
                    $user['id']
                ]);
                $producto_id = (int)$pdo->lastInsertId();
            }
        }

        // C. Linkear/Insertar acabados
        if (!empty($item['acabados'])) {
            $acabadoNames = array_map('trim', explode(',', $item['acabados']));
            foreach ($acabadoNames as $acName) {
                if (!$acName) continue;
                $stmtAc = $pdo->prepare("SELECT id FROM acabados WHERE nombre = ? LIMIT 1");
                $stmtAc->execute([$acName]);
                $acId = $stmtAc->fetchColumn();
                if (!$acId) {
                    $stmtInsAc = $pdo->prepare("INSERT INTO acabados (nombre, tipo, codigo_color) VALUES (?, 'madera', '#8B4513')");
                    $stmtInsAc->execute([$acName]);
                    $acId = $pdo->lastInsertId();
                }
                $stmtLink = $pdo->prepare("INSERT IGNORE INTO producto_acabados (producto_id, acabado_id) VALUES (?, ?)");
                $stmtLink->execute([$producto_id, (int)$acId]);
            }
        }

        // D. Registrar o actualizar inventario
        $stmtCheck->execute([$tienda_id, $producto_id]);
        $inv = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($inv) {
            $inv_id = (int)$inv['id'];
            $stock_actual = (float)$inv['cantidad_disponible'];
        } else {
            $stmtInsInv->execute([$tienda_id, $producto_id]);
            $inv_id = (int)$pdo->lastInsertId();
            $stock_actual = 0.0;

            // Poner precio base
            $stmtGetPrice->execute([$producto_id]);
            $pBase = (float)$stmtGetPrice->fetchColumn();
            if ($pBase > 0) {
                $stmtSetPrice->execute([$pBase, $inv_id]);
            }
        }

        if ($action === 'reemplazar') {
            $diff = $cantidad - $stock_actual;
            $tipo_mov = 'ajuste';
        } else {
            $diff = $cantidad;
            $tipo_mov = 'entrada';
        }

        if ($diff == 0) {
            continue;
        }

        $nuevo_stock = $stock_actual + $diff;
        $stmtUpdInv->execute([$nuevo_stock, $inv_id]);

        $comentario = $notasGlobal ?: "Entrada inicial de inventario / carga manual";
        if ($action === 'reemplazar') {
            $comentario .= " (Reemplazo absoluto a $cantidad)";
        } else {
            $comentario .= " (Sumado $cantidad piezas)";
        }

        $stmtMov->execute([
            $inv_id,
            $tipo_mov,
            $diff,
            $user['id'],
            $comentario
        ]);
    }

    $pdo->commit();
    json_ok(['mensaje' => 'Inventario inicial cargado exitosamente']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al registrar inventario inicial: ' . $e->getMessage(), 500);
}
