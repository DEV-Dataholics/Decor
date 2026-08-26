# TICKET-011: Vista de Tabla con Filtros Avanzados y Modo Dual en Inventario

- **ID:** `DEC-011`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario (`InventarioPage.tsx`)
- **Prioridad:** Media-Alta
- **Estado:** RESUELTO
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario indicó: *"en el inventario todo son tarjetas, me gustaria una vista de tabla con filtros"*.
La vista previa del inventario sólo permitía navegación por tarjetas y drill-down jerárquico (Tienda -> Categoría -> Producto), lo que dificultaba:
1. Tener una panorámica global del stock de todas las sucursales en un solo vistazo.
2. Filtrar por stock bajo/agotado, categorías y rangos de precio simultáneamente.
3. Ordenar rápidamente por existencias, precios o valorización de inventario.
4. Exportar o imprimir reportes tabulares de existencias físicas para auditorías.

### 💡 La Solución Propuesta / Implementada
- **Interruptor de Modo de Visualización (Dual View):**
  - Botón selector en la cabecera: **Vista Tarjetas / Cuadrícula** (`LayoutGrid`) vs. **Vista Tabla Detallada** (`Table2` / `List`).
- **Filtros Avanzados Multicriterio en Tiempo Real:**
  - Búsqueda por texto (SKU o Nombre de producto).
  - Filtro desplegable por Sucursal / Tienda (o "Todas las Tiendas").
  - Filtro desplegable por Categoría (Comedores, Salas, Recámaras, etc.).
  - Filtro por Estatus de Stock: *Todos*, *En Stock (>2)*, *Stock Bajo (1-2)*, *Agotado (0)*.
- **Tabla Operativa Completa con Ordenamiento (Sorting):**
  - Columnas: SKU, Producto y Categoría, Sucursal, Existencias Disponibles (con badge de semáforo), Precio de Venta Unitario, Valor Total de Inventario ($ Stock \times Precio) y Acciones (Impresión de QRs y Ajuste Manual).
  - Ordenamiento interactivo al hacer clic en los encabezados (Nombre, Stock, Precio, Valor Total).
- **KPIs Resumen de la Vista Filtrada:**
  - Total de SKUs listados.
  - Piezas físicas totales en existencia.
  - Valorización total del inventario en piso de venta ($ MXN).
  - Alertas de piezas en stock bajo o agotadas.
- **Exportación para Auditoría de Existencias:**
  - Botón para imprimir reporte tabular de inventario limpio para cotejo físico en piso de venta.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/`)
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El usuario puede alternar entre la vista de tarjetas y la nueva vista de tabla con un solo clic.
- [x] **DoD 2:** La vista de tabla incluye barra de filtros: búsqueda por texto, sucursal, categoría y estado de stock (bajo/agotado/disponible).
- [x] **DoD 3:** Las columnas de la tabla permiten ordenar ascendentemente y descendentemente.
- [x] **DoD 4:** Se muestran los KPIs resumidos de existencias y valorización total en base a los filtros activos.
- [x] **DoD 5:** Acciones directas por fila: generar/imprimir etiquetas QR y abrir modal de ajuste manual preseleccionado.
- [x] **DoD 6:** Compilación TypeScript (`npm run build`) validada con 0 errores.
