<?php
// api/config/logger.php
// Centralized, bulletproof logging service for Decor ERP.
// Guarantees FAIL-SAFE execution: logging errors will NEVER interrupt business operations.

require_once __DIR__ . '/db.php';

if (!function_exists('log_activity')) {
    /**
     * Records an operational activity log.
     *
     * @param string $modulo      e.g. 'AUTH', 'POS', 'PEDIDOS', 'PRODUCCION', 'INVENTARIO', 'CATALOGO', 'SISTEMA'
     * @param string $accion      e.g. 'LOGIN_EXITOSO', 'CORTE_Z', 'CHECKOUT_VENTA', 'AJUSTE_STOCK'
     * @param string|null $desc   Human-readable summary of the action
     * @param array|null $detalles Structured context data (will be saved as JSON)
     * @param string $nivel       'INFO', 'WARNING', 'ERROR', 'CRITICAL'
     * @param array|null $userOverride Optional explicit user array ['id', 'nombre', 'email', 'rol']
     * @return bool True if logged successfully, false if failed (without throwing)
     */
    function log_activity(
        string $modulo,
        string $accion,
        ?string $desc = null,
        ?array $detalles = null,
        string $nivel = 'INFO',
        ?array $userOverride = null
    ): bool {
        try {
            $user = $userOverride ?? ($_SESSION['user'] ?? null);
            $userId = isset($user['id']) ? (int)$user['id'] : null;
            $userNombre = $user['nombre'] ?? null;
            $userEmail = $user['email'] ?? null;
            $userRol = $user['rol'] ?? null;

            // Detect real client IP behind proxies / Cloudflare
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
                ?? $_SERVER['HTTP_X_FORWARDED_FOR']
                ?? $_SERVER['REMOTE_ADDR']
                ?? null;

            if ($ip && strpos($ip, ',') !== false) {
                $parts = explode(',', $ip);
                $ip = trim($parts[0]);
            }

            $detallesJson = $detalles ? json_encode($detalles, JSON_UNESCAPED_UNICODE) : null;

            $pdo = getDB();
            $stmt = $pdo->prepare('
                INSERT INTO logs_sistema (
                    nivel, modulo, accion, descripcion, detalles,
                    usuario_id, usuario_nombre, usuario_email, usuario_rol, ip_origen
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');

            return $stmt->execute([
                strtoupper($nivel),
                strtoupper($modulo),
                strtoupper($accion),
                $desc,
                $detallesJson,
                $userId,
                $userNombre,
                $userEmail,
                $userRol,
                $ip
            ]);
        } catch (Throwable $t) {
            // Under NO circumstance does logging crash the main transaction
            error_log('[DECOR_LOG_ERROR] Could not write to logs_sistema: ' . $t->getMessage());
            return false;
        }
    }
}

if (!function_exists('log_system_error')) {
    /**
     * Records a system error / exception into logs_sistema safely.
     *
     * @param string $modulo
     * @param string $accion
     * @param Throwable|string $error
     * @param array|null $contexto
     * @return bool
     */
    function log_system_error(
        string $modulo,
        string $accion,
        $error,
        ?array $contexto = null
    ): bool {
        $desc = is_string($error) ? $error : $error->getMessage();
        $detalles = $contexto ?? [];

        if ($error instanceof Throwable) {
            $detalles['exception'] = get_class($error);
            $detalles['file'] = $error->getFile();
            $detalles['line'] = $error->getLine();
            $detalles['code'] = $error->getCode();
            $detalles['trace'] = array_slice(explode("
", $error->getTraceAsString()), 0, 8);
        }

        return log_activity($modulo, $accion, $desc, $detalles, 'ERROR');
    }
}
