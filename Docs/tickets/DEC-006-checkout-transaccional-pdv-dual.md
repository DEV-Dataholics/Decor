# TICKET-006: Checkout Transaccional en PDV con Búsqueda Dual (QR Físico + Catálogo/SKU)

- **ID:** `DEC-006`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Punto de Venta (POS)
- **Prioridad:** Crítica
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El POS solo simulaba el cobro en el estado local, sin insertar registros transaccionales en `ventas_tienda` ni descontar `inventario_tienda` en MySQL. Además, el flujo de escaneo exigía códigos QR específicos de piezas únicas, fallando cuando el cajero buscaba vender un producto de catálogo estándar por su SKU (`SIL-001`) o cuando no disponía de la etiqueta física de inmediato.

### 💡 La Solución Propuesta / Implementada
- **Modo Dual de Captura en POS:**
  1. *Escaneo QR:* Lectura por pistola/cámara de etiquetas individuales físicas y por SKU directo.
  2. *Catálogo Rápido en Vivo:* Pestaña interactiva con buscador en vivo por SKU/nombre, chips de categorías, stock en tienda en tiempo real y botón `+ Agregar` en 1 solo clic.
- **Transaccionalidad en Backend:** Conexión completa de checkout a `POST /api/ventas/checkout.php` enviando `caja_id`, `tienda_id`, `cliente_id` / `cliente_nombre_libre`, detalle de `items` y desglose de `pagos`.
- **Validación y Descuento:** Bloqueo `FOR UPDATE` en MySQL, trigger automático de decremento de stock en `inventario_tienda`, incremento de efectivo esperado en `cajas_tienda` y emisión de ticket con folio real `#000001`.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- [`front/src/pages/PuntoDeVentaPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PuntoDeVentaPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- [`api/ventas/checkout.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ventas/checkout.php)
- [`db/05_tienda_pos.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/05_tienda_pos.sql)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El cajero puede agregar productos tanto escaneando QR como seleccionando productos por SKU/Nombre desde el catálogo de la tienda.
- [x] **DoD 2:** El cobro invoca exitosamente `POST /api/ventas/checkout.php` y crea la venta en `ventas_tienda` y `pagos_venta`.
- [x] **DoD 3:** El inventario disponible en `inventario_tienda` se descuenta en la base de datos MySQL.
- [x] **DoD 4:** Manejo visual de errores por stock insuficiente o descuadres en montos recibidos.
- [x] **DoD 5:** Compilación TypeScript sin errores (`npm run build` en `front/`).
