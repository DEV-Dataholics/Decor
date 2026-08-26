# TICKET-025: Visibilidad de Pedidos y Retención de Piezas Liberadas en Tablero de Producción

- **ID:** `DEC-025`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Pedidos & Producción (`useStore.ts`, `api/pedidos/ordenes.php`, `PedidosPage.tsx`, `ProduccionPage.tsx`)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `fix/pedidos-visibilidad-produccion-liberados`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó:
*"paso por todo el proceso pero al liberarlo desaparecio y no puedo ver en pedidos nada"*

### 🔍 Causa Raíz Identificada
1. **Desaparición de piezas liberadas del Kanban:** En `useStore.ts`, la función `fetchOperativos()` ejecutaba `setWorkOrders(allWo.filter(w => !['listo_embarque', 'terminado'].includes(w.estatus)))`. Al hacer clic en "✓ Liberar", la orden de trabajo pasaba al estatus `'listo_embarque'`, lo cual causaba que fuera inmediatamente eliminada del array `workOrders`. En consecuencia, la 4ta columna del tablero Kanban (*"Listo Envíos"*) permanecía vacía y la tarjeta desaparecía del flujo visual del taller.
2. **Visibilidad en Pedidos (`PedidosPage.tsx`):**
   - El endpoint [`api/pedidos/ordenes.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/ordenes.php) tenía una restricción de rol estricta y omitía los datos del acabado y campos numéricos estructurados de los ítems.
   - En `useStore.ts`, la carga de `pedidos` almacenaba directamente el JSON sin conversión de tipos a números (`parseFloat(p.total)`), lo que podía afectar los cálculos de margen e impresión de tickets.
   - En `PedidosPage.tsx`, el filtro de búsqueda no protegía `cliente_nombre` contra valores nulos.

### 💡 La Solución Implementada
1. **Retención de Piezas en Kanban ([`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)):**
   - Se actualizó `setWorkOrders(allWo)` para conservar todas las órdenes de trabajo (incluidas las que están en *"Listo Envíos"* / `listo_embarque`), permitiendo al encargado de taller ver las piezas terminadas con sus etiquetas, tiempos y costos de mano de obra.
   - Se mantiene sincronizado el estado `terminados` para el módulo de Embarques y Envíos a Tienda.
2. **Estandarización de [`api/pedidos/ordenes.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/ordenes.php):**
   - Incorporación de roles amplios (`admin`, `gerente_tienda`, `encargado_taller`, `ventas`, `cajero`).
   - Inclusión de `cliente_id`, `notas`, `especificaciones_custom` y nombre del `acabado` en cada ítem.
3. **Mapeo Tipado Seguro en `useStore.ts` & `PedidosPage.tsx`:**
   - Normalización de totales numéricos, cantidades e importes (`parseFloat`).
   - Búsqueda segura y cálculo de margen en tiempo real.

---

## 2. Archivos Involucrados

### 🗄️ Backend API
- [`api/pedidos/ordenes.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/pedidos/ordenes.php)

### 🖥️ Frontend
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)
- [`front/src/pages/PedidosPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PedidosPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Al liberar una pieza en Producción (*"✓ Liberar"*), la tarjeta permanece visible en la columna *"Listo Envíos"*.
- [x] **DoD 2:** En la vista **Pedidos** (`/pedidos`), se listan todas las órdenes generadas con sus ítems, estatus, montos de mano de obra y margen de utilidad.
- [x] **DoD 3:** Compilación TypeScript (`npm run build`) validada con 0 errores.
