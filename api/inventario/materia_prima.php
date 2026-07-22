<?php
// api/inventario/materia_prima.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';

set_json_headers();
$pdo = getDB();

// Seeding automático (silencioso - no debe bloquear el endpoint)
try {
    // 1. Asegurar que la columna 'color' existe en la tabla 'materiales'
    try {
        $pdo->query("SELECT color FROM materiales LIMIT 1");
    } catch (PDOException $e) {
        $pdo->exec("ALTER TABLE materiales ADD COLUMN color VARCHAR(7) NULL DEFAULT '#cccccc'");
    }

    // 2. Crear tabla de unidades_medida si no existe
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `unidades_medida` (
          `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
          `nombre` varchar(30) NOT NULL,
          `permite_decimales` tinyint(1) NOT NULL DEFAULT '0',
          PRIMARY KEY (`id`),
          UNIQUE KEY `idx_nombre` (`nombre`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 3. Semilla de unidades de medida
    $uoms = [
        ['nombre' => 'pacas', 'permite_decimales' => 1],
        ['nombre' => 'hojas', 'permite_decimales' => 0],
        ['nombre' => 'cajas', 'permite_decimales' => 0],
        ['nombre' => 'galones', 'permite_decimales' => 1],
        ['nombre' => 'piezas', 'permite_decimales' => 0],
        ['nombre' => 'kilogramos', 'permite_decimales' => 1]
    ];
    $stmtUomIns = $pdo->prepare("INSERT IGNORE INTO unidades_medida (nombre, permite_decimales) VALUES (?, ?)");
    foreach ($uoms as $u) {
        $stmtUomIns->execute([$u['nombre'], $u['permite_decimales']]);
    }

    // 4. Asegurar que la columna 'unidad_medida_id' existe en 'materiales'
    try {
        $pdo->query("SELECT unidad_medida_id FROM materiales LIMIT 1");
    } catch (PDOException $e) {
        $pdo->exec("ALTER TABLE materiales ADD COLUMN unidad_medida_id INT(10) UNSIGNED NULL");
        try {
            $pdo->exec("ALTER TABLE materiales ADD CONSTRAINT fk_materiales_uom FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL");
        } catch (PDOException $ex) {}
    }

    // 5. Vincular unidades de medida existentes por nombre
    $pdo->exec("
        UPDATE materiales m 
        JOIN unidades_medida u ON m.unidad_medida = u.nombre 
        SET m.unidad_medida_id = u.id 
        WHERE m.unidad_medida_id IS NULL
    ");

    // 6. Obtener un creador válido
    $creado_por = $pdo->query("SELECT id FROM usuarios LIMIT 1")->fetchColumn() ?: 1;

    // 7. Obtener un proveedor_id válido
    $prov_id = $pdo->query("SELECT id FROM proveedores LIMIT 1")->fetchColumn();
    if (!$prov_id) {
        try {
            $stmtProv = $pdo->prepare("INSERT INTO proveedores (nombre, rfc, contacto_nombre, tipo, creado_por) VALUES ('Proveedor General', 'XAXX010101000', 'Sistema', 'materia_prima', ?)");
            $stmtProv->execute([$creado_por]);
            $prov_id = $pdo->lastInsertId();
        } catch (PDOException $e) {
            $prov_id = $pdo->query("SELECT id FROM proveedores WHERE rfc = 'XAXX010101000' LIMIT 1")->fetchColumn() ?: 1;
        }
    }

    // 8. Semilla de materias primas ampliada
    $materias_primas = [
        ['nombre' => 'Pino', 'unidad' => 'pacas', 'cantidad' => 14.0, 'minimo' => 5.0, 'color' => '#d4a574', 'tipo' => 'madera'],
        ['nombre' => 'Encino', 'unidad' => 'pacas', 'cantidad' => 8.0, 'minimo' => 3.0, 'color' => '#8b6914', 'tipo' => 'madera'],
        ['nombre' => 'Alder', 'unidad' => 'pacas', 'cantidad' => 3.0, 'minimo' => 4.0, 'color' => '#c4956a', 'tipo' => 'madera'],
        ['nombre' => 'Mezquite', 'unidad' => 'pacas', 'cantidad' => 6.0, 'minimo' => 2.0, 'color' => '#6b3a2a', 'tipo' => 'madera'],
        ['nombre' => 'Madera Reciclada', 'unidad' => 'pacas', 'cantidad' => 10.0, 'minimo' => 3.0, 'color' => '#9e8c7a', 'tipo' => 'madera'],
        ['nombre' => 'Madera Fashion', 'unidad' => 'pacas', 'cantidad' => 4.0, 'minimo' => 2.0, 'color' => '#a0522d', 'tipo' => 'madera'],
        ['nombre' => 'Triplay', 'unidad' => 'hojas', 'cantidad' => 15.0, 'minimo' => 5.0, 'color' => '#deb887', 'tipo' => 'madera'],
        ['nombre' => 'Clavos', 'unidad' => 'cajas', 'cantidad' => 20.0, 'minimo' => 5.0, 'color' => '#718096', 'tipo' => 'insumo'],
        ['nombre' => 'Tornillos', 'unidad' => 'cajas', 'cantidad' => 15.0, 'minimo' => 4.0, 'color' => '#a0aec0', 'tipo' => 'insumo'],
        ['nombre' => 'Pintura', 'unidad' => 'galones', 'cantidad' => 30.0, 'minimo' => 10.0, 'color' => '#e53e3e', 'tipo' => 'quimico']
    ];

    foreach ($materias_primas as $mp) {
        $stmt = $pdo->prepare("SELECT id FROM materiales WHERE nombre = ? LIMIT 1");
        $stmt->execute([$mp['nombre']]);
        if (!$stmt->fetchColumn()) {
            $uom_id = $pdo->prepare("SELECT id FROM unidades_medida WHERE nombre = ? LIMIT 1");
            $uom_id->execute([$mp['unidad']]);
            $uidVal = $uom_id->fetchColumn() ?: null;

            $stmtIns = $pdo->prepare("
                INSERT INTO materiales (nombre, tipo, unidad_medida, unidad_medida_id, proveedor_id, stock_actual, stock_minimo, color, creado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtIns->execute([$mp['nombre'], $mp['tipo'], $mp['unidad'], $uidVal, $prov_id, $mp['cantidad'], $mp['minimo'], $mp['color'], $creado_por]);
        }
    }
} catch (Exception $e) {
    error_log('materia_prima seeding warning: ' . $e->getMessage());
}

require_role(['admin', 'gerente_tienda', 'encargado_taller']);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "
            SELECT m.id, m.nombre, m.tipo, m.unidad_medida AS unidad, 
                   m.stock_actual AS cantidad, m.stock_minimo AS minimo, m.color,
                   CAST(COALESCE(u.permite_decimales, 1) AS UNSIGNED) AS permite_decimales
            FROM materiales m
            LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
            WHERE m.tipo IN ('madera', 'quimico', 'insumo') AND m.activo = 1
        ";
        $stmt = $pdo->query($sql);
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

            // Obtener stock actual y reglas de validacion
            $stmtCurr = $pdo->prepare("
                SELECT m.stock_actual, m.stock_minimo, COALESCE(u.permite_decimales, 1) AS permite_decimales
                FROM materiales m
                LEFT JOIN unidades_medida u ON m.unidad_medida_id = u.id
                WHERE m.id = ? FOR UPDATE
            ");
            $stmtCurr->execute([$id]);
            $curr = $stmtCurr->fetch(PDO::FETCH_ASSOC);

            if (!$curr) continue;

            // Si la unidad no permite decimales, redondear estrictamente a enteros
            if ((int)$curr['permite_decimales'] === 0) {
                $new_cant = round($new_cant);
                $new_min = round($new_min);
            }

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
