# TICKET-010: Ajuste de Paleta Visual a Turquesa Estilo Santa Fe

- **ID:** `DEC-010`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** UI/UX & Sistema de Diseño
- **Prioridad:** Media
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El cliente solicitó una evolución en la identidad visual del ERP para que el color de acento principal sea **Turquesa Estilo Santa Fe** (combinando los tonos cálidos y texturas de madera/cantera del mobiliario con el azul-verde turquesa distintivo del suroeste y la artesanía mexicana de alta gama).

### 💡 La Solución Propuesta / Implementada
- **Tokens de Diseño en TailwindCSS:**
  - Actualización de `accent` hacia Turquesa Santa Fe (`#0d9488`, `#14b8a6`, `#2dd4bf`).
  - Mapeo de la escala de acento activa (`amber`) hacia la gama cromática Turquesa Santa Fe (`50: #f0fdfa` a `950: #042f2e`) para mantener consistencia global en badges, botones primarios, bordes de foco y micro-animaciones.
- **Ajustes en Componentes Globales (`index.css`):**
  - Botones primarios (`.btn-primary`), glows y aros de foco (`focus:ring-accent`) adaptados a tonos turquesa.
  - Selección de texto (`::selection`) y scrollbars estilizados con destellos turquesa.
- **Refactorización Quirúrgica en Vistas:**
  - Sustitución de acentos terracota duros (`#c2703e`) en POS, Login, Dashboard, Producción, Embarques y Configuración por el tono Turquesa Santa Fe `#0d9488` / `#14b8a6`.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/`)
- [`front/tailwind.config.js`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/tailwind.config.js)
- [`front/src/index.css`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/index.css)
- [`front/src/pages/PuntoDeVentaPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PuntoDeVentaPage.tsx)
- [`front/src/pages/DashboardPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/DashboardPage.tsx)
- [`front/src/pages/LoginPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/LoginPage.tsx)
- [`front/src/pages/ProduccionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ProduccionPage.tsx)
- [`front/src/pages/EmbarquesPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/EmbarquesPage.tsx)
- [`front/src/pages/ConfiguracionPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/ConfiguracionPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** El color de acento principal del sistema refleja el tono Turquesa Estilo Santa Fe.
- [x] **DoD 2:** Los botones primarios, badges de estado, aros de foco y acentos gráficos sincronizan armoniosamente con la paleta cálida base.
- [x] **DoD 3:** Eliminados los estilos terracota residuales hardcodeados.
- [x] **DoD 4:** Compilación TypeScript (`npm run build`) validada con 0 errores.
