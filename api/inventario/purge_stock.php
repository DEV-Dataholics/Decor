<?php
// api/inventario/purge_stock.php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin']); // Only admins are authorized to purge test data

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método no permitido', 405);
}

$body = get_body();
$tienda_id = (int)($body['tienda_id'] ?? 0);
$producto_id = (int)($body['producto_id'] ?? 0);

if (!$tienda_id || !$producto_id) {
    json_error('Parámetros tienda_id y producto_id son obligatorios', 422);
}

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Buscar el registro de inventario_tienda
    $stmt = $pdo->prepare("SELECT id FROM inventario_tienda WHERE tienda_id = ? AND producto_id = ? LIMIT 1 FOR UPDATE");
    $stmt->execute([$tienda_id, $producto_id]);
    $invId = $stmt->fetchColumn();

    if ($invId) {
        // 1. Eliminar movimientos de inventario asociados
        $pdo->prepare("DELETE FROM movimientos_inventario_tienda WHERE inventario_tienda_id = ?")->execute([$invId]);
        
        // 2. Intentar la eliminación física de inventario_tienda
        try {
            $stmtDel = $pdo->prepare("DELETE FROM inventario_tienda WHERE id = ?");
            $stmtDel->execute([$invId]);
        } catch (PDOException $ex) {
            // Si hay llaves foráneas activas (ventas, pedidos, embarques), resetear stock a 0
            $stmtReset = $pdo->prepare("UPDATE inventario_tienda SET cantidad_disponible = 0, cantidad_reservada = 0 WHERE id = ?");
            $stmtReset->execute([$invId]);
            
            // Registrar movimiento de reinicio
            $stmtMov = $pdo->prepare("
                INSERT INTO movimientos_inventario_tienda
                    (inventario_tienda_id, tipo, cantidad, referencia_tipo, referencia_id, usuario_id, notas)
                VALUES (?, 'ajuste', 0, 'ajuste_manual', NULL, ?, 'Reinicio de stock de prueba (Purga)')
            ");
            $user = current_user();
            $stmtMov->execute([$invId, $user['id']]);
        }
    }

    $pdo->commit();
    json_ok(['status' => 'ok', 'mensaje' => 'Registro de inventario purgado correctamente']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_error('Error al purgar stock: ' . $e->getMessage(), 500);
}
