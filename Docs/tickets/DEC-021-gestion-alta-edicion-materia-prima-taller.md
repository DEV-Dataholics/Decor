# TICKET-021: Módulo de Alta, Edición y Baja de Materias Primas e Insumos de Taller

- **ID:** `DEC-021`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario Tienda / Taller (`InventarioPage.tsx` & Backend `api/taller/`)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/gestion-materia-prima-taller`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario preguntó:
*"como puedo agregar otro tipo de material prima"*.

Anteriormente:
1. En la pestaña **Materia Prima** de [`InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx), solo existían botones de ajuste numérico rápido (`-1`, `+1`, `+5`) para los materiales preexistentes, sin interfaz para dar de alta nuevos suministros (maderas duras, barnices, herrajes o abrasivos).
2. Faltaban los endpoints transaccionales dedicados para alta y baja de materiales en el backend PHP (`api/taller/save_material.php` y `api/taller/delete_material.php`).

### 💡 La Solución Implementada
1. **Backend PHP 8 (PDO / MySQL):**
   - [`api/taller/save_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/save_material.php): Endpoint para crear y editar registros en la tabla `materiales` con validación de tipo (`madera`, `quimico`, `insumo`, `herramienta`), unidad de medida, stocks mínimo/máximo, costo unitario y código de referencia.
   - [`api/taller/delete_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/delete_material.php): Eliminación física o baja lógica segura (`activo = 0`) protegiendo consumos históricos en órdenes de trabajo.
2. **Integración en Estado Global ([`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)):**
   - Métodos `crearMateriaPrima`, `actualizarMateriaPrima`, `eliminarMateriaPrima` conectados a la API y sincronizados con `fetchOperativos()`.
3. **Experiencia UI/UX en [`InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx):**
   - Botón superior destacado **`+ Nueva Materia Prima`** con paleta Turquesa Santa Fe.
   - Botones de acción **`Editar`** y **`Eliminar`** tanto en la Vista Tabla como en la Vista Tarjetas.
   - **Modal Interactivo** de captura y edición de insumos con validación de campos, selector de tipo, unidad de medida y cálculo de alerta de reorden.

---

## 2. Archivos Involucrados

### 🗄️ Backend API (`api/taller/`)
- [`api/taller/save_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/save_material.php)
- [`api/taller/delete_material.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/taller/delete_material.php)

### 🖥️ Frontend & State (`front/src/`)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El usuario puede hacer clic en `+ Nueva Materia Prima` en la pestaña Materia Prima y registrar cualquier tipo de material con su unidad de medida y stock inicial.
- [x] **DoD 2:** El nuevo insumo se guarda en MySQL y persiste al recargar la página.
- [x] **DoD 3:** El usuario puede editar los datos de cualquier material existente o eliminarlo.
- [x] **DoD 4:** Compilación TypeScript (`npm run build`) validada con 0 errores.
