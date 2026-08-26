# TICKET-005: Control de Turnos y Arqueo de Caja (Corte Z) en Punto de Venta

- **ID:** `DEC-005`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Punto de Venta (POS) & Control Financiero
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El Punto de Venta no contaba con un flujo formal de control de caja. Aunque la base de datos cuenta con `cajas_tienda` y el endpoint `api/ventas/caja.php`, el cajero cobraba sin tener visibilidad del fondo inicial, del acumulado de efectivo esperado del turno ni de una herramienta para realizar el arqueo y cierre de caja al finalizar la jornada.

### 💡 La Solución Propuesta / Implementada
- Integrada la verificación y consulta de caja activa (`GET /api/ventas/caja.php?tienda_id=...`) al abrir el POS o cambiar de sucursal.
- Añadida barra superior en [`PuntoDeVentaPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PuntoDeVentaPage.tsx) mostrando el nombre de la caja, badge activo y efectivo esperado en tiempo real.
- Creado modal de **"Arqueo de Caja y Corte Z"** para capturar el efectivo físico contado en cajón, calcular en vivo diferencias (Cuadre Exacto / Sobrante / Faltante) y enviar el cierre a `POST /api/ventas/caja.php`.
- Generación de comprobante térmico de 80mm de Corte Z con fecha, saldo inicial, total esperado, contado, diferencia y firma de cajero.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- [`front/src/pages/PuntoDeVentaPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PuntoDeVentaPage.tsx)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- [`api/ventas/caja.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/ventas/caja.php)
- [`db/05_tienda_pos.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/05_tienda_pos.sql)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El POS consulta o inicializa la caja activa de la tienda seleccionada al cargar.
- [x] **DoD 2:** Modal de Arqueo y Cierre de Caja funcional con cálculo de discrepancias.
- [x] **DoD 3:** Envío de cierre a `POST /api/ventas/caja.php` y comprobante de corte imprimible.
- [x] **DoD 4:** Compilación TypeScript sin errores (`npm run build` en `front/`).
