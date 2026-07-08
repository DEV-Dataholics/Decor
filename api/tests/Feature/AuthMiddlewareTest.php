<?php
// api/tests/Feature/AuthMiddlewareTest.php
// Ejecutar con Pest (vendor/bin/pest)

it('verifica que las variables de entorno se carguen correctamente', function () {
    // Simulamos la verificación de las variables .env que usa db.php
    // El frontend está en decor.dataholics.com.mx
    // El API asume un .env_decor.php en los niveles superiores
    $env_paths = [
        dirname(__DIR__, 3) . '/.env_decor.php',
        dirname(__DIR__, 4) . '/.env_decor.php',
        '/home1/noodluis/.env_decor.php'
    ];
    
    $env_exists = false;
    foreach ($env_paths as $path) {
        if (file_exists($path)) {
            $env_exists = true;
            break;
        }
    }
    
    // Si estás en producción, DEBE existir
    // Si falla, significa que public_html/decor/ no está alcanzando el .env
    expect($env_exists)->toBeTrue('El archivo .env_decor.php no se encontró en las rutas esperadas.');
});

it('rechaza peticiones a me.php con código 401 si no hay sesión/cookie activa', function () {
    // Hacemos una petición sin enviar cookies (sin PHPSESSID)
    // Se asume el uso de un cliente HTTP de pruebas (como el de Laravel o un Guzzle mock)
    // Para simplificar, usaremos la lógica nativa del response:
    
    // Aquí puedes usar un TestResponse de Pest si estás en Laravel,
    // o hacer un cURL interno a tu propia API:
    $apiUrl = 'https://dataholics.com.mx/api/auth/me.php';
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // No adjuntamos cookies intencionalmente
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    expect($httpCode)->toBe(401);
    
    $json = json_decode($response, true);
    expect($json)->toMatchArray([
        'ok' => false,
        'error' => 'No autenticado'
    ]);
});
