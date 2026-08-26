# DEC-029: Corrección de KPIs de Taller en Dashboard Principal

## Descripción
En el Dashboard principal, las métricas de "Productividad Histórica por Carpintero", "Carga de Trabajo Activa en Taller" y "Mano de Obra Taller" no están reflejando las órdenes de trabajo (`work_orders`) generadas por los nuevos pedidos (orders) ni su costo.

## Causa Raíz
El endpoint `api/produccion/work_orders.php` omite devolver el campo `empleado_id` en la consulta SQL (a pesar de hacer un JOIN con la tabla de empleados). Adicionalmente, el frontend espera la propiedad `costo_mano_obra` para sumar el costo en el Dashboard, pero el backend devuelve la columna como `monto_pago` y no la alias como espera la UI.

Al faltar `empleado_id`, el método `reduce` en `DashboardPage.tsx` evalúa `wo.empleado_id === emp.id` como falso para todos los carpinteros, resultando en 0 piezas mostradas y gráficos vacíos.

## Solución Propuesta
1. Modificar `api/produccion/work_orders.php`:
   - Añadir `wo.empleado_id` a la instrucción `SELECT`.
   - Modificar la selección de `wo.monto_pago` a `wo.monto_pago AS costo_mano_obra`.
2. Validar que la interfaz `WorkOrder` en el frontend (`useStore.ts`) procese adecuadamente estos campos, restableciendo el correcto comportamiento de las gráficas y contadores monetarios del dashboard.
