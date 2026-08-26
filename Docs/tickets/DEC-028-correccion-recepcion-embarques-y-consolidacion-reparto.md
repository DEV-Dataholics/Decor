# Ticket DEC-028: Corrección de Recepción de Embarques, Consolidación de Reparto y Sincronización de Inventario

**Estado:** `RESUELTO`
**Fecha:** 2026-08-26
**Módulos Afectados:** Backend (`api/embarques/recibir.php`, `api/inventario/list_tienda.php`), Frontend (`Sidebar.tsx`, `MobileNav.tsx`, `InventarioPage.tsx`, `useStore.ts`).

---

## 1. Problema Identificado

1. **TypeError: Failed to fetch en Liberación de Manifiesto:**
   - Al hacer clic en *"Liberar y Finalizar Entrega"* en [`RepartoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/RepartoPage.tsx), el navegador arrojaba `TypeError: Failed to fetch`.
   - La causa raíz era un error de sintaxis en `api/embarques/recibir.php` (llave `}` duplicada) que provocaba que PHP fallara con Error 500 antes de emitir los encabezados CORS.
2. **Redundancia en Navegación (Embarques vs Reparto):**
   - El módulo logístico se encontraba dividido entre la vista antigua de Embarques y el módulo moderno de Reparto con manifiestos interactivos e incidencias.
3. **Filtro de Inventario por Sucursal:**
   - La vista de inventario consultaba siempre la tienda 1 fija y no reactivaba la consulta al cambiar de sucursal en el dropdown o al filtrar por existencias físicas.

---

## 2. Solución Implementada

### A. Backend (`api/`)
1. **Corrección de Sintaxis en [`api/embarques/recibir.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/recibir.php):**
   - Eliminada la llave huérfana de cierre y validada la sintaxis con `php -l` en el 100% de los endpoints.
   - Búsqueda tolerante de ítems por `(id AND embarque_id)` o fallback por `(producto_id OR orden_item_id)`.
   - Actualización transaccional en MySQL de `inventario_tienda`, `movimientos_inventario_tienda` y `ordenes.estatus = 'entregada'`.
2. **Soporte de Tienda Global en [`api/inventario/list_tienda.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/inventario/list_tienda.php):**
   - Admite `tienda_id=todas` o `tienda_id=1, 2, 3`, calculando KPIs reales de existencias y valorización según el alcance seleccionado.

### B. Frontend (`front/`)
1. **Consolidación en Reparto:**
   - Ocultada la opción redundante de Embarques en [`Sidebar.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/Sidebar.tsx) y [`MobileNav.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/MobileNav.tsx), concentrando toda la operación logística en `/reparto`.
2. **Sincronización Reactiva de Inventario:**
   - Añadido `useEffect` en [`InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx) para recargar existencias al cambiar de sucursal.
   - Tipado estricto `tiendaId?: number | 'todas'` en [`useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts).
   - EmptyState claro y descriptivo cuando se aíslan artículos con existencias físicas.

---

## 3. Verificación

1. **Prueba HTTP Real:** `scratch/test_http_recibir.php` devolvió `HTTP 200 OK` con cabeceras CORS y confirmación de recepción.
2. **Persistencia MySQL:** Verificada la transición de la orden a `entregada` y registro de movimiento de entrada en almacén.
3. **Build Frontend:** `npm run build` completado exitosamente con 0 errores TypeScript.
