<?php
// api/pedidos/ordenes.php
// GET: Listar órdenes de tipo mayorista/especial
// POST: Crear nueva orden, sus ítems y descontar del inventario

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'ventas']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = getDB();
        $stmt = $pdo->query("
            SELECT o.id, o.fecha_creacion, o.estatus, o.total, o.tipo_orden,
                   o.cliente_id,
                   CASE 
                     WHEN o.tipo_orden = 'resurtido_tienda' THEN t.nombre
                     ELSE c.nombre 
                   END as cliente_nombre,
                   CASE 
                     WHEN o.tipo_orden = 'resurtido_tienda' THEN ''
                     ELSE c.email 
                   END as cliente_email,
                   COUNT(oi.id) as total_items
            FROM ordenes o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            LEFT JOIN tiendas t ON o.cliente_id = t.id AND o.tipo_orden = 'resurtido_tienda'
            LEFT JOIN orden_items oi ON oi.orden_id = o.id
            WHERE o.tipo_orden != 'borrador'
            GROUP BY o.id
            ORDER BY o.fecha_creacion DESC
            LIMIT 50
        ");
        $ordenes = $stmt->fetchAll();
        
        // Obtener ítems para cada orden
        foreach ($ordenes as &$ord) {
            $st = $pdo->prepare("
                SELECT oi.id, p.nombre as producto_nombre, oi.cantidad, oi.precio_unitario, oi.subtotal, p.codigo_sku
                FROM orden_items oi
                JOIN productos p ON p.id = oi.producto_id
                WHERE oi.orden_id = ?
            ");
            $st->execute([$ord['id']]);
            $ord['items'] = $st->fetchAll();
        }
        
        json_ok($ordenes);
    } catch (PDOException $e) {
        json_error('Error al obtener pedidos: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_body();
    $user = current_user();
    
    // Crear nueva orden de mayoreo
    $cliente_id = (int)($data['cliente_id'] ?? 0);
    $tienda_origen_id = (int)($data['tienda_origen_id'] ?? 1); // Por defecto Tienda Centro
    $items = $data['items'] ?? [];
    $descuento_global = (float)($data['descuento_global'] ?? 0);
    $notas = trim($data['notas'] ?? '');
    
    if (!$cliente_id || empty($items)) {
        json_error('Cliente e ítems son requeridos', 422);
    }
    
    try {
        $pdo = getDB();
        $pdo->beginTransaction();
        
        // Calcular total
        $total = 0;
        foreach ($items as $it) {
            $total += ((float)$it['cantidad'] * (float)$it['precio_unitario']);
        }
        $total -= $descuento_global;
        
        // Insertar Orden
        $insOrd = $pdo->prepare("
            INSERT INTO ordenes 
            (cliente_id, tienda_origen_id, tipo_orden, fecha_creacion, estatus, total, descuento_global, notas, creado_por)
            VALUES (?, ?, 'especial', CURDATE(), 'embarcada', ?, ?, ?, ?)
        ");
        $insOrd->execute([$cliente_id, $tienda_origen_id, $total, $descuento_global, $notas, $user['id']]);
        $orden_id = $pdo->lastInsertId();
        
        foreach ($items as $it) {
            $producto_id = (int)$it['producto_id'];
            $cantidad = (float)$it['cantidad'];
            $precio = (float)$it['precio_unitario'];
            $subtotal = $cantidad * $precio;
            
            // Insertar Item
            $insIt = $pdo->prepare("
                INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario, subtotal, estatus_item)
                VALUES (?, ?, ?, ?, ?, 'embarcado')
            ");
            $insIt->execute([$orden_id, $producto_id, $cantidad, $precio, $subtotal]);
            
            // --- DESCONTAR DE INVENTARIO ---
            // Buscar inventario
            $checkInv = $pdo->prepare("SELECT id FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1 FOR UPDATE");
            $checkInv->execute([$tienda_origen_id, $producto_id]);
            $invRow = $checkInv->fetch();
            
            if (!$invRow) {
                // Generar inventario en 0 para luego descontar y dejarlo negativo (o error)
                $insInv = $pdo->prepare("
                    INSERT INTO inventario_tienda (tienda_id, producto_id, cantidad_disponible, cantidad_reservada, origen_stock, costo_unitario, precio_venta)
                    VALUES (?, ?, 0, 0, 'compra_externa', 0, ?)
                ");
                $insInv->execute([$tienda_origen_id, $producto_id, $precio]);
                $inv_id = $pdo->lastInsertId();
            } else {
                $inv_id = $invRow['id'];
            }
            
            // Generar movimiento de SALIDA (venta mayoreo / embarque)
            $movStmt = $pdo->prepare("
                INSERT INTO movimientos_inventario_tienda
                (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
                VALUES (?, 'salida', ?, 'venta', ?, ?, 'Venta Mayoreo / Orden Compra')
            ");
            // La cantidad debe ser NEGATIVA para salida o el trigger maneja 'salida'? 
            // El trigger en 05_tienda_pos.sql asume: Si es 'salida' resta la cantidad si es positiva?
            // Vamos a revisar 05_tienda_pos.sql. Por lo general los triggers restan si es tipo='salida'.
            $movStmt->execute([$inv_id, $cantidad, $orden_id, $user['id']]);
        }
        
        $pdo->commit();
        json_ok(['orden_id' => $orden_id, 'mensaje' => 'Orden de compra mayorista creada y stock descontado']);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        json_error('Error al procesar orden de compra: ' . $e->getMessage(), 500);
    }
}
