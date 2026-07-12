<?php
// api/inventario/materia_prima.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
require_role(['admin', 'gerente_tienda', 'encargado_taller']);

$pdo = getDB();

// Seeding automático (silencioso - no debe bloquear el endpoint)
try {
    // Asegurar que la columna 'color' existe en la tabla 'materiales'
    try {
        $pdo->query("SELECT color FROM materiales LIMIT 1");
    } catch (PDOException $e) {
        $pdo->exec("ALTER TABLE materiales ADD COLUMN color VARCHAR(7) NULL DEFAULT '#cccccc'");
    }

    // Obtener un creador válido
    $creado_por = $pdo->query("SELECT id FROM usuarios LIMIT 1")->fetchColumn() ?: 1;

    // Obtener un proveedor_id válido
    $prov_id = $pdo->query("SELECT id FROM proveedores LIMIT 1")->fetchColumn();
    if (!$prov_id) {
        try {
            $stmtProv = $pdo->prepare("INSERT INTO proveedores (nombre, rfc, contacto_nombre, tipo, creado_por) VALUES ('Proveedor General', 'XAXX010101000', 'Sistema', 'materia_prima', ?)");
            $stmtProv->execute([$creado_por]);
            $prov_id = $pdo->lastInsertId();
        } catch (PDOException $e) {
            // Si ya existe por RFC duplicado, obtener su ID
            $prov_id = $pdo->query("SELECT id FROM proveedores WHERE rfc = 'XAXX010101000' LIMIT 1")->fetchColumn() ?: 1;
        }
    }

    // Semilla de materias primas
    $maderas = [
        ['nombre' => 'Pino', 'unidad' => 'pacas', 'cantidad' => 14.0, 'minimo' => 5.0, 'color' => '#d4a574'],
        ['nombre' => 'Encino', 'unidad' => 'pacas', 'cantidad' => 8.0, 'minimo' => 3.0, 'color' => '#8b6914'],
        ['nombre' => 'Alder', 'unidad' => 'pacas', 'cantidad' => 3.0, 'minimo' => 4.0, 'color' => '#c4956a'],
        ['nombre' => 'Mezquite', 'unidad' => 'pacas', 'cantidad' => 6.0, 'minimo' => 2.0, 'color' => '#6b3a2a'],
        ['nombre' => 'Madera Reciclada', 'unidad' => 'pacas', 'cantidad' => 10.0, 'minimo' => 3.0, 'color' => '#9e8c7a'],
        ['nombre' => 'Madera Fashion', 'unidad' => 'pacas', 'cantidad' => 4.0, 'minimo' => 2.0, 'color' => '#a0522d'],
        ['nombre' => 'Triplay', 'unidad' => 'hojas', 'cantidad' => 15.0, 'minimo' => 5.0, 'color' => '#deb887']
    ];

    foreach ($maderas as $mad) {
        $stmt = $pdo->prepare("SELECT id FROM materiales WHERE nombre = ? LIMIT 1");
        $stmt->execute([$mad['nombre']]);
        if (!$stmt->fetchColumn()) {
            $stmtIns = $pdo->prepare("
                INSERT INTO materiales (nombre, tipo, unidad_medida, proveedor_id, stock_actual, stock_minimo, color, creado_por)
                VALUES (?, 'madera', ?, ?, ?, ?, ?, ?)
            ");
            $stmtIns->execute([$mad['nombre'], $mad['unidad'], $prov_id, $mad['cantidad'], $mad['minimo'], $mad['color'], $creado_por]);
        }
    }
} catch (Exception $e) {
    // Seeding failures are non-fatal — log and continue
    error_log('materia_prima seeding warning: ' . $e->getMessage());
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, nombre, unidad_medida AS unidad, stock_actual AS cantidad, stock_minimo AS minimo, color FROM materiales WHERE tipo = 'madera' AND activo = 1");
        json_ok($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        json_error('Error al obtener materia prima: ' . $e->getMessage(), 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_body();
    $items = $data['items'] ?? [];
    $user = current_user();

    if (empty($items)) {
        json_error('No se enviaron items para actualizar', 422);
    }

    try {
        $pdo->beginTransaction();

        foreach ($items as $it) {
            $id = (int)$it['id'];
            $new_cant = (float)$it['cantidad'];
            $new_min = (float)$it['minimo'];

            // Obtener stock actual
            $stmtCurr = $pdo->prepare("SELECT stock_actual, stock_minimo FROM materiales WHERE id = ? FOR UPDATE");
            $stmtCurr->execute([$id]);
            $curr = $stmtCurr->fetch(PDO::FETCH_ASSOC);

            if (!$curr) continue;

            $old_cant = (float)$curr['stock_actual'];
            $delta = $new_cant - $old_cant;

            // Actualizar stock mínimo directamente
            if ($new_min !== (float)$curr['stock_minimo']) {
                $stmtMin = $pdo->prepare("UPDATE materiales SET stock_minimo = ? WHERE id = ?");
                $stmtMin->execute([$new_min, $id]);
            }

            // Si hay cambio de stock, registrar movimiento de ajuste
            if (abs($delta) > 0.001) {
                $stmtMov = $pdo->prepare("
                    INSERT INTO movimientos_inventario_taller (material_id, tipo_movimiento, cantidad, referencia_tipo, usuario_id, notas)
                    VALUES (?, 'ajuste', ?, 'ajuste_manual', ?, 'Ajuste de inventario desde panel')
                ");
                $stmtMov->execute([$id, $delta, $user['id']]);
            }
        }

        $pdo->commit();
        json_ok(['mensaje' => 'Inventario de materia prima actualizado correctamente']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Error al guardar inventario: ' . $e->getMessage(), 500);
    }
}
