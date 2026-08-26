# TICKET-013: Módulo de Alta, Edición y Baja de Productos en Catálogo

- **ID:** `DEC-013`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Catálogo de Productos (`CatalogoPage.tsx` / `api/productos/`)
- **Prioridad:** Alta
- **Estado:** Resuelto ✅
- **Rama Git:** `feature/catalogo-alta-baja-productos`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario solicitó: *"como puedo agregar al catalogo nuevos elementos o borrarlos supongo que deberia ser desde el catalogo de productos no? si implementa"*.
Actualmente:
1. `CatalogoPage.tsx` permitía visualizar y editar detalles de productos existentes, pero carecía de un botón y formulario modal para dar de alta **nuevos productos** desde la interfaz.
2. `api/productos/save.php` contenía discrepancias en nombres de columnas SQL con la base de datos real (`codigo_sku`, `medidas_base`, `precio_costo_base`).
3. No existía la opción de **Desactivación / Baja Lógica (Soft Delete)** o eliminación segura desde la ficha técnica del producto.

### 💡 La Solución Propuesta / Implementada
- **Backend API (`api/productos/save.php` y `api/productos/delete.php`):**
  - Mapeo exacto de columnas con `productos`: `codigo_sku`, `nombre`, `descripcion`, `categoria_id`, `medidas_base` (JSON), `foto_url`, `precio_venta_base`, `precio_costo_base`, `origen`, `acabados`.
  - Soporte para creación (`POST`) y actualización (`PUT`).
  - Endpoint de desactivación/activación (`POST /api/productos/toggle.php`) y eliminación física segura (`DELETE /api/productos/delete.php` si no tiene transacciones asociadas, o baja lógica `activo = 0` si tiene historial).
- **Frontend Store (`front/src/store/useStore.ts`):**
  - Métodos `crearProducto(payload)`, `actualizarProducto(id, payload)` y `eliminarProducto(id)`.
- **Frontend UI (`front/src/pages/CatalogoPage.tsx`):**
  - Botón destacado **"+ Nuevo Producto"** con modal completo de captura (Nombre, SKU con autogenerador, Categoría, Dimensiones, Acabados, Costo de Producción, Precio de Venta, Origen y Carga de Foto optimizada).
  - Botón de **"Dar de Baja / Eliminar del Catálogo"** en la ficha técnica con confirmación de seguridad y feedback ágil.
  - Estética visual en paleta Turquesa Santa Fe con alto contraste y tarjetas limpias.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/`)
- [`front/src/pages/CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

### 🔌 Backend API (`api/`)
- [`api/productos/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/productos/save.php)
- [`api/productos/toggle.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/productos/toggle.php)
- [`api/productos/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/productos/delete.php)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El endpoint `api/productos/save.php` inserta y actualiza productos correctamente en la tabla `productos` con sus acabados y medidas.
- [x] **DoD 2:** El endpoint `api/productos/delete.php` valida integridad referencial y permite desactivar (baja lógica) o eliminar un producto.
- [x] **DoD 3:** `CatalogoPage.tsx` incluye el botón **"+ Nuevo Producto"** con formulario modal interactivo y validaciones en dos vías.
- [x] **DoD 4:** La ficha de detalle del producto permite **Editar** y **Dar de baja / Eliminar** con feedback visual ágil.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.
