# TICKET-023: Acceso al Catálogo Completo (736 Modelos), Paginación y Permisos de Navegación

- **ID:** `DEC-023`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Catálogo de Productos & Layout (`CatalogoPage.tsx`, `list.php`, `Sidebar.tsx`, `MobileNav.tsx`)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/catalogo-completo-paginacion`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó:
*"no encuentro el catalogo completo"*.

Al auditar la carga del catálogo:
1. **Límite de API:** `api/productos/list.php` aplicaba una paginación fija de 24 productos por defecto (`$per_page = 24;`). La llamada de `fetchCatalogos()` en `useStore.ts` no enviaba parámetros para requerir el catálogo total, cargando solo los primeros 24 de los 736 modelos oficiales de la base de datos.
2. **Corte estático en vista:** [`CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx) recortaba estáticamente los productos con `.slice(0, 80)` sin barra de paginación o selector de tamaño de página.
3. **Visibilidad en navegación:** En [`Sidebar.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/Sidebar.tsx) y [`MobileNav.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/MobileNav.tsx), la opción **Catálogo** estaba restringida a `['admin', 'encargado_taller']`, ocultando el acceso a gerentes de tienda y personal de ventas.

### 💡 La Solución Implementada
1. **Carga Total en Backend ([`api/productos/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/productos/list.php)):**
   - Se añadió soporte para `todos=1` y `per_page` configurable, permitiendo a `useStore.ts` descargar en memoria los **736 productos oficiales** (`DCR-0001` a `DCR-0736`) para búsqueda instantánea.
2. **Controles de Paginación y Navegación en [`CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx):**
   - Selector de visualización por página (30, 60, 120, 250 o Todos).
   - Botones de navegación *Anterior* / *Siguiente* con indicador *Página X de Y*.
   - Contador en vivo: *"Mostrando X de Y modelos filtrados (736 en catálogo completo)"*.
   - Búsqueda en tiempo real por SKU (`DCR-XXXX`) y por nombre de modelo.
3. **Acceso Universal en Menús:**
   - Se habilitó el acceso a **Catálogo** y **Pedidos** en [`Sidebar.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/Sidebar.tsx) y [`MobileNav.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/MobileNav.tsx) para los roles `admin`, `gerente_tienda` y `encargado_taller`.

---

## 2. Archivos Involucrados

### 🗄️ Backend API
- [`api/productos/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/productos/list.php)

### 🖥️ Frontend & Layout
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)
- [`front/src/pages/CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx)
- [`front/src/components/layout/Sidebar.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/Sidebar.tsx)
- [`front/src/components/layout/MobileNav.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/MobileNav.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El menú lateral y móvil muestra el enlace a **Catálogo** (`/catalogo`).
- [x] **DoD 2:** El catálogo carga los **736 modelos auténticos** oficiales desde MySQL.
- [x] **DoD 3:** El usuario puede navegar por páginas o seleccionar ver *Todos* los productos a la vez.
- [x] **DoD 4:** La búsqueda por nombre o SKU localiza cualquier artículo del catálogo instantáneamente.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.
