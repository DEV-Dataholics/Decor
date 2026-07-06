# Reglas de Desarrollo del Proyecto (Sistema Decor)

## 1. Evitar Cierres Obsoletos (Stale Closures) en React
Al consultar datos de estado modificados recientemente mediante operaciones asíncronas (`setTimeout`), se corre el riesgo de capturar una versión desactualizada del estado debido al cierre en el renderizado original.
* **Regla:** En lugar de programar demoras fijas para leer arreglos destructurados locales, utiliza un estado de cola (ej. `pendingWizardOrderId`) y reacciona al cambio del arreglo de estado en un hook `useEffect` dedicado.

## 2. Consumo de Contexto de React vs. Zustand Store
* **Regla:** Evitar la mezcla de patrones de acceso de estado. Si `useDecor()` es un Contexto de React, no expone el método `.getState()`. Utiliza los valores de estado estructurados directamente del hook en el cuerpo del componente en lugar de intentar llamadas dinámicas externas.

## 3. Aislamiento de Elementos de Impresión
* **Regla:** No anides modales, diálogos o asistentes interactivos dentro de contenedores DOM que utilicen clases específicas de ocultamiento para impresión (como `hidden print:block` u hojas de estilo restrictivas). Estos contenedores deben permanecer aislados en la raíz del componente para evitar que sus hijos interactivos queden ocultos visualmente.

## 4. Tiempos de Dibujo para Copia de HTML en Impresión
* **Regla:** Cuando renderices elementos dinámicos (como códigos QR o códigos de barras SVG) en nodos DOM ocultos y desees transferir su HTML a una nueva ventana de impresión (`window.open`), utiliza un delay mínimo de **300ms a 350ms** en el `setTimeout` previo. Esto garantiza que el motor del navegador complete el dibujo del SVG antes de que leas el `innerHTML` del contenedor.
