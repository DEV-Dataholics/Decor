# Base de Datos — Decor Mueblería

## Cómo importar en Laragon (phpMyAdmin)

1. Abre **phpMyAdmin** en tu Laragon (`http://localhost/phpmyadmin`).
2. Ejecuta los scripts **en orden**, uno por uno:

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `00_base.sql` | Crea la BD `decor_muebleria` y la tabla `usuarios` con admin inicial |
| 2 | `01_catalogo.sql` | Categorías, proveedores, acabados, productos, clientes |
| 3 | `02_ordenes.sql` | Tiendas, cotizaciones, órdenes, ítems de orden |
| 4 | `03_produccion.sql` | Empleados, lista de precios, semanas nómina, work_orders |
| 5 | `04_inventario_taller.sql` | Materiales, movimientos y alertas de stock (con triggers) |
| 6 | `05_tienda_pos.sql` | Inventario tienda, compras externas, cajas, ventas, pagos |
| 7 | `06_logistica.sql` | Embarques, ítems de embarque y devoluciones |
| 8 | `07_semilla.sql` | Datos iniciales (acabados estándar) |
| 9 | `08_semilla_pos.sql` | Datos de prueba POS: 6 productos, 6 materiales, inventario inicial |

> **Credenciales del admin inicial:**  
> **Email:** `admin@decor.mx`  
> **Contraseña:** `password` (hash bcrypt)  
> **IMPORTANTE:** Cámbiala inmediatamente en producción.

### Scripts de Mantenimiento (opcionales)

Estos scripts NO forman parte de la instalación inicial. Úsalos solo cuando sea necesario:

| Archivo | Uso |
|---|---|
| `import_catalogo.sql` | Importa productos y categorías desde un catálogo externo |
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
