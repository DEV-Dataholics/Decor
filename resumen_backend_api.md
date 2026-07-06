# Resumen de Lógica API y JSON para Backend

Este documento es una guía rápida para el desarrollador backend sobre cómo está estructurada la lógica de la API, el formato JSON esperado para el demo, y la estructura de la base de datos necesaria para llevar el sistema a producción.

---

## 1. Formato Estándar de Respuestas JSON

Para estandarizar las peticiones y hacer que el frontend consuma la API de forma predecible, utilizamos un formato estándar para las respuestas JSON.

### Respuestas Exitosas (HTTP 200)
Toda respuesta exitosa debe devolver un JSON con la propiedad `ok: true` y una propiedad `data` (o en su defecto `items` en endpoints no migrados) con los datos solicitados:

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "nombre": "Ejemplo"
  }
}
```

### Respuestas de Error (HTTP 400, 401, 403, etc.)
Toda respuesta de error debe devolver `ok: false` y un mensaje descriptivo en `error`:

```json
{
  "ok": false,
  "error": "El usuario no tiene permisos para esta acción."
}
```

---

## 2. Helpers de Respuesta (`api/config/response.php`)

Para facilitar el envío de respuestas JSON y el manejo de CORS, el proyecto cuenta con el archivo `api/config/response.php` que contiene funciones helper. **Se recomienda encarecidamente utilizar estas funciones** en lugar de hacer `echo json_encode()` manualmente.

*   `json_ok($data, $code = 200)`: Envía una respuesta exitosa y termina la ejecución.
*   `json_error($message, $code = 400)`: Envía una respuesta de error y termina la ejecución.
*   `set_json_headers()`: Configura automáticamente los headers de CORS y `Content-Type: application/json`. Es llamada por los helpers anteriores.
*   `get_body()`: Helper para obtener el cuerpo de peticiones POST/PUT: `json_decode(file_get_contents('php://input'), true)`.

> **Nota de Transición:** Actualmente, muchos endpoints en las carpetas de módulos (ej. `acabados`, `compras`, `ordenes`) siguen utilizando `echo json_encode(['ok'=>true, 'items'=>...])` manualmente. El objetivo para producción es migrar todos estos endpoints para que utilicen los helpers de `response.php`.

---

## 3. Autenticación y Roles

La API utiliza variables de sesión nativas de PHP (`$_SESSION['user']`) para manejar la autenticación. 

*   El archivo `response.php` provee el helper `require_role(['admin', 'vendedor'])`.
*   Al llamar `require_role()`, la función verifica si el usuario está logueado y si su rol coincide. Si no, devuelve automáticamente un error 401 o 403 en formato JSON.
*   **Modo Desarrollo:** En entorno local (`localhost`), `require_role()` realiza un auto-login temporal como administrador para facilitar las pruebas del frontend. Esto debe revisarse al pasar a producción.

---

## 4. Estructura de Tablas para Producción

Para desplegar las APIs, es necesario montar la estructura de base de datos detallada en los scripts SQL ubicados en la carpeta `db/`. La lógica de la base de datos se divide en los siguientes módulos:

1.  **`00_base.sql`**: Configuración inicial, creación de la BD, tabla de `usuarios` (roles y tiendas).
2.  **`01_catalogo.sql`**: Catálogos base: `categorias`, `proveedores`, `acabados`, `productos`, `clientes`.
3.  **`02_ordenes.sql`**: Tablas de negocio: `tiendas`, `cotizaciones`, `ordenes`, y sus ítems (relacionados a clientes y productos).
4.  **`03_produccion.sql`**: Control interno: `empleados`, `lista_precios_mano_obra`, `semanas_nomina`, `work_orders` y tareas.
5.  **`04_inventario_taller.sql`**: Stock de insumos: `materiales`, `movimientos_inventario_taller` y triggers para actualizar el `stock_actual` automáticamente.
6.  **`05_tienda_pos.sql`**: Punto de venta: `inventario_tienda`, `compras_externas`, `cajas`, `ventas` y `pagos_venta`.
7.  **`06_logistica.sql`**: Envíos: `rutas`, `embarques`, `embarque_items`.

### Principio Fundamental de Diseño
La base de datos está diseñada bajo la premisa **"Captura una vez, úsalo en muchos lugares"**:
*   Un `cliente` se crea una vez y se liga a múltiples `cotizaciones`, `ordenes` y `ventas_tienda`.
*   Un `producto` se captura una vez y fluye por el inventario, los ítems de órdenes, ventas y embarques.
*   Los inventarios (taller y tienda) se actualizan exclusivamente a través de tablas de *movimientos*, mediante triggers SQL (evitar hacer UPDATE directos al campo `stock`).

---

## Ejemplo de Endpoint Recomendado (Usando Helpers)

```php
<?php
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/db.php'; // Supuesta conexión PDO

// 1. Validar sesión/roles
require_role(['admin', 'gerente']);

// 2. Procesar solicitud
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT id, nombre FROM categorias WHERE activo = 1");
    $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Responder con JSON estandarizado
    json_ok($categorias);
} else {
    // Manejo de error
    json_error('Método no soportado', 405);
}
```
