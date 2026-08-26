# TICKET-016: Filtro de Unidades Físicas Reales y Distinción Visual de Sucursales en Etiquetas y Tabla

- **ID:** `DEC-016`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario Tienda & QR Labels (Frontend)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/filtro-con-stock-distincion-sucursales`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó dos comportamientos a corregir en la tabla de inventario:
1. *"porque me aparecen 36 unidades fisicas pero en la tabla aparecen otras en 0 cuando doy click espero que el filtro me muestre solo los productos en fisico"*
   - Al abrir la tabla de inventario, se mostraban los 1,484 modelos del catálogo general (la gran mayoría con 0 piezas), en lugar de aislar de inmediato los productos con existencias físicas reales (`stock > 0`).
2. *"tambien mejora las etiquetas para que se distingan de que sucursal son"*
   - La columna de sucursal mostraba un texto genérico `Sucursal #1` en lugar del nombre oficial de la tienda (`Sucursal Matriz (Centro)`, `Sucursal Norte`, etc.), y las etiquetas QR impresas carecían de un encabezado distintivo de sucursal.

### 💡 La Solución Propuesta / Implementada
1. **Filtro de Stock Físico (`con_stock`) por Defecto y Clic en KPIs:**
   - La vista de tabla de inventario inicializa con `filtroEstadoStock = 'con_stock'`, mostrando directamente las 36 piezas / artículos con existencia física en piso (`stock > 0`).
   - El botón KPI "Unidades Físicas (36 piezas)" activa de inmediato el filtro `con_stock` con badge `[ACTIVO]`.
   - La tarjeta "Modelos / SKUs (1484)" permite expandir la vista a todo el catálogo maestro (incluyendo 0 existencias).
   - La tarjeta "Valorización Stock" filtra a existencias reales y ordena de mayor a menor capital invertido.
2. **Distinción Visual de Sucursales en Tabla y Etiquetas:**
   - En la tabla de inventario: Mapeo estricto con `tiendas` de base de datos para mostrar el nombre real (`Sucursal Matriz (Centro)`, `Sucursal Norte`, `Sucursal Sur`) con badges de color institucional (`bg-teal-50`, `bg-sky-50`, `bg-indigo-50`) e íconos identificativos.
   - En etiquetas QR individuales y de lote: Encabezado superior tipo cenefa con el nombre y código de la sucursal de destino (`📍 SUCURSAL MATRIZ (CENTRO)`) para rápida identificación en bodega y piso de venta.

---

## 2. Archivos Involucrados

### 🖥️ Componentes y Vistas (`front/src/`)
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)
- [`front/src/components/QRLabel.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/QRLabel.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Al abrir el inventario o hacer click en "Unidades Físicas", la tabla muestra exclusivamente productos con stock disponible (`stock > 0`).
- [x] **DoD 2:** Al hacer click en "Modelos / SKUs", se muestran todos los registros del catálogo maestro (incluyendo existencias en 0).
- [x] **DoD 3:** Las sucursales se identifican con su nombre real (`Sucursal Matriz (Centro)`, `Sucursal Norte`, etc.) y badges visuales diferenciados.
- [x] **DoD 4:** Las etiquetas QR impresas incluyen el membrete destacado de la sucursal de destino.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.
