# TICKET-004: Modal de Entrada Manual y Captura Inicial de Inventario en Tienda

- **ID:** `DEC-004`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario de Tienda
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
Actualmente el frontend no cuenta con un mecanismo para dar de alta inventario físico inicial o realizar ajustes manuales por merma/sobrante directamente en una tienda sin depender de una orden de producción y un camión de embarques. Aunque el endpoint backend `POST /api/inventario/ajuste_manual.php` y la tabla `movimientos_inventario_tienda` existen, no hay interfaz de usuario para consumirlo.

### 💡 La Solución Propuesta / Implementada
- Crear un modal interactivo en [`InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx) para captura manual de stock.
- Permitir seleccionar producto del catálogo (con búsqueda por SKU/nombre), tienda de destino, tipo de movimiento (`entrada` / `ajuste`), cantidad, origen (`compra_externa`, `artesania`, `pieza_unica`, `embarque_taller`), precio de venta y notas justificativas.
- Conectar la llamada con [`POST /api/inventario/ajuste_manual.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/inventario/ajuste_manual.php) y sincronizar el estado global del frontend en tiempo real.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- `front/src/pages/InventarioPage.tsx`
- `front/src/store/useStore.ts`
- `front/src/store/StoreContext.tsx`

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- `api/inventario/ajuste_manual.php`
- `db/05_tienda_pos.sql`

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Botón y modal interactivo de "Entrada Manual / Conteo Físico" disponible en `InventarioPage.tsx`.
- [x] **DoD 2:** Envío de payload a `POST /api/inventario/ajuste_manual.php` con feedback visual (toast/alerta de éxito o error).
- [x] **DoD 3:** Actualización inmediata de la tabla y tarjetas de inventario en la tienda seleccionada mediante `fetchInventarioTienda`.
- [x] **DoD 4:** Compilación TypeScript sin errores (`npm run build` en `front/`).
