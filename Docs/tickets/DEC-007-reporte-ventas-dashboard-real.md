# TICKET-007: Reporte de Ventas y Métricas de Dashboard con Datos Transaccionales Reales

- **ID:** `DEC-007`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Dashboard / Reporte de Ventas
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El Dashboard y los Reportes de Ventas calculaban métricas sobre arrays locales o estimaciones, sin reflejar las ventas reales registradas en `ventas_tienda` y `pagos_venta` en MySQL. Se requería consultar transacciones confirmadas por rango de fechas y sucursal, con desglose de métodos de pago y visualización de tickets.

### 💡 La Solución Propuesta / Implementada
- Creado endpoint estructurado [`api/ventas/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ventas/list.php) con soporte de filtros por `tienda_id`, `fecha_inicio` y `fecha_fin`.
- Conectado [`DashboardPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/DashboardPage.tsx) mediante `useStore` (`ventasRealizadas` y `fetchVentas`) con auto-refresco al alterar filtros.
- Implementado desglose visual de métodos de pago (Efectivo en Caja, Tarjetas TPV y Transferencias SPEI) con porcentajes de participación.
- Diseñada tabla de historial de ventas transaccionales en vivo con folio, cliente, cajero, detalle de ítems, total y modal interactivo para reimprimir tickets térmicos de 80mm.
- Implementado `EmptyState` real cuando no existen registros en el período.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- [`front/src/pages/DashboardPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/DashboardPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- [`api/ventas/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ventas/list.php)
- [`db/05_tienda_pos.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/05_tienda_pos.sql)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Los KPIs del Dashboard reflejan las ventas reales almacenadas en la base de datos MySQL.
- [x] **DoD 2:** Filtro por fecha y sucursal funcional con recalculo instantáneo de gráficos.
- [x] **DoD 3:** Desglose de ingresos por método de pago visible en el reporte.
- [x] **DoD 4:** Compilación TypeScript sin errores (`npm run build` en `front/`).
