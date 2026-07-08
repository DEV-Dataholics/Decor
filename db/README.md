# Base de Datos — Decor Mueblería

## Instalación desde cero

Ejecuta los scripts **en orden** en phpMyAdmin (Laragon local o cPanel en producción):

### Paso 1: Esquema (estructura de tablas)

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `00_base.sql` | Crea la BD `decor_muebleria` y la tabla `usuarios` con admin inicial |
| 2 | `01_catalogo.sql` | Categorías, proveedores, acabados, productos, clientes |
| 3 | `02_ordenes.sql` | Tiendas, cotizaciones, órdenes, ítems de orden |
| 4 | `03_produccion.sql` | Empleados, lista de precios, semanas nómina, work_orders |
| 5 | `04_inventario_taller.sql` | Materiales, movimientos y alertas de stock (con triggers) |
| 6 | `05_tienda_pos.sql` | Inventario tienda, compras externas, cajas, ventas, pagos |
| 7 | `06_logistica.sql` | Embarques, ítems de embarque y devoluciones |

### Paso 2: Datos iniciales (semilla básica)

| Orden | Archivo | Contenido |
|---|---|---|
| 8 | `07_semilla.sql` | Acabados estándar (8 acabados: Natural, Alder #2, Santa Fe, etc.) |

### Paso 3: Catálogo de producción (datos reales)

| Orden | Archivo | Contenido |
|---|---|---|
| 9 | `seed_completo.sql` | **Catálogo completo:** 736 productos (SKU `DCR-XXXX`), 5 clientes, 3 tiendas, 8 empleados y relaciones producto↔acabados |

> **⚠️ IMPORTANTE:** `seed_completo.sql` hace `DELETE` de productos, clientes, empleados y tiendas antes de insertar. Ejecútalo solo en instalación limpia o cuando quieras reiniciar los datos maestros.

### Paso opcional: Datos POS de prueba

| Orden | Archivo | Contenido |
|---|---|---|
| 10 | `08_semilla_pos.sql` | 6 productos de prueba POS, 6 materiales del taller, inventario inicial. **Solo para entorno de desarrollo/demo.** |

---

> **Credenciales del admin inicial:**  
> **Email:** `admin@decor.mx`  
> **Contraseña:** `password` (hash bcrypt)  
> **IMPORTANTE:** Cámbiala inmediatamente en producción.

---

## Script de Mantenimiento

| Archivo | Uso |
|---|---|
| `truncate_operaciones.sql` | **⚠️ CUIDADO:** Limpia TODAS las tablas operativas (órdenes, ventas, embarques, etc.) sin borrar catálogos ni usuarios. Útil para "reiniciar" el sistema después de pruebas |

---

## Principio de Diseño: "Captura una vez, úsalo en muchos lugares"

Todo el esquema respeta esta máxima:

| Dato | Se captura en | Se reutiliza en |
|---|---|---|
| Nombre e info de cliente | `clientes` | `cotizaciones`, `ordenes`, `ventas_tienda` |
| Nombre e info de producto | `productos` | `cotizacion_items`, `orden_items`, `inventario_tienda`, `venta_items`, `embarque_items` |
| Acabado (nombre/tipo) | `acabados` | `producto_acabados`, `cotizacion_items`, `orden_items` |
| Proveedor | `proveedores` | `materiales`, `compras_externas`, `productos` (externo) |
| Empleado | `empleados` | `work_orders` (ejecutor), `work_orders` (asignador), `tiendas` (encargado) |
| Precio de mano de obra | `lista_precios_mano_obra` | Calculado al cerrar `semanas_nomina` |
| Período de nómina | `semanas_nomina` | `work_orders.semana_nomina_id` |

---

## Flujos de trazabilidad principales

```
Cotización → Orden → Orden Item → Work Order → Semana Nómina
                              ↓
                         Embarque Item → Inventario Tienda (entrada)
                                                ↓
                                          Venta Item → Pago de Venta
```

- **Stock del taller:** Solo se modifica vía `movimientos_inventario_taller` (trigger actualiza `stock_actual`).
- **Stock de tienda:** Solo se modifica vía `movimientos_inventario_tienda` (trigger actualiza `cantidad_disponible`).
- **Alertas de stock:** Se generan automáticamente por trigger al bajar el stock.
- **Pieza única vendida:** Trigger desactiva el producto en `productos.activo`.
- **Diferencia de embarque:** Columna calculada `diferencia = cantidad_recibida - cantidad_embarcada`.
- **Diferencia de caja:** Columna calculada `diferencia = total_efectivo_contado - total_efectivo_esperado`.
