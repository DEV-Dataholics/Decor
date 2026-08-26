# TICKET-009: Manual Operativo del ERP y Guía Interactiva de Flujos Clave en Configuración

- **ID:** `DEC-009`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Configuración / Documentación Operativa
- **Prioridad:** Media
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El sistema cuenta con flujos de trabajo avanzados y conectados entre taller, logística, inventario, punto de venta y finanzas. Sin embargo, no existía una sección integrada dentro del ERP que sirviera como manual de inducción y referencia operativa para el personal (cajeros, encargados de almacén, maestros carpinteros y administradores).

### 💡 La Solución Propuesta / Implementada
- Añadir la pestaña **`Manual del ERP`** en [`ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx).
- Incorporar 6 guías operativas interactivas con diagramas de flujo paso a paso, badges por rol, consejos prácticos, checklist de verificación y advertencias:
  1. *Ingesta y Captura Manual de Inventario en Tienda (`DEC-004`).*
  2. *Fabricación Kanban, Taller y Logística de Embarques.*
  3. *Control de Turnos y Arqueo de Caja (Corte Z) (`DEC-005`).*
  4. *Punto de Venta (POS) y Checkout Transaccional (`DEC-006`).*
  5. *Devoluciones, Garantías y Retrabajos.*
  6. *Dashboard Financiero, Nómina por Destajo y Reporte de Ventas (`DEC-007`).*
- Incluir buscador de tópicos en tiempo real y función de exportación/impresión para manuales de capacitación en mostrador y taller.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- [`front/src/pages/ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Pestaña "Manual del ERP" accesible desde la vista de Configuración.
- [x] **DoD 2:** 6 manuales detallados con diagramas, pasos secuenciales, roles y checklists.
- [x] **DoD 3:** Buscador rápido de temas y filtros por categoría/rol.
- [x] **DoD 4:** Opción de impresión de manual para uso físico de capacitación.
- [x] **DoD 5:** Compilación TypeScript sin errores (`npm run build` en `front/`).
