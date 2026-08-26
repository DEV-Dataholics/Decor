<?php
// api/tiendas/list.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller', 'repartidor', 'cajero', 'bodega']);

$todas = isset($_GET['todas']) && $_GET['todas'] === '1';

try {
    $pdo = getDB();
    $sql = $todas ? "SELECT * FROM tiendas ORDER BY id" : "SELECT * FROM tiendas WHERE activa = 1 ORDER BY id";
    $stmt = $pdo->query($sql);
    $tiendas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($tiendas as &$t) {
        $t['id'] = (int)$t['id'];
        $t['activa'] = (bool)$t['activa'];
    }
    unset($t);
    json_ok(['items' => $tiendas]);
} catch (PDOException $e) {
    errorResponse('Error al obtener tiendas: ' . $e->getMessage(), 500);
}
