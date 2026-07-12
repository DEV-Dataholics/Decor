<?php
// api/config/alter_embarques_orden.php
require_once __DIR__ . '/config/db.php';
try {
    $pdo = getDB();
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0;");
    $pdo->exec("ALTER TABLE embarques MODIFY COLUMN orden_id INT UNSIGNED NULL");
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1;");
    echo "Success: Column orden_id modified successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
