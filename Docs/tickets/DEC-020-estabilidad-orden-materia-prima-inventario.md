# TICKET-020: Estabilidad de Orden y Prevención de Reorganización Inesperada en Materia Prima

- **ID:** `DEC-020`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Inventario Tienda & Taller (`InventarioPage.tsx`)
- **Prioridad:** Media
- **Estado:** Resuelto
- **Rama Git:** `fix/estabilidad-orden-materia-prima`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
El usuario preguntó:
*"porque cuando ajusto en el inventario la material prima, esta se re aorganiza"*.

Al inspeccionar el código de [`InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx):
- En la línea 363, la variable memorizada `mpSorted` ordenaba la lista de materias primas dinámicamente según el porcentaje de stock disponible respecto al stock mínimo:
  ```ts
  const mpSorted = useMemo(() => {
    return [...materiaPrima].sort((a, b) => {
      const aPct = a.cantidad / (a.minimo * 3);
      const bPct = b.cantidad / (b.minimo * 3);
      return aPct - bPct;
    });
  }, [materiaPrima]);
  ```
- Cada vez que el usuario hacía clic en `-1`, `+1` o `+5` para ajustar existencias de un material (ej. *Madera Alder*), su porcentaje cambiaba en tiempo real, provocando que la tarjeta o fila de la tabla saltara inmediatamente de posición en pantalla, desorientando al operador.

### 💡 La Solución Propuesta / Implementada
- Se reemplazó el ordenamiento dinámico por porcentaje volátil por un **ordenamiento alfabético estable por nombre de material**:
  ```ts
  const mpSorted = useMemo(() => {
    return [...materiaPrima].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [materiaPrima]);
  ```
- **Resultado:** Las tarjetas y filas de la tabla de materias primas permanecen en su posición fija y predecible mientras el operador ajusta existencias con los botones rápidos, actualizando sus medidores y badges de estado (`Óptimo` o `Crítico / Reorden`) de forma suave y sin saltos visuales.

---

## 2. Archivos Involucrados

### 🖥️ Frontend
- [`front/src/pages/InventarioPage.tsx`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/front/src/pages/InventarioPage.tsx)

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Al presionar los botones `-1`, `+1` o `+5` en cualquier materia prima, el elemento no cambia de posición ni se reorganiza la lista.
- [x] **DoD 2:** La barra de nivel de stock y los badges de semáforo se actualizan instantáneamente sin alterar el orden.
- [x] **DoD 3:** Compilación TypeScript (`npm run build`) validada con 0 errores.
