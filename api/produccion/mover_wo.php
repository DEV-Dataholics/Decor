<?php
// api/produccion/mover_wo.php
// Actualiza el estatus de un work_order (kanban) y guarda las asignaciones/costos de empleados.

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'POST requerido']); exit; }

require_once '../config/db.php';
session_start();

$user = $_SESSION['user'] ?? null;
if (!$user) { http_response_code(401); echo json_encode(['error'=>'Sesión requerida']); exit; }

$data = json_decode(file_get_contents('php://input'), true);
$id = (int)($data['id'] ?? 0);
$estatus = $data['estatus'] ?? '';
$assignment = $data['assignment'] ?? null;

if (!$id || !$estatus) { http_response_code(422); echo json_encode(['error'=>'id y estatus requeridos']); exit; }

try {
    $pdo = getDB();
    $pdo->beginTransaction();

    // Obtener la WO actual
    $stmtWo = $pdo->prepare("SELECT * FROM work_orders WHERE id = ?");
    $stmtWo->execute([$id]);
    $wo = $stmtWo->fetch(PDO::FETCH_ASSOC);

    if (!$wo) {
        http_response_code(404);
        echo json_encode(['error'=>'WO no encontrada']);
        exit;
    }

    $updates = ["estatus = :estatus", "actualizado_en = NOW()"];
    $params = [':estatus' => $estatus, ':id' => $id];
    $cantidad_a_mover = (float)$wo['cantidad_asignada']; // Por defecto movemos todo lo que tenga la WO original

    // Assignment updates
    if ($assignment && $estatus === 'en_produccion') {
        $updates[] = "empleado_carpintero_id = :emp_id";
        $updates[] = "costo_mano_obra_carpinteria = :costo";
        if (isset($assignment['cantidad_asignada'])) {
            $cantidad_a_mover = (float)$assignment['cantidad_asignada'];
            $updates[] = "cantidad_asignada = :cant";
            $params[':cant'] = $cantidad_a_mover;
        }
        $params[':emp_id'] = $assignment['empleado_id'];
        $params[':costo'] = $assignment['costo_mano_obra'];
    } elseif ($assignment && $estatus === 'acabados') {
        $updates[] = "empleado_acabado_id = :emp_id";
        $updates[] = "costo_mano_obra_acabado = :costo";
        $params[':emp_id'] = $assignment['empleado_id'];
        $params[':costo'] = $assignment['costo_mano_obra'];
    }

    // Split logic
    if ($cantidad_a_mover > 0 && $cantidad_a_mover < (float)$wo['cantidad_asignada']) {
        // 1. Actualizamos la original para que tenga solo la cantidad restante, y se quede en su estatus actual
        $cant_restante = (float)$wo['cantidad_asignada'] - $cantidad_a_mover;
        $pdo->prepare("UPDATE work_orders SET cantidad_asignada = ? WHERE id = ?")->execute([$cant_restante, $id]);

        // 2. Insertamos la NUEVA (la que sí se va a mover)
        $pdo->prepare("
            INSERT INTO work_orders (orden_item_id, estatus, cantidad_asignada, empleado_carpintero_id, costo_mano_obra_carpinteria, fecha_inicio, fecha_termino)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $wo['orden_item_id'],
            $estatus,
            $cantidad_a_mover,
            $assignment['empleado_id'] ?? null,
            $assignment['costo_mano_obra'] ?? null,
            $estatus === 'en_produccion' ? date('Y-m-d') : null,
            null
        ]);
        
        $pdo->commit();
        echo json_encode(['ok'=>true, 'mensaje'=>'WO dividida y movida correctamente']);
        exit;
    }

    $setClause = implode(", ", $updates);
    $pdo->prepare("UPDATE work_orders SET {$setClause} WHERE id = :id")->execute($params);

    $pdo->commit();
    echo json_encode(['ok'=>true, 'mensaje'=>'WO actualizado correctamente']);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error'=>'Error actualizando WO: '.$e->getMessage()]);
}
