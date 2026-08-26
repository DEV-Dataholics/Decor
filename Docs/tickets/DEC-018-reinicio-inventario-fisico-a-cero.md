# TICKET-018: Reinicio Total de Inventarios Físicos a Cero (Estado Inicial Limpio)

- **ID:** `DEC-018`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario Tienda & Taller (MySQL / Seed)
- **Prioridad:** Media / Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/reinicio-inventario-cero`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario solicitó:
*"pon todas las unidades fisicas en 0 no se supone que existan unidades fisicas aun"*.

Para una correcta puesta a punto del sistema, la plataforma debe arrancar con el catálogo maestro completo (736 modelos) pero con **0 unidades físicas** en piso y bodega, de modo que el stock inicial se registre mediante los flujos operativos reales (módulo de *Entrada Manual / Conteo Físico*, *Recepción de Embarques del Taller* y *Compras Externas*).

### 💡 La Solución Propuesta / Implementada
1. **Puesta a Cero en MySQL:**
   - `inventario_tienda`: `cantidad_disponible = 0.00`, `cantidad_reservada = 0.00` para todos los productos en todas las sucursales.
   - `movimientos_inventario_tienda`: Vaciado de movimientos de inventario.
   - `materiales`: `stock_actual = 0.00` para los materiales de taller.
2. **Sincronización en Archivo Inicial:**
   - [`front/src/data/inventario-inicial.json`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/data/inventario-inicial.json) actualizado con `cantidad_disponible: 0` y `cantidad_reservada: 0`.
3. **Ajuste de Vista en Inventario:**
   - La vista de inventario muestra los 736 modelos de catálogo en `0 pzas` (badge rojo), con la tarjeta **Modelos / SKUs (736)** activa y **Unidades Físicas (0 piezas)**, permitiendo a los gerentes realizar el conteo físico o entrada manual con el botón `+ Entrada Manual / Conteo` o `Ajuste` por fila.

---

## 2. Archivos Involucrados

### 🗄️ Base de Datos & Seed
- Base de datos MySQL `decor_muebleria` (`inventario_tienda`, `movimientos_inventario_tienda`, `materiales`)
- [`front/src/data/inventario-inicial.json`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/data/inventario-inicial.json)

### 🖥️ Frontend
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Todas las sucursales reportan 0 unidades físicas en piso (`totalPiezas = 0`).
- [x] **DoD 2:** El catálogo maestro de 736 productos permanece 100% intacto y disponible para captura de inventario.
- [x] **DoD 3:** Las tarjetas KPI reflejan: `Modelos / SKUs: 736`, `Unidades Físicas: 0 piezas`, `Valorización: $0.00`, `Stock Bajo / Agotado: 0 bajos · 736 agotados`.
- [x] **DoD 4:** Compilación TypeScript (`npm run build`) validada con 0 errores.
