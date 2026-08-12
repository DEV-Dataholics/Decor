<?php
// api/config/db.php
// Configuración de conexión a la base de datos.
// En producción: carga credenciales desde .env_decor.php (fuera de public_html).
// En desarrollo (Laragon): usa defaults locales.

// ── Cargar credenciales ─────────────────────────────────────
$env_paths = [
    dirname(__DIR__, 3) . '/.env_decor.php', // /home1/noodluis/.env_decor.php (Estructura actual)
    dirname(__DIR__, 4) . '/.env_decor.php', // Por si estuviera dentro de public_html/decor/
    '/home1/noodluis/.env_decor.php',        // Hardcode directo a tu ruta exacta
    '/home/noodluis/.env_decor.php'          // Alternativa
];

$env_loaded = false;
foreach ($env_paths as $env_file) {
    if (file_exists($env_file)) {
        require_once $env_file;
        $env_loaded = true;
        break;
    }
}

// Si no se encontró archivo .env, usar defaults de Laragon (desarrollo local)
if (!$env_loaded) {
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'decor_muebleria');
    define('DB_USER', 'root');
    define('DB_PASS', ''); // Laragon por defecto tiene contraseña vacía
    define('DB_CHARSET', 'utf8mb4');
    define('APP_ENV', 'development');
    define('APP_URL', 'http://localhost:5173');
}

// ── Configuración de sesión segura (producción) ─────────
if (session_status() === PHP_SESSION_NONE) {
    if (defined('APP_ENV') && APP_ENV === 'production') {
        ini_set('session.cookie_secure', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Lax');
        ini_set('session.use_strict_mode', '1');
        
        // Corregir directorio de sesiones roto en cPanel
        $session_dir = dirname(__DIR__, 2) . '/tmp/sessions';
        if (!is_dir($session_dir)) {
            @mkdir($session_dir, 0700, true);
        }
        if (is_dir($session_dir) && is_writable($session_dir)) {
            session_save_path($session_dir);
        }
    }
    if (defined('SESSION_NAME') && constant('SESSION_NAME')) {
        session_name(constant('SESSION_NAME'));
    }
    @session_start();
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => true,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}
