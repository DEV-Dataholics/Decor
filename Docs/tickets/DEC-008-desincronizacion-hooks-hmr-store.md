# TICKET-008: Corrección de Consistencia en Orden de Hooks (useStore / StoreProvider) y Desincronización HMR

- **ID:** `DEC-008`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Core / Global State (`useStore.ts`, `StoreProvider`)
- **Prioridad:** Media
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto Técnico & Causa Raíz

### 🎯 El Problema / Síntoma
En la consola del navegador aparece el error:
```text
React has detected a change in the order of Hooks called by StoreProvider. This will lead to bugs and errors if not fixed.
Previous render: 15. useState -> 16. useEffect
Next render:     15. useState -> 16. useState
Uncaught Error: Should have a queue. You are likely calling Hooks conditionally...
```

### 🔍 Análisis de Causa Raíz
1. **Regla de Hooks de React:** React mantiene una lista enlazada interna (Fiber Hooks) que mapea cada posición ordinal de hook (`1, 2, ..., n`).
2. Al incorporar los nuevos estados requeridos para transaccionalidad (`cajaActiva` y `ventasRealizadas`) en [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts), el número de hooks `useState` en la cabecera aumentó de 15 a 17.
3. El servidor de desarrollo Vite ejecutó **Hot Module Replacement (HMR)** actualizando el módulo en caliente mientras la pestaña del navegador mantenía la instancia previa de `StoreProvider` en memoria.
4. En el ciclo de re-render en caliente, React comparó el slot 16 (que antes era `useEffect` de persistencia en `localStorage`) con el nuevo slot 16 (`useState` de `cajaActiva`), disparando la alerta de "desorden de hooks" propia de HMR.

### 💡 Solución y Verificación
- **Auditoría de Código:** Se auditó [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts) confirmando que **todos** los hooks (`useState`, `useEffect`, `useCallback`) se invocan en el nivel superior de manera estricta y 100% incondicional (sin `if`, `loops` ni llamadas anidadas).
- **Resincronización:** Una recarga completa de la página en el navegador (`F5` / `Ctrl+R`) reconstruye la lista enlazada limpia de Fiber Hooks sin ninguna discrepancia.
- **Compilación Limpia:** Ejecutado `npm run build` en [`front/`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front) validando cero errores de sintaxis y tipos en TypeScript.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- [`front/src/store/useStore.ts`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/useStore.ts)
- [`front/src/store/StoreContext.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/store/StoreContext.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Todos los hooks de `useStore` se declaran en el nivel superior de forma determinista e incondicional.
- [x] **DoD 2:** Explicación técnica y causa raíz documentadas formalmente en el ticket.
- [x] **DoD 3:** Compilación TypeScript (`npm run build`) completada con éxito y sin advertencias.
