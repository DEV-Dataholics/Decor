# 🛋️ Decor Mueblería - Sistema de Gestión Integral (SPA)

> **Estado del Proyecto:** 🟢 **LISTO PARA PRODUCCIÓN / AUDITADO**
> **Última Actualización:** 28 de Abril, 2026
> **Fase:** Limpieza Profunda y Sincronización Real Completada.

Plataforma moderna de gestión para **Decor Mueblería**, que centraliza el Taller de Producción, los Pedidos Mayoristas y el Punto de Venta (POS) en una Single Page Application (SPA).

---

## 🎯 Objetivo y Estado Actual
El sistema ha superado la fase de prototipado con datos demo. Actualmente, **todos los módulos están conectados a la API real (PHP/PDO)** y reflejan únicamente los datos persistidos en la base de datos `decor_muebleria`. Se ha realizado un "Reseteo Transaccional" para iniciar operaciones desde cero.

### Capacidades Core:
1. **Dashboard Dinámico:** Estadísticas reales de ventas, pedidos y producción.
2. **POS Profesional:** Gestión de carrito, stock en tiempo real por sucursal y cierre de ventas.
3. **Inventario Centralizado:** Control de existencias en tienda con alertas de stock.
4. **Producción Kanban:** Seguimiento de Work Orders desde el taller hasta la ingesta en tienda.
5. **Logística B2B:** Armado de embarques y generación de remisiones en PDF.

---

## 🏗️ Stack Tecnológico
| Capa | Tecnología | Estado |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | SPA Moderna y Reactiva |
| **Styling** | Vanilla CSS + Tailwind | Diseño Premium / Glassmorphism |
| **API Backend** | PHP 8.x (Vanilla / PDO) | Endpoints RESTful |
| **Base de Datos** | MySQL (Laragon) | Esquema Relacional Estricto |

---

## 📁 Estructura del Proyecto (Realidad 2026)
```
sistema_decor/
├── front/              # Frontend React (Vite)
│   ├── src/
│   │   ├── api/        # Cliente de API centralizado
│   │   ├── features/   # Módulos: pos, inventario, produccion, pedidos
│   │   └── App.tsx     # Orquestador de vistas y Dashboard
├── api/                # Backend PHP (Endpoints Reales)
│   ├── dashboard/      # stats.php (Estadísticas dinámicas)
│   ├── inventario/     # list_tienda.php (Stock real)
│   ├── produccion/     # work_orders.php (Gestión de taller)
│   ├── pedidos/        # ordenes.php (Mayoristas y Embarques)
│   └── config/         # db.php (Conexión PDO)
└── db/                 # Scripts SQL
    ├── 00_base.sql     # Esquema completo
    └── truncate_operaciones.sql # Script de limpieza (Audit)
```

---

## 🧩 Estatus de Módulos (Auditado 28/04/26)
| Módulo | Estado | Conectividad | Demo Data |
|---|---|---|---|
| **Dashboard** | ✅ Operativo | `api/dashboard/stats.php` | 🚫 Eliminada |
| **Punto de Venta** | ✅ Operativo | `api/inventario/list_tienda.php` | 🚫 Eliminada |
| **Inventario** | ✅ Operativo | `api/inventario/list_tienda.php` | 🚫 Eliminada |
| **Producción** | ✅ Operativo | `api/produccion/work_orders.php` | 🚫 Eliminada |
| **Pedidos** | ✅ Operativo | `api/pedidos/ordenes.php` | 🚫 Eliminada |

---

## 🤖 Guía para el Agente Orquestador (Mantenimiento)
Para futuros ajustes o soporte, el agente debe considerar los siguientes puntos:

1. **Sin Datos Estáticos:** Nunca introduzcas `DEMO_DATA` o constantes de prueba en el frontend. Si un listado está vacío, debe mostrar el estado de "Cero registros" proveniente de la API.
2. **Integridad de Inventario:** El flujo de Producción → Tienda se gestiona mediante el campo `estatus` en `work_orders`. Al pasar a `entregado`, un trigger SQL o el endpoint `work_orders.php` debe manejar la ingesta.
3. **Reset de Datos:** Para limpiar el sistema para un nuevo ciclo de pruebas, utiliza exclusivamente `db/truncate_operaciones.sql`. No borres los catálogos base (acabados, empleados, productos base).
4. **Debug de API:** Los logs de error se encuentran en el entorno Laragon. El cliente de React en `front/src/api/index.ts` ya captura errores de red.

---

## 📝 Log de Cambios Recientes

### [2026-04-28] — Fase de "Limpieza Profunda" y Salida a Producción ✅
*   **Reset Transaccional:** Ejecución de auditoría en DB para vaciar tablas operativas preservando catálogos.
*   **Desconexión de Demos:** Se eliminaron todas las constantes hardcoded (`DEMO_ORDERS`, `DEMO_DATA`, etc.) de los componentes de React.
*   **Integración Dashboard:** El tablero principal ahora suma ventas reales y cuenta órdenes activas desde la base de datos.
*   **Sincronización POS:** El Punto de Venta ahora descuenta stock (simulado por ahora, requiere trigger final) y carga productos dinámicamente por sucursal.
*   **Refactor Producción:** El Kanban de taller ahora permite cambiar estados que persisten en la tabla `work_orders`.

### [2026-04-20] — Migración a React SPA
*   Abandono de las vistas `.html` vanilla en favor de una arquitectura basada en componentes.
*   Implementación de diseño con estética "Premium/Dark Mode" para el Dashboard.

---

## 🚀 Próximos Pasos (Soporte en Producción)
1. **Validación de Triggers:** Asegurar que cada venta en POS descuente exactamente la cantidad del inventario de la sucursal seleccionada.
2. **Reportes Avanzados:** Implementar exportación a Excel/PDF de las ventas del mes.
3. **Seguridad:** Implementar JWT o sesiones PHP robustas para proteger los endpoints de la API.
