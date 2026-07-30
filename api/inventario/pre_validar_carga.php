<?php
// api/inventario/pre_validar_carga.php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$data = get_body();
$itemsInput = $data['items'] ?? [];

if (!is_array($itemsInput)) {
    json_error('El campo items debe ser un array', 422);
}

try {
    $pdo = getDB();
    
    $validos = [];
    $duplicados = [];
    $errores = [];

    // Cache parameters to reduce database trips
    $stmtProd = $pdo->prepare("SELECT id, name, sku FROM productos WHERE id = ? OR sku = ? LIMIT 1");
    $stmtTienda = $pdo->prepare("SELECT nombre FROM tiendas WHERE id = ? LIMIT 1");
    $stmtInv = $pdo->prepare("SELECT id, cantidad_disponible FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1");

    foreach ($itemsInput as $index => $item) {
        $pIdOrSku = $item['producto_id'] ?? $item['sku'] ?? '';
        $tId = (int)($item['tienda_id'] ?? 0);
        $qty = (float)($item['cantidad'] ?? 0);

        if (!$pIdOrSku) {
            $errores[] = ["index" => $index, "error" => "SKU o ID de producto faltante"];
            continue;
        }
        if (!$tId) {
            $errores[] = ["index" => $index, "error" => "ID de sucursal faltante o inválido"];
            continue;
        }
        if ($qty <= 0) {
            $errores[] = ["index" => $index, "error" => "La cantidad debe ser mayor que 0"];
            continue;
        }

        // 1. Resolver tienda
        $stmtTienda->execute([$tId]);
        $tiendaNombre = $stmtTienda->fetchColumn();
        if (!$tiendaNombre) {
            $errores[] = ["index" => $index, "error" => "Sucursal no encontrada con ID $tId"];
            continue;
        }

        // 2. Resolver producto
        $stmtProd->execute([$pIdOrSku, $pIdOrSku]);
        $prod = $stmtProd->fetch(PDO::FETCH_ASSOC);

        if (!$prod) {
            if (!empty($item['nombre'])) {
                // Producto no existe pero viene con nombre para ser creado
                $record = [
                    "producto_id" => 0,
                    "producto_nombre" => trim($item['nombre']),
                    "sku" => $pIdOrSku,
                    "tienda_id" => $tId,
                    "tienda_nombre" => $tiendaNombre,
                    "cantidad_actual" => 0.0,
                    "cantidad_nueva" => $qty,
                    "is_new" => true,
                    "categoria" => trim($item['categoria'] ?? ''),
                    "costo_produccion" => (float)($item['costo_produccion'] ?? 0),
                    "precio_publico" => (float)($item['precio_publico'] ?? 0),
                    "ancho" => (float)($item['ancho'] ?? 0),
                    "alto" => (float)($item['alto'] ?? 0),
                    "fondo" => (float)($item['fondo'] ?? 0),
                    "acabados" => trim($item['acabados'] ?? '')
                ];
                $validos[] = $record;
            } else {
                $errores[] = ["index" => $index, "error" => "Producto no encontrado: $pIdOrSku. Proporcione 'nombre' y 'categoria' para crearlo automáticamente."];
            }
            continue;
        }

        // 3. Revisar existencia de inventario
        $stmtInv->execute([$tId, $prod['id']]);
        $inv = $stmtInv->fetch(PDO::FETCH_ASSOC);

        $record = [
            "producto_id" => (int)$prod['id'],
            "producto_nombre" => $prod['name'],
            "sku" => $prod['sku'],
            "tienda_id" => $tId,
            "tienda_nombre" => $tiendaNombre,
            "cantidad_actual" => $inv ? (float)$inv['cantidad_disponible'] : 0.0,
            "cantidad_nueva" => $qty,
            "is_new" => false,
            "categoria" => trim($item['categoria'] ?? ''),
            "costo_produccion" => isset($item['costo_produccion']) ? (float)$item['costo_produccion'] : null,
            "precio_publico" => isset($item['precio_publico']) ? (float)$item['precio_publico'] : null,
            "ancho" => isset($item['ancho']) ? (float)$item['ancho'] : null,
            "alto" => isset($item['alto']) ? (float)$item['alto'] : null,
            "fondo" => isset($item['fondo']) ? (float)$item['fondo'] : null,
            "acabados" => trim($item['acabados'] ?? '')
        ];

        if ($inv && (float)$inv['cantidad_disponible'] > 0) {
            $duplicados[] = $record;
        } else {
            $validos[] = $record;
        }
    }

    json_ok([
        "validos" => $validos,
        "duplicados" => $duplicados,
        "errores" => $errores
    ]);

} catch (Exception $e) {
    json_error('Error de validación: ' . $e->getMessage(), 500);
}
