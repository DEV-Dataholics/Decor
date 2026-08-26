# TICKET-015: Tarjetas Micro-KPI Interactivas como Filtros Rápidos en Inventario de Sucursal

- **ID:** `DEC-015`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario Tienda (Frontend)
- **Prioridad:** Media / Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/kpi-cards-filtros-inventario`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario solicitó que las tarjetas de métricas (Micro-KPIs) en la vista de tabla de inventario funcionen como filtros interactivos directos:
*"cuando en la tabla de inventario de sucursal cuando doy click en la tarjeta por ejemplo unidades fisicas, me mostrara en la lista esos productos, lo mismo con las otras tarjetas de ahi, son como filtros"*.

### 💡 La Solución Propuesta / Implementada
1. **Separación de Conjunto Base y Filtrado por Estado:**
   - `inventarioBase`: Calcula los totales y métricas de la sucursal/categoría/búsqueda de manera estable.
   - `kpisInventario`: Mantiene los contadores reales de Modelos, Unidades Físicas, Valorización y Críticos.
2. **Interactividad en las Tarjetas KPI:**
   - **Card 1 (Modelos / SKUs):** Al dar click, establece `filtroEstadoStock = 'todos'` para mostrar todo el catálogo en tienda.
   - **Card 2 (Unidades Físicas):** Al dar click, alterna `filtroEstadoStock = 'con_stock'` (`stock > 0`) para aislar solo artículos con existencia física real.
   - **Card 3 (Valorización Stock):** Al dar click, ordena la tabla de forma interactiva por `Valor Total Descendente` (`ordenColumna = 'valor'`, `ordenDireccion = 'desc'`).
   - **Card 4 (Stock Bajo / Agotado):** Al dar click, alterna `filtroEstadoStock = 'critico'` (`stock <= 2`) para auditar mercancía que requiere reorden o está agotada.
3. **Feedback Visual:**
   - Borde y anillo de enfoque Turquesa Santa Fe / Esmeralda / Ámbar (`ring-2 ring-teal-500/20`).
   - Indicador de estado ("Activo" / "Filtrado" / "Críticos" / "Mayor ↓").
   - Transiciones suaves y cursor interactivo.

---

## 2. Archivos Involucrados

### 🖥️ Componentes y Vistas (`front/src/`)
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Al hacer click en "Unidades Físicas", la lista filtra automáticamente para mostrar únicamente productos con stock disponible (`> 0`).
- [x] **DoD 2:** Al hacer click en "Stock Bajo / Agotado", la lista filtra artículos con existencias críticas o en cero (`<= 2`).
- [x] **DoD 3:** Al hacer click en "Modelos / SKUs", se muestran todos los artículos sin restricción de stock.
- [x] **DoD 4:** Al hacer click en "Valorización Stock", la tabla se ordena por valor total descendente.
- [x] **DoD 5:** Las tarjetas reflejan visualmente cuál filtro está activo mediante anillos de enfoque y etiquetas.
- [x] **DoD 6:** Compilación TypeScript (`npm run build`) validada con 0 errores.
