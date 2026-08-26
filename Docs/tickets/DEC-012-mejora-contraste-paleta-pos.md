# TICKET-012: Corrección de Contraste y Rediseño Visual de Catálogo y Tarjetas en POS

- **ID:** `DEC-012`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Punto de Venta (`PuntoDeVentaPage.tsx`) / UI-UX
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario reportó con captura de pantalla: *"bien, necesito cambiar la paleta de color de estos elementos, siento que se pierde el texto cafe sobre cafe"*.
En el Catálogo Rápido y tarjetas del Punto de Venta:
1. El fondo de las tarjetas combinaba un tono crema/arcilla con `opacity-60` en artículos sin stock, haciendo que el texto café oscuro (`#4a2818`) se fusionara con el fondo, generando un tono marrón lodoso (`#8c8275`) ilegible.
2. Los precios en turquesa claro sobre fondo marrón perdían contraste lumínico (falla de accesibilidad WCAG AA).
3. Los badges de stock y botones lucían opacos y sin nitidez.

### 💡 La Solución Propuesta / Implementada
- **Tarjetas Blancas Nítidas con Bordes Precisos (`bg-white border-stone-200 shadow-sm`):**
  - Eliminar el `opacity-60` global en las tarjetas.
  - Fondos limpios en blanco puro para máximo contraste.
- **Tipografía de Alto Contraste (`text-stone-900` / `text-zinc-900`):**
  - Títulos de productos en negro carbón / pizarra profunda (`text-stone-900 font-bold`).
  - SKUs en monospace gris claro estructurado (`text-stone-500 font-mono`).
- **Badges de Stock Semafóricos de Alta Visibilidad:**
  - En stock: `bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full`.
  - Agotado (0): `bg-rose-50 text-rose-800 border border-rose-200 font-bold px-2 py-0.5 rounded-full`.
- **Precios en Turquesa Santa Fe Intenso (`text-teal-700 font-black text-sm`):**
  - Garantiza contraste óptimo sobre fondo blanco.
- **Botones y Selectores Mejorados:**
  - Botón activo: `bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-sm`.
  - Botón deshabilitado: `bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed`.
  - Chips de categoría y selector de modo dual con bordes limpios y texto oscuro nítido.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/`)
- [`front/src/pages/PuntoDeVentaPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/PuntoDeVentaPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Las tarjetas del Catálogo Rápido en PDV utilizan fondo blanco nítido sin opacidad degradante.
- [x] **DoD 2:** Los títulos de los productos y textos informativos tienen contraste accesible (`text-stone-900`).
- [x] **DoD 3:** Los badges de stock son claros y legibles (verde para disponible, rojo suave para agotado).
- [x] **DoD 4:** Los precios y botones utilizan la paleta Turquesa Santa Fe con alto contraste.
- [x] **DoD 5:** Compilación TypeScript (`npm run build`) validada con 0 errores.

