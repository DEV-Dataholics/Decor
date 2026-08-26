# TICKET-017: Restauración del Catálogo Original Auténtico y Eliminación de Datos Dummy

- **ID:** `DEC-017`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Catálogo Maestro & Base de Datos (MySQL / Seed)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/catalogo-original-puro`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario solicitó explícitamente:
*"bien, necesito que tenga el catalogo original, nada inventado"*.

Al auditar la base de datos y los esquemas:
1. En `db/08_semilla_pos.sql` se habían introducido 6 productos ficticios (`SIL-001`, `SIL-002`, `MES-001`, `MES-002`, `BAN-001`, `DEC-001`) que no pertenecían al catálogo oficial de Decor Mueblería.
2. La tabla `inventario_tienda` contenía existencias asignadas a esos productos ficticios.
3. En el frontend existían ejemplos y placeholders con referencias a `SIL-001` en lugar de la nomenclatura oficial `DCR-XXXX`.

### 💡 La Solución Propuesta / Implementada
1. **Purga Total de Datos Ficticios en MySQL:**
   - Eliminación en cascada de los registros de productos inventados `SIL-001`, `SIL-002`, `MES-001`, `MES-002`, `BAN-001`, `DEC-001` y sus referencias en `inventario_tienda`, `venta_items` y `movimientos_inventario_tienda`.
2. **Restauración del Catálogo Maestro Original (736 Artículos):**
   - La tabla `productos` contiene ahora única y exclusivamente los **736 modelos auténticos** de Decor Mueblería (`DCR-0001` a `DCR-0736`) provenientes de `db/seed_completo.sql` y `front/src/data/productos.json`.
3. **Carga de Inventario Físico Real:**
   - Se pobló `inventario_tienda` con las 2,532 piezas distribuidas en las 3 sucursales (`Sucursal Matriz (Centro)`, `Sucursal Norte`, `Sucursal Sur`) basadas en `front/src/data/inventario-inicial.json` sobre los productos oficiales `DCR-XXXX` (mesas, cómodas, aparadores, escritorios, vitrinas, etc.).
4. **Actualización de Placeholders y Ejemplos en Frontend:**
   - Reemplazados los ejemplos residuales (`SIL-001`) por `DCR-0001` y `DCR-0229` en [`CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx) y [`ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx).

---

## 2. Archivos Involucrados

### 🗄️ Base de Datos & Scripts
- [`db/08_semilla_pos.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/08_semilla_pos.sql)
- Base de datos MySQL `decor_muebleria`

### 🖥️ Frontend
- [`front/src/pages/CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx)
- [`front/src/pages/ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** La base de datos contiene exactamente 736 productos correspondientes al catálogo original `DCR-0001` a `DCR-0736`.
- [x] **DoD 2:** Cero registros de productos ficticios (`SIL-001`, `MES-001`, etc.) en `productos` e `inventario_tienda`.
- [x] **DoD 3:** `inventario_tienda` poblado con las existencias oficiales de `inventario-inicial.json` para las 3 sucursales.
- [x] **DoD 4:** Frontend y endpoints de API listan exclusivamente artículos auténticos del catálogo Decor.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.
