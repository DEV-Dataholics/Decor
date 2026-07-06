# Contrato de API (JSON Contract) - Decor Mueblería

Este documento define la estructura y el comportamiento esperado para la API de backend que se desarrollará en producción para el sistema Decor Mueblería. El frontend actual (en la carpeta `demo_reference`) está configurado para consumir estas rutas bajo esta estructura.

## 1. Estructura Estándar de Respuesta (JSON)

Toda respuesta de la API, sin importar el endpoint, **debe** seguir esta estructura. El frontend asume que `ok` indica si la petición fue exitosa o no.

### Respuestas Exitosas (HTTP 2xx)
```json
{
  "ok": true,
  "data": { ... } // Objeto o Arreglo con los datos solicitados
}
```
*Nota: Si es una inserción, se recomienda incluir el ID del nuevo registro en `data` o propiedades adicionales (ej. `"orden_id": 123`).*

### Respuestas de Error (HTTP 4xx, 5xx)
```json
{
  "ok": false,
  "error": "Mensaje descriptivo del error"
}
```

---

## 2. Autenticación y Seguridad

- **Mecanismo:** El sistema actualmente asume autenticación por sesión/cookies. Para producción, puedes usar JWT (Bearer Token) o mantener Sesiones, siempre y cuando el backend proteja las rutas.
- **Roles:** El sistema maneja varios roles (ej. `admin`, `gerente_tienda`, `encargado_taller`, `cajero`). Las rutas protegidas deben verificar si el rol tiene permiso.
- Si no está autenticado, debe devolver HTTP 401. Si no tiene permisos, HTTP 403.

---

## 3. Endpoints Principales (Referencia)

A continuación se listan ejemplos de los endpoints clave que el frontend consume. Para ver la lista exhaustiva, revisa las llamadas fetch/axios en `demo_reference/front/`.

### 3.1. Autenticación
#### POST `/api/auth/login.php`
- **Payload:**
```json
{
  "email": "admin@decor.com",
  "password": "password"
}
```
- **Response Exitoso:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "nombre": "Sergio",
    "rol": "admin",
    "tienda_id": 1
  }
}
```

### 3.2. Catálogo (Productos, Categorías, Acabados)
#### GET `/api/productos/list.php`
- **Descripción:** Obtiene la lista de todos los productos activos.
- **Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "sku": "PROD-001",
      "nombre": "Silla Comedor",
      "precio_base": 1200.00,
      "categoria_nombre": "Sillas"
    }
  ]
}
```

### 3.3. Órdenes (Venta)
#### POST `/api/ordenes/save.php`
- **Descripción:** Crea una nueva orden vinculada a un cliente.
- **Payload:**
```json
{
  "cliente_id": 5,
  "tienda_id": 1,
  "fecha_entrega_estimada": "2026-07-01",
  "items": [
    {
      "producto_id": 1,
      "acabado_id": 2,
      "cantidad": 4,
      "precio_unitario": 1200.00,
      "especificaciones_custom": { "tela": "Terciopelo azul" }
    }
  ]
}
```
- **Response Exitoso:**
```json
{
  "ok": true,
  "data": {
    "orden_id": 45,
    "total": 4800.00
  }
}
```

### 3.4. Inventario / Taller
#### POST `/api/taller/movimiento.php`
- **Descripción:** Registra una entrada o salida de insumos en el taller.
- **Payload:**
```json
{
  "material_id": 10,
  "tipo_movimiento": "entrada",
  "cantidad": 50,
  "motivo": "Compra a proveedor"
}
```
- **Response:**
```json
{
  "ok": true,
  "data": {
    "mensaje": "Movimiento registrado",
    "stock_actual": 150
  }
}
```

---

## 4. Estructura de Base de Datos
La carpeta `db_schema/` adjunta contiene los scripts SQL ordenados (`00_base.sql`, `01_catalogo.sql`, etc.). Asegúrate de ejecutarlos en orden para comprender las relaciones de las llaves foráneas. Las vistas y procedimientos almacenados (triggers) manejan la actualización del stock.
