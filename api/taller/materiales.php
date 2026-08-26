<?php
// api/taller/materiales.php
// GET: Lista todos los materiales e insumos de taller
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'encargado_taller', 'carpintero']);

try {
    $pdo = getDB();
    $stmt = $pdo->query("
        SELECT id, nombre, tipo, subtipo, unidad_medida as unidad, 
               stock_actual as cantidad, stock_minimo as minimo, 
               stock_maximo as maximo, costo_unitario, codigo_referencia
        FROM materiales
        WHERE activo = 1
        ORDER BY nombre
    ");
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$it) {
        $it['id']       = (int)$it['id'];
        $it['cantidad'] = (float)$it['cantidad'];
        $it['minimo']   = (float)$it['minimo'];
        $it['maximo']   = (float)$it['maximo'];
        $it['costo_unitario'] = (float)$it['costo_unitario'];
        // Color visual para badge
        $it['color'] = $it['tipo'] === 'madera' ? 'bg-amber-600' : ($it['tipo'] === 'quimico' ? 'bg-cyan-600' : 'bg-emerald-600');
    }
    unset($it);

    json_ok(['items' => $items]);
} catch (PDOException $e) {
    errorResponse('Error al consultar materiales: ' . $e->getMessage(), 500);
}
