<?php
// api/tests/Feature/CorsTest.php
// Ejecutar con Pest (vendor/bin/pest)

it('responde a peticiones preflight (OPTIONS) con headers CORS estrictos para decor.dataholics.com.mx', function () {
    // El front vive en este subdominio
    $allowedOrigin = 'https://decor.dataholics.com.mx';
    $apiUrl = 'https://dataholics.com.mx/api/auth/me.php';
    
    // Simulamos una petición preflight enviando el verbo OPTIONS
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'OPTIONS');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); // Queremos leer los headers
    curl_setopt($ch, CURLOPT_NOBODY, true); // No body
    
    // Inyectamos el origen simulando ser el navegador visitando decor.dataholics.com.mx
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Origin: $allowedOrigin",
        "Access-Control-Request-Method: GET",
        "Access-Control-Request-Headers: Content-Type"
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Dependiendo de tu API, OPTIONS puede devolver 200 o 204
    expect(in_array($httpCode, [200, 204]))->toBeTrue();
    
    // Extraemos los headers para verificar las reglas de seguridad
    $headers = strtolower($response);
    
    // 1. Debe permitir el origen del subdominio explícitamente
    expect($headers)->toContain('access-control-allow-origin: ' . $allowedOrigin);
    
    // 2. Para usar $_SESSION cruzado (cookies), Allow-Credentials debe ser true
    expect($headers)->toContain('access-control-allow-credentials: true');
    
    // 3. NUNCA debe devolver un wildcard '*' si Allow-Credentials es true (W3C Standard)
    expect($headers)->not->toContain('access-control-allow-origin: *');
});
