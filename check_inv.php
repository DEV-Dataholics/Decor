<?php
require_once __DIR__ . '/api/config/db.php';
$pdo = getDB();
$stmt = $pdo->query("SHOW CREATE TABLE inventario_tienda");
echo $stmt->fetchColumn(1);
?>
