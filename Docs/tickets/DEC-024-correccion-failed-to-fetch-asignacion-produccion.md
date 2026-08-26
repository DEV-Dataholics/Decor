# TICKET-024: Corrección de "Failed to fetch" al Asignar Empleado y Mover Work Order en Producción

- **ID:** `DEC-024`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Producción & Taller (`api/produccion/mover_wo.php`, `api/produccion/work_orders.php`, `ProduccionPage.tsx`)
- **Prioridad:** Crítica
- **Estado:** Resuelto
- **Rama Git:** `fix/produccion-asignacion-mover-wo`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó un error al intentar asignar artesanos y mover tarjetas en el tablero de Producción:
`TypeError: Failed to fetch at useStore.ts:390:12 at useStore.ts:708:25 at handleConfirmAssignment (ProduccionPage.tsx:150:5)`

### 🔍 Causa Raíz Identificada
1. **Falta de Headers CORS y Formato Estándar:** El archivo legacy [`api/produccion/mover_wo.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/mover_wo.php) no incluía `api/config/response.php` ni invocaba `set_json_headers()`. Al ser llamado desde el cliente frontend Vite con `credentials: 'include'`, el navegador bloqueaba la respuesta por falta de cabeceras CORS (`Access-Control-Allow-Origin` / `Credentials`), arrojando el error `Failed to fetch`.
2. **Columnas Inexistentes y Esquema no Alineado:** El script legacy de backend intentaba actualizar columnas inexistentes (`empleado_carpintero_id`, `costo_mano_obra_carpinteria`, `empleado_acabado_id`) en lugar de `empleado_id`, `costo_mano_obra_unitario` y `monto_pago`.
3. **Mapeo de Estados Kanban:** La tabla `work_orders` en MySQL maneja el enum `('pendiente','en_progreso','en_revision','terminado','pagado')`, mientras que el frontend interactúa con `('pendiente','en_produccion','acabados','listo_embarque')`.

### 💡 La Solución Implementada
1. **Reescritura de [`api/produccion/mover_wo.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/mover_wo.php):**
   - Integración completa con `set_json_headers()`, `require_role(...)` y `getDB()`.
   - Mapeo bidireccional automático entre estados de la interfaz y el enum relacional de MySQL (`en_produccion` ↔ `en_progreso`, `acabados` ↔ `en_revision`, `listo_embarque` ↔ `terminado`).
   - Cálculo automático y seguro de `costo_mano_obra_unitario` y `monto_pago = cantidad * costo_unitario`.
   - Soporte para división (Split) transaccional de órdenes de trabajo con todas las claves foráneas requeridas (`semana_nomina_id`, `asignado_por`, `creado_por`).
2. **Alineación en [`api/produccion/work_orders.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/work_orders.php):**
   - Mapeo SQL con `CASE` para entregar los estados exactos al Kanban de React.
   - Selección explícita de `p.id AS producto_id` para garantizar la asociación producto-ficha técnica.

---

## 2. Archivos Involucrados

### 🗄️ Backend API
- [`api/produccion/mover_wo.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/mover_wo.php)
- [`api/produccion/work_orders.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/work_orders.php)

### 🖥️ Frontend
- [`front/src/pages/ProduccionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ProduccionPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El modal de asignación de empleado/artesano guarda y mueve la tarjeta sin error de red `Failed to fetch`.
- [x] **DoD 2:** Las transiciones de Kanban (`Pendiente` -> `En Taller` -> `Acabados` -> `Listo Envíos`) actualizan la base de datos con HTTP 200.
- [x] **DoD 3:** Compilación TypeScript (`npm run build`) validada con 0 errores.
