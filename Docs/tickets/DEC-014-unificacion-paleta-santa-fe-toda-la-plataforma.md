# TICKET-014: Unificación Visual Integral y Paleta Turquesa Santa Fe en Toda la Plataforma

- **ID:** `DEC-014`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** UI/UX Global (Frontend)
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/unificacion-paleta-santa-fe`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario solicitó extender la paleta y estilo de diseño de alto contraste con acentos **Turquesa Estilo Santa Fe** a toda la plataforma Decor ERP: *"me ha encantado este estilo que estas implementando de paleta de color, me gustaria que te encargaras de que toda la plataforma incluidas vistas, listas, tablas, tarjetas, graficas, etiquetas, etc..."*.

### 💡 La Solución Propuesta / Implementada
Estandarización sistemática de la interfaz de usuario en todos los módulos:
1. **Design Tokens & Shell:** Fondo `#FAF6EE`, `AppShell.tsx`, `Sidebar.tsx` y `MobileNav.tsx` con navegación activa `#0d9488` (Turquesa Santa Fe) y tipografía nítida `text-stone-900`.
2. **Dashboard Financiero (`DashboardPage.tsx`):** Tarjetas de métricas blancas con micro-sombras, gráficos Recharts con paleta Turquesa/Madera/Índigo/Esmeralda y tablas de transacciones limpias.
3. **Catálogo de Productos (`CatalogoPage.tsx`):** Tarjetas de productos, modal de nuevo producto y filtros.
4. **Inventario General (`InventarioPage.tsx`):** Vista tabla y tarjetas, barra de filtros, micro-KPIs, tabs de Tienda/Terminados/Materia Prima y modales de ajuste manual y recepción.
5. **Pedidos (`PedidosPage.tsx`):** Listas y tarjetas de órdenes en alto contraste, modal de pedido con selector de productos y badges semafóricos.
6. **Producción Kanban (`ProduccionPage.tsx`):** Tablero Kanban con tarjetas legibles, chips de operarios y modal de asignación de mano de obra.
7. **Embarques & Logística (`EmbarquesPage.tsx`):** Manifiestos de ruta y modal de recepción de mercancía en tienda.
8. **Personal & RH (`PersonalPage.tsx`):** Tarjetas de artesanos, pre-nómina por destajo y modal de detalle en estilo Santa Fe.
9. **Reparto, Configuración y Login (`RepartoPage.tsx`, `ConfiguracionPage.tsx`, `LoginPage.tsx`):** Formularios, manuales interactivos y login unificados.

---

## 2. Archivos Involucrados

### 🖥️ Componentes y Vistas (`front/src/`)
- [`front/src/index.css`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/index.css)
- [`front/src/components/layout/AppShell.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/AppShell.tsx)
- [`front/src/components/layout/Sidebar.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/Sidebar.tsx)
- [`front/src/components/layout/MobileNav.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/components/layout/MobileNav.tsx)
- [`front/src/pages/DashboardPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/DashboardPage.tsx)
- [`front/src/pages/CatalogoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/CatalogoPage.tsx)
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)
- [`front/src/pages/PedidosPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PedidosPage.tsx)
- [`front/src/pages/ProduccionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ProduccionPage.tsx)
- [`front/src/pages/EmbarquesPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/EmbarquesPage.tsx)
- [`front/src/pages/PersonalPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PersonalPage.tsx)
- [`front/src/pages/RepartoPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/RepartoPage.tsx)
- [`front/src/pages/ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx)
- [`front/src/pages/LoginPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/LoginPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Sidebar y MobileNav muestran los elementos activos con Turquesa Santa Fe (`#0d9488`), fondo limpio y tipografía en alto contraste.
- [x] **DoD 2:** Dashboard cuenta con KPI cards en blanco nítido, paleta de gráficas unificada y tabla de transacciones de alto contraste.
- [x] **DoD 3:** Inventario (Tienda, Terminados, Materia Prima, Modales) completamente adaptado a fondos blancos, tipografía `text-stone-900` y acentos Santa Fe.
- [x] **DoD 4:** Pedidos y Producción Kanban tienen tarjetas blancas, badges semafóricos claros y modales interactivos consistentes.
- [x] **DoD 5:** Embarques, Personal, Reparto, Configuración y Login están adaptados a la paleta Santa Fe.
- [x] **DoD 6:** Compilación TypeScript (`npm run build`) validada con 0 errores.
