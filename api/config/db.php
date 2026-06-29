<?php
// api/config/db.php
// Ajusta estos valores con los de tu instalación de Laragon

define('DB_HOST', 'localhost');
define('DB_NAME', 'decor_muebleria');
define('DB_USER', 'root');
define('DB_PASS', ''); // Laragon por defecto tiene contraseña vacía
define('DB_CHARSET', 'utf8mb4');

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
