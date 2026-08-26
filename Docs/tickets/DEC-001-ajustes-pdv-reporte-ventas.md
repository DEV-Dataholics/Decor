# TICKET-001: Ajustes en Punto de Venta (PDV) y Reporte de Ventas

- **ID:** `DEC-001`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Punto de Venta (POS) & Dashboard / Reporte de Ventas
- **Prioridad:** Alta
- **Estado:** En Progreso
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
Se requiere realizar ajustes visuales, funcionales y de experiencia de usuario en el módulo de **Punto de Venta (PDV)** y en el **Reporte de Ventas / Dashboard**, asegurando que el frontend interactúe limpiamente con la API backend sin recurrir a datos mock ficticios (`DEMO_DATA`), manteniendo tipado estricto en TypeScript y estados de carga/error reales.

### 💡 La Solución Propuesta / Implementada
- **Ambiente de pruebas local:** Emulación de API PHP y MySQL en Laragon de manera 100% aislada (sin subir configuraciones locales al repositorio).
- **Ajustes de PDV:** Optimización de flujo de cobro, selección de productos/acabados, filtros por tienda/categoría y manejo de tickets/recibos.
- **Reporte de Ventas:** Visualización clara de métricas transaccionales, filtros por fechas/tienda y resumen de ingresos con tipado robusto.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- `front/src/pages/PuntoDeVentaPage.tsx`
- `front/src/pages/DashboardPage.tsx`
- `front/src/store/useStore.ts`
- `front/src/types/` (si aplica para contratos de ventas/reportes)

### ⚙️ Backend & Base de Datos (Solo referencia local)
- `api/ventas/`
- `api/dashboard/`
- `db/`

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [ ] **DoD 1:** Rama `feature/ajustes-pdv-reporte-ventas` creada y activa.
- [ ] **DoD 2:** Configuración local con Laragon documentada y blindada contra commits accidentales.
- [ ] **DoD 3:** Ajustes solicitados en PDV y Reporte de Ventas implementados en frontend con validaciones y UI feedback.
- [ ] **DoD 4:** Cero datos demo estáticos (`DEMO_DATA`), soporte a `EmptyState` real.
- [ ] **DoD 5:** Compilación TypeScript sin errores (`npm run build` en `front/`).
