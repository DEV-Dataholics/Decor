<?php
// api/empleados/list.php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
require_once '../config/db.php';
session_start();
if (!isset($_SESSION['user'])) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$pdo = getDB();
$stmt = $pdo->query("
    SELECT id, nombre, rol, especialidades, tarifa_base, activo, fecha_ingreso
    FROM empleados WHERE activo = 1 ORDER BY nombre
");
echo json_encode(['ok'=>true, 'items'=>$stmt->fetchAll()]);
