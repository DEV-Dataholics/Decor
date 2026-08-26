# TICKET-022: Corrección de Error 500 en Creación de Pedidos y Work Orders en Backend PHP

- **ID:** `DEC-022`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Pedidos & Producción (`api/pedidos/crear.php`, `api/ordenes/save.php`, `useStore.ts`)
- **Prioridad:** Crítica
- **Estado:** Resuelto
- **Rama Git:** `fix/correccion-500-creacion-pedidos`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó un error 500 al intentar crear un pedido desde [`PedidosPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PedidosPage.tsx):
`Failed to load resource: the server responded with a status of 500 (Internal Server Error) /sistema_decor/api/pedidos/crear.php:1`
`Error al crear pedido: Error: Error al crear pedido en servidor at useStore.ts:745:15`

### 🔍 Causa Raíz Identificada
1. **ENUM de `ordenes.estatus` inválido:** El archivo `api/pedidos/crear.php` intentaba insertar `'pendiente'`, pero el tipo de datos en MySQL es `ENUM('borrador','confirmada','en_produccion','lista','embarcada','entregada','cancelada')`.
2. **Columnas requeridas (NOT NULL) en `work_orders` sin valor por defecto:** La inserción de Work Orders omitía `empleado_id`, `asignado_por`, `semana_nomina_id`, `fecha_asignacion` y `creado_por`, provocando un fallo de integridad relacional en MySQL PDO.
3. **Advertencia de Hooks de Vite (HMR):** Al editar `useStore.ts` en caliente con el servidor de desarrollo Vite activo, el árbol de componentes reportó un cambio transitorio de Hooks que se normaliza al refrescar el navegador.

### 💡 La Solución Implementada
1. **Corrección de [`api/pedidos/crear.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/crear.php):**
   - Estatus de orden inicial configurado en `'confirmada'`.
   - Mapeo y normalización automática de `tipo_orden` (`'linea'`, `'linea_especial'`, `'especial'`).
   - Detección o creación automática de `semana_nomina_id` activa (`estatus = 'abierta'`).
   - Asignación de empleado/artesano predeterminado activo y cálculo de costos base de mano de obra.
2. **Corrección de [`api/ordenes/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ordenes/save.php):**
   - Validación integral de estatus y campos FK no nulos para edición y creación de órdenes de producción.
3. **Estandarización de [`api/pedidos/eliminar.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/eliminar.php):**
   - Eliminación en cascada segura de Work Orders y órdenes.

---

## 2. Archivos Involucrados

### 🗄️ Backend API (`api/pedidos/` & `api/ordenes/`)
- [`api/pedidos/crear.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/crear.php)
- [`api/pedidos/eliminar.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/eliminar.php)
- [`api/ordenes/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ordenes/save.php)

### 🖥️ Frontend
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El endpoint `POST api/pedidos/crear.php` responde `200 OK` con `{ ok: true, data: { orden_id: ... } }`.
- [x] **DoD 2:** La orden y sus Work Orders asociadas se insertan limpiamente en MySQL con estatus válidos y FKs completas.
- [x] **DoD 3:** Compilación TypeScript (`npm run build`) validada con 0 errores.
