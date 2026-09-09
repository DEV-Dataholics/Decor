<?php
// api/admin/logs.php
// Endpoint protegido exclusivo para consulta y gestión de logs por el perfil 'admin'.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/logger.php';

set_json_headers();

// ── Seguridad: Acceso EXCLUSIVO para rol 'admin' ───────────
require_role(['admin']);

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── Manejo de Purga (DELETE o POST con action=purgar) ────────
if ($method === 'DELETE' || ($method === 'POST' && (get_body()['action'] ?? '') === 'purgar')) {
    $body = get_body();
    $dias = (int)($body['dias'] ?? $_GET['dias'] ?? 60);

    if ($dias < 7) {
        json_error('El periodo mínimo de retención es de 7 días', 422);
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM logs_sistema WHERE creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)");
        $stmt->execute([$dias]);
        $afectados = $stmt->rowCount();

        log_activity(
            'SISTEMA',
            'PURGA_LOGS',
            "Se depuraron $afectados registros de logs con antigüedad mayor a $dias días",
            ['dias' => $dias, 'registros_eliminados' => $afectados],
            'WARNING'
        );

        json_ok([
            'mensaje' => "Se eliminaron $afectados registros con éxito",
            'registros_eliminados' => $afectados
        ]);
    } catch (Throwable $e) {
        json_error('Error al purgar logs: ' . $e->getMessage(), 500);
    }
}

// ── Consulta de Logs (GET) ──────────────────────────────────
if ($method === 'GET') {
    $page        = max(1, (int)($_GET['page'] ?? 1));
    $limit       = min(200, max(10, (int)($_GET['limit'] ?? 50)));
    $offset      = ($page - 1) * $limit;
    $nivel       = trim($_GET['nivel'] ?? '');
    $modulo      = trim($_GET['modulo'] ?? '');
    $fechaInicio = trim($_GET['fecha_inicio'] ?? '');
    $fechaFin    = trim($_GET['fecha_fin'] ?? '');
    $search      = trim($_GET['search'] ?? '');
    $format      = trim($_GET['format'] ?? 'json');

    $where   = [];
    $params  = [];

    if ($nivel !== '' && $nivel !== 'TODOS') {
        $where[]  = 'nivel = ?';
        $params[] = strtoupper($nivel);
    }

    if ($modulo !== '' && $modulo !== 'TODOS') {
        $where[]  = 'modulo = ?';
        $params[] = strtoupper($modulo);
    }

    if ($fechaInicio !== '') {
        $where[]  = 'creado_en >= ?';
        $params[] = $fechaInicio . ' 00:00:00';
    }

    if ($fechaFin !== '') {
        $where[]  = 'creado_en <= ?';
        $params[] = $fechaFin . ' 23:59:59';
    }

    if ($search !== '') {
        $where[]  = '(descripcion LIKE ? OR accion LIKE ? OR usuario_nombre LIKE ? OR usuario_email LIKE ?)';
        $term     = '%' . $search . '%';
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    try {
        // Conteo total para paginación
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM logs_sistema $whereSql");
        $countStmt->execute($params);
        $totalItems = (int)$countStmt->fetchColumn();

        // Si se pide exportar en CSV
        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="logs_sistema_' . date('Y-m-d_His') . '.csv"');
            
            $out = fopen('php://output', 'w');
            // BOM UTF-8 para Excel
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, ['ID', 'Fecha y Hora', 'Nivel', 'Módulo', 'Acción', 'Descripción', 'Usuario', 'Email', 'Rol', 'IP']);

            $csvStmt = $pdo->prepare("SELECT * FROM logs_sistema $whereSql ORDER BY creado_en DESC LIMIT 5000");
            $csvStmt->execute($params);

            while ($row = $csvStmt->fetch()) {
                fputcsv($out, [
                    $row['id'],
                    $row['creado_en'],
                    $row['nivel'],
                    $row['modulo'],
                    $row['accion'],
                    $row['descripcion'],
                    $row['usuario_nombre'],
                    $row['usuario_email'],
                    $row['usuario_rol'],
                    $row['ip_origen']
                ]);
            }
            fclose($out);
            exit;
        }

        // Consulta de registros paginados
        $dataStmt = $pdo->prepare("SELECT * FROM logs_sistema $whereSql ORDER BY creado_en DESC LIMIT $limit OFFSET $offset");
        $dataStmt->execute($params);
        $logs = $dataStmt->fetchAll();

        // Deserializar JSON de detalles
        foreach ($logs as &$item) {
            if (!empty($item['detalles'])) {
                $decoded = json_decode($item['detalles'], true);
                $item['detalles'] = $decoded !== null ? $decoded : $item['detalles'];
            } else {
                $item['detalles'] = null;
            }
        }

        // Estadísticas rápidas de hoy para el panel
        $statsStmt = $pdo->query("
            SELECT 
                COUNT(*) as total_hoy,
                SUM(CASE WHEN nivel IN ('ERROR', 'CRITICAL') THEN 1 ELSE 0 END) as errores_hoy,
                SUM(CASE WHEN nivel = 'WARNING' THEN 1 ELSE 0 END) as warnings_hoy,
                SUM(CASE WHEN nivel = 'INFO' THEN 1 ELSE 0 END) as info_hoy
            FROM logs_sistema 
            WHERE DATE(creado_en) = CURDATE()
        ");
        $stats = $statsStmt->fetch() ?: [
            'total_hoy' => 0,
            'errores_hoy' => 0,
            'warnings_hoy' => 0,
            'info_hoy' => 0
        ];

        json_ok([
            'logs'         => $logs,
            'paginacion'   => [
                'total'         => $totalItems,
                'pagina'        => $page,
                'limite'        => $limit,
                'total_paginas' => (int)ceil($totalItems / $limit) ?: 1
            ],
            'estadisticas' => [
                'total_hoy'    => (int)($stats['total_hoy'] ?? 0),
                'errores_hoy'  => (int)($stats['errores_hoy'] ?? 0),
                'warnings_hoy' => (int)($stats['warnings_hoy'] ?? 0),
                'info_hoy'     => (int)($stats['info_hoy'] ?? 0),
            ]
        ]);

    } catch (Throwable $e) {
        json_error('Error al consultar logs: ' . $e->getMessage(), 500);
    }
}

json_error('Método no permitido', 405);
