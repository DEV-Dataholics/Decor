# Ticket DEC-027: Trazabilidad Integral del Flujo Pedido → Producción → Embarque → Entrega

**Estado:** `RESUELTO`
**Fecha:** 2026-08-26
**Módulos Afectados:** Backend (`api/embarques/`, `api/produccion/`, `api/pedidos/`, `api/config/`), Base de Datos MySQL (`ordenes`, `orden_items`, `embarques`, `embarque_items`), Frontend (`PedidosPage.tsx`, `RepartoPage.tsx`, `useStore.ts`).

---

## 1. Problema Identificado

Al rastrear una orden desde su creación hasta la entrega:
1. **Desincronización de piezas listas en Reparto:** Cuando una pieza terminada se despachaba a un embarque (`Viaje #2`), la pieza seguía apareciendo en el listado superior de *"Piezas listas para despacho en fábrica"* debido a que el filtrado dependía únicamente de cadenas `QR` volátiles (`QR-{wo.id}` vs `QR-EMB-{ei.id}`) y no del `orden_item_id` relacional en MySQL.
2. **Estatus de Orden estático:** Las órdenes permanecían en estatus `'confirmada'` en MySQL a pesar de que sus órdenes de trabajo (`work_orders`) ya habían sido terminadas o incluso embarcadas.
3. **Falta de orden_item_id en embarques:** Al registrar un embarque, `embarque_items.orden_item_id` se guardaba como `NULL`, rompiendo la cadena de trazabilidad entre la línea de pedido y el viaje de entrega.

---

## 2. Solución Implementada

### A. Base de Datos y APIs Backend
1. **Helper de Sincronización Automática:** Creada la función `sincronizar_estatus_orden(PDO $pdo, int $orden_id)` en [`api/config/response.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/config/response.php) que evalúa el estado de todos los `orden_items` y actualiza la orden a:
   - `'confirmada'`: Al crearse el pedido con piezas pendientes.
   - `'en_produccion'`: Cuando al menos una pieza entra al taller o acabados.
   - `'lista'`: Cuando todas las piezas están terminadas en fábrica.
   - `'embarcada'`: Cuando las piezas están a bordo de un embarque activo.
   - `'entregada'`: Cuando el cliente o sucursal recibe el pedido con firma de manifiesto.
2. **Asociación en [`api/embarques/crear.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/crear.php):**
   - Vinculación automática del `orden_item_id` correspondiente.
   - Actualización inmediata de `orden_items.estatus_item = 'embarcado'`.
   - Sincronización del estatus de la orden a `'embarcada'`.
3. **Recepción en [`api/embarques/recibir.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/recibir.php):**
   - Actualización de `orden_items.estatus_item = 'entregado'`.
   - Sincronización de la orden a `'entregada'` y registro de `fecha_entrega_real = CURDATE()`.
4. **Kanban en [`api/produccion/mover_wo.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/mover_wo.php) y [`work_orders.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/produccion/work_orders.php):**
   - Retorno de `orden_item_id` y `estatus_item` en cada Work Order.
   - Sincronización bidireccional inmediata al mover piezas entre columnas del tablero.

### B. Frontend y Estado Global
1. **Filtrado de Piezas en [`RepartoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/RepartoPage.tsx):**
   - Las piezas ya embarcadas o entregadas son excluidas inmediatamente de las piezas disponibles para despacho mediante validación relacional (`orden_item_id`, `orden_id` + `producto_id`).
   - El despacho directo incluye `orden_item_id` y `orden_id` en el payload.
2. **Badges de Trazabilidad en [`PedidosPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PedidosPage.tsx):**
   - `getPedidoEstatus` refleja fielmente el ciclo de vida:
     - `En Cola / Confirmada` (Gris)
     - `En Fabricación / Taller` (Ámbar)
     - `Listo para Embarcar` (Turquesa Santa Fe)
     - `En Reparto / En Tránsito` (Índigo)
     - `Entregado al Cliente` (Verde Esmeralda)

---

## 3. Verificación

1. **Test Integral de Trazabilidad (`scratch/trazabilidad_completa.php`):** 0 inconsistencias detectadas.
2. **Orden #2:** Estatus `lista` (1 pieza terminada en fábrica lista para despacho).
3. **Orden #4:** Estatus `embarcada` (1 pieza en el Viaje #2 en tránsito).
4. **Compilación Frontend:** `npm run build` exitoso con 0 errores TypeScript.
