# 🛋️ Decor Mueblería - Sistema de Gestión Integral (SPA)

> **Estado del Proyecto:** 🟢 **LISTO PARA PRODUCCIÓN / AUDITADO**
> **Última Actualización:** 8 de Julio, 2026
> **Fase:** Limpieza Profunda, Sincronización Real y Optimización del Repositorio.

Plataforma moderna de gestión para **Decor Mueblería**, que centraliza el Taller de Producción, los Pedidos Mayoristas y el Punto de Venta (POS) en una Single Page Application (SPA).

---

## 🎯 Objetivo y Estado Actual
El sistema ha superado la fase de prototipado con datos demo. Actualmente, **todos los módulos están conectados a la API real (PHP/PDO)** y reflejan únicamente los datos persistidos en la base de datos `decor_muebleria`. Se ha realizado un "Reseteo Transaccional" y limpieza de archivos temporales y auxiliares de desarrollo para iniciar operaciones de producción con un repositorio limpio.

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
| **Pruebas (E2E)**| Playwright | Pruebas Automatizadas (E2E y unitarias en frontend) |
| **API Backend** | PHP 8.x (Vanilla / PDO) | Endpoints RESTful |
| **Base de Datos** | MySQL (Laragon) | Esquema Relacional Estricto |

---

## 📁 Estructura del Proyecto (Producción 2026)
```
sistema_decor/
├── front/              # Frontend React (Vite)
│   ├── src/
│   │   ├── api/        # Cliente de API centralizado
│   │   ├── features/   # Módulos: pos, inventario, produccion, pedidos
│   │   └── App.tsx     # Orquestador de vistas y Dashboard
│   └── tests/          # Pruebas automatizadas de Playwright (E2E)
├── api/                # Backend PHP (Endpoints Reales)
│   ├── auth/           # Autenticación (login, logout, me)
│   ├── clientes/       # Endpoints de clientes
│   ├── ordenes/        # Gestión de pedidos y guardado
│   ├── config/         # Conexión PDO a DB (db.php) y respuestas
│   └── ...             # Otros submódulos operativos PHP
└── db/                 # Base de Datos (SQL)
    ├── 00_base.sql     # Usuarios y DB base (ejecutar primero)
    ├── 01_catalogo.sql a 06_logistica.sql # Esquema modular
    ├── 07_semilla.sql  # Acabados iniciales estándar
    ├── seed_completo.sql # Catálogo real de producción (736 productos)
    └── truncate_operaciones.sql # Limpieza transaccional operativa
```

---

## 🧩 Estatus de Módulos (Auditado 08/07/26)
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
2. **Integridad de Inventario:** El flujo de Producción → Tienda se gestiona mediante el campo `estatus` en `work_orders`. Al pasar a `entregado`, la ingesta en tienda se actualiza en el inventario real.
3. **Mantenimiento y Reseteo:** 
   - Para limpiar operaciones de prueba en producción sin alterar catálogos, utiliza `db/truncate_operaciones.sql`.
   - Para re-poblar el catálogo real de 736 productos, utiliza `db/seed_completo.sql`.
4. **Debug de API:** Los logs de error de PHP se consultan directamente en el servidor. El cliente de React en `front/src/api/index.ts` realiza el manejo unificado de errores HTTP y de red.

---

## 📝 Log de Cambios Recientes

### [2026-07-08] — Limpieza y Depuración del Repositorio ✅
*   **Limpieza de la Raíz:** Exclusión de archivos y carpetas auxiliares de desarrollo, logs históricos, temporales de empaquetado (`deploy.py`, `deploy_produccion.ps1`, `deploy_produccion_tmp/`), configuraciones locales de agentes (`.agent/`, `.agents/`), tareas en desarrollo (`tasks/`) e `index.html` legacy.
*   **Consolidación de Base de Datos:** Eliminación de scripts duplicados, de prueba o incompletos (`instalacion_limpia.sql`, `migration_produccion.sql`, `rebuild_tables.sql`, `import_catalogo.sql`, `seed_clientes.sql`). Se conservó el esquema modular (`00_base` a `06_logistica`), los acabados base (`07_semilla`) y el catálogo definitivo (`seed_completo.sql` con 736 productos reales).
*   **Actualización de Documentación:** Reestructuración de la guía de la base de datos en `db/README.md` y de este README general.

### [2026-07-06] — Doble Asignación, Reportes POS y Stress-Test Tool ✅
*   **Doble Asignación en Taller:** Modificación del store y vistas de producción para asignar un Carpintero (fase de Producción) y un Pintor (fase de Acabados) a la misma orden con tarifas sugeridas independientes.
*   **Prenómina e Integración Financiera:** Adaptación del módulo de personal para acreditar nóminas por etapa e integración de costos en los márgenes de pedidos y gráficas de carga del Dashboard.
*   **Reporte de Ventas por Sucursal:** Panel en la base de la SPA con filtros de fecha y sucursal, KPIs dinámicos, Top 5 artículos rotativos y generación de PDF.
*   **Buscador en Logística:** Incorporación de filtros de fecha y tienda de destino en la sección de Embarques.
*   **Simulador de Rendimiento:** Integración de herramienta en Configuración para inyectar 1 año de datos ficticios en localStorage y probar estrés de renders cliente-servidor.
*   **Corrección Financiera (Doble Contabilización):** Ajuste de la fórmula del gráfico de rentabilidad de productos en el Dashboard para usar el costo estándar del catálogo, eliminando el saldo negativo redundante.

### [2026-04-28] — Fase de "Limpieza Profunda" y Salida a Producción ✅
*   **Reset Transaccional:** Ejecución de auditoría en DB para vaciar tablas operativas preservando catálogos.
*   **Desconexión de Demos:** Se eliminaron todas las constantes hardcoded (`DEMO_ORDERS`, `DEMO_DATA`, etc.) de los componentes de React.
*   **Integración Dashboard:** El tablero principal ahora suma ventas reales y cuenta órdenes activas desde la base de datos.
*   **Sincronización POS:** El Punto de Venta ahora descuenta stock y carga productos dinámicamente por sucursal.
*   **Refactor Producción:** El Kanban de taller ahora permite cambiar estados que persisten en la tabla `work_orders`.

### [2026-04-20] — Migración a React SPA
*   Abandono de las vistas `.html` vanilla en favor de una arquitectura basada en componentes.
*   Implementación de diseño con estética "Premium/Dark Mode" para el Dashboard.

---

## 🚀 Próximos Pasos (Soporte en Producción)
1. **Validación de Triggers:** Asegurar que cada venta en POS descuente exactamente la cantidad del inventario de la sucursal seleccionada.
2. **Reportes Avanzados:** Implementar exportación a Excel/PDF de las ventas del mes.
3. **Seguridad:** Implementar JWT o sesiones PHP robustas para proteger los endpoints de la API.
