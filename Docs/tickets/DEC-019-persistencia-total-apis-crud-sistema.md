# TICKET-019: Persistencia Total de Datos y Creación de APIs CRUD en Backend PHP

- **ID:** `DEC-019`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Backend API & Store Global (Fullstack)
- **Prioridad:** Crítica / Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/persistencia-total-apis-crud`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó:
*"bien, en configuracion cuando borre 1 tienda y refresque volvio a aparecer, este error pudiera presentarse en otros espacios de la aplicacion asegurate de arreglar toda la permanencia de datos, esto debe asegurar que todas las apis sean creadas"*.

Al realizar la auditoría técnica completa del repositorio:
1. Las operaciones de guardado y eliminación en **Tiendas**, **Clientes**, **Empleados**, **Acabados**, **Embarques** y **Materia Prima** solo modificaban el estado reactivo en memoria / `localStorage` del frontend.
2. No existían endpoints transaccionales en el backend PHP (`api/tiendas/save.php`, `api/tiendas/delete.php`, `api/clientes/save.php`, `api/clientes/delete.php`, `api/empleados/save.php`, `api/empleados/delete.php`, `api/acabados/save.php`, `api/acabados/delete.php`, `api/embarques/crear.php`, `api/embarques/cancelar.php`, `api/embarques/status.php`, `api/taller/materiales.php`, `api/taller/update_material.php`).
3. Al recargar la página (`F5`), el método `fetchCatalogos()` y `fetchOperativos()` consultaba la base de datos MySQL original, restaurando los registros que el usuario creía haber eliminado o modificado.

### 💡 La Solución Propuesta / Implementada
1. **Creación de la Suite Completa de Endpoints Backend PHP con PDO:**
   - **Tiendas:**
     - [`api/tiendas/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/save.php): Alta y actualización con validación y tipos numéricos.
     - [`api/tiendas/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/delete.php): Eliminación física o baja lógica protegida si cuenta con historial de ventas o inventario.
     - [`api/tiendas/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/list.php): Listado filtrado por `activa = 1` y casteo booleano/numérico.
   - **Clientes:**
     - [`api/clientes/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/save.php): Alta y edición con normalización de ENUM de tipo de cliente y montos de crédito.
     - [`api/clientes/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/delete.php): Protección relacional (baja lógica `activo = 0` si tiene pedidos/ventas o borrado físico).
     - [`api/clientes/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/list.php): Listado filtrado por `activo = 1`.
   - **Empleados:**
     - [`api/empleados/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/save.php): Guardado de rol, especialidades en JSON y tarifas base por hora/pieza.
     - [`api/empleados/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/delete.php): Protección con Work Orders asignadas (`activo = 0`).
     - [`api/empleados/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/list.php): Listado con parseo JSON de especialidades y estatus.
   - **Acabados:**
     - [`api/acabados/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/save.php): Creación y edición con catálogo de tipos de acabado.
     - [`api/acabados/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/delete.php): Eliminación por ID o por nombre.
     - [`api/acabados/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/list.php): Listado activo.
   - **Embarques y Logística:**
     - [`api/embarques/crear.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/crear.php): Alta transaccional de embarque con inserción en `embarque_items`.
     - [`api/embarques/cancelar.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/cancelar.php): Cancelación de embarque pendiente/en preparación.
     - [`api/embarques/status.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/status.php): Actualización de estatus logístico.
     - [`api/embarques/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/list.php): Listado con items embebidos e información de sucursal destino.
   - **Taller y Materia Prima:**
     - [`api/taller/materiales.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/materiales.php): Listado de insumos y maderas con niveles mínimos/máximos.
     - [`api/taller/update_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/update_material.php): Ajuste de stock por delta o cantidad fija.

2. **Conexión Asíncrona en [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts):**
   - Estandarización de todas las mutaciones (`addTienda`, `updateTienda`, `deleteTienda`, `addCliente`, `updateCliente`, `deleteCliente`, `addEmpleado`, `updateEmpleado`, `deleteEmpleado`, `addAcabado`, `updateAcabado`, `deleteAcabado`, `updateMateriaPrima`, `crearEmbarque`, `cancelarEmbarque`, `updateEmbarqueStatus`, `confirmarRecepcion`) para enviar peticiones HTTP transaccionales y re-sincronizar el estado con `fetchCatalogos()` y `fetchOperativos()`.

---

## 2. Archivos Involucrados

### 🗄️ Endpoints Backend (`api/`)
- [`api/tiendas/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/save.php)
- [`api/tiendas/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/delete.php)
- [`api/tiendas/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/tiendas/list.php)
- [`api/clientes/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/save.php)
- [`api/clientes/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/delete.php)
- [`api/clientes/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/clientes/list.php)
- [`api/empleados/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/save.php)
- [`api/empleados/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/delete.php)
- [`api/empleados/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/empleados/list.php)
- [`api/acabados/save.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/save.php)
- [`api/acabados/delete.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/delete.php)
- [`api/acabados/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/acabados/list.php)
- [`api/embarques/list.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/list.php)
- [`api/embarques/crear.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/crear.php)
- [`api/embarques/cancelar.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/cancelar.php)
- [`api/embarques/status.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/embarques/status.php)
- [`api/taller/materiales.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/materiales.php)
- [`api/taller/update_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/update_material.php)

### 🖥️ Frontend & State (`front/src/`)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)
- [`front/src/pages/ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx)
- [`front/src/pages/PersonalPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PersonalPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Al agregar, editar o eliminar una tienda en Configuración, el cambio persiste en MySQL y permanece intacto tras refrescar (`F5`).
- [x] **DoD 2:** Al agregar, editar o eliminar clientes o empleados, los cambios se reflejan y persisten en MySQL.
- [x] **DoD 3:** Los embarques, recepciones y mermas se almacenan transaccionalmente en la base de datos.
- [x] **DoD 4:** Los ajustes de materias primas persisten en la tabla `materiales`.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.
