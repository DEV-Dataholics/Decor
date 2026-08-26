# 🛋️ Decor Mueblería - Sistema de Gestión Integral (SPA)

> **Estado del Proyecto:** 🟢 **LISTO PARA PRODUCCIÓN / AUDITADO**
> **Última Actualización:** 26 de Agosto, 2026
> **Fase:** Sprint de Consolidación Transaccional, Unificación Visual Santa Fe y Persistencia MySQL (DEC-001 a DEC-029).

Plataforma moderna de gestión para **Decor Mueblería**, que centraliza el Taller de Producción, los Pedidos Mayoristas y el Punto de Venta (POS) en una Single Page Application (SPA).

---

## 🎯 Objetivo y Estado Actual
El sistema ha superado la fase de prototipado con datos demo. Actualmente, **todos los módulos están conectados a la API real (PHP/PDO)** y reflejan únicamente los datos persistidos en la base de datos `decor_muebleria`. Se ha completado la suite de endpoints CRUD, la sincronización de estados operativos y la identidad visual institucional con la paleta Turquesa Santa Fe.

### Capacidades Core:
1. **Dashboard Dinámico:** Estadísticas reales de ventas, tickets emitidos, rentabilidad por modelo y productividad por carpintero.
2. **POS Profesional:** Búsqueda rápida por SKU/nombre y escaneo de códigos QR físicos con descuento inmediato de inventario y emisión de tickets térmicos.
3. **Inventario Centralizado:** Vista dual (tabla y tarjetas), filtros multicriterio, micro-KPIs interactivos y administración de materia prima de taller.
4. **Producción Kanban:** Trazabilidad integral de Work Orders, avance de fases y cálculo automatizado de mano de obra.
5. **Logística y Reparto Unificado:** Flujo directo de entrega a tienda o cliente final con registro de incidencias físicas (dañado/rechazado).

---

## 🏗️ Stack Tecnológico
| Capa | Tecnología | Estado |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | SPA Moderna, Reactiva y Tipada |
| **Styling** | Vanilla CSS + TailwindCSS | Paleta Turquesa Santa Fe (`#0d9488`) |
| **Iconografía**| Lucide React | Sistema de Iconos Estandarizado |
| **Gráficos** | Recharts | Visualizaciones Interactivas |
| **API Backend** | PHP 8.x (Vanilla / PDO) | Endpoints RESTful con Validación de Roles |
| **Base de Datos** | MySQL (cPanel / Producción) | Esquema Relacional Estricto |

---

## 📁 Estructura del Proyecto
```
sistema_decor/
├── front/              # Frontend React (Vite)
│   ├── src/
│   │   ├── components/ # Componentes reutilizables, layout y etiquetas QR
│   │   ├── pages/      # Vistas: Dashboard, POS, Inventario, Pedidos, Producción, Reparto, Personal, Configuración
│   │   ├── store/      # Estado global tipado (StoreContext, useStore)
│   │   └── App.tsx     # Orquestador de rutas y navegación
├── api/                # Backend PHP (Endpoints Reales)
│   ├── auth/           # Autenticación segura y control de sesiones
│   ├── clientes/       # CRUD de clientes
│   ├── empleados/      # CRUD de empleados y artesanos
│   ├── tiendas/        # CRUD de sucursales físicas
│   ├── productos/      # CRUD y catálogo de productos
│   ├── inventario/     # Consultas y ajustes de stock
│   ├── pedidos/        # Creación y consulta de pedidos
│   ├── produccion/     # Work orders, Kanban y avance de taller
│   ├── taller/         # Materias primas e insumos
│   ├── ventas/         # Checkout POS, cajas y arqueo Z
│   ├── embarques/      # Manifiestos de despacho y recepción
│   └── config/         # Conexión PDO (db.php) y respuestas estándar
├── db/                 # Base de Datos (SQL Modular y Catálogo)
│   ├── 00_base.sql a 06_logistica.sql # Esquema relacional
│   ├── 07_semilla.sql  # Acabados oficiales
│   └── seed_completo.sql # Catálogo real de 736 productos oficiales
└── Docs/               # Documentación Técnica
    ├── tickets/        # Bitácora de tickets DEC-001 a DEC-029
    └── PULL_REQUEST.md # Plantilla y descripción para PR en GitHub
```

---

## 🧩 Estatus de Módulos (Auditado 26/08/26)
| Módulo | Estado | Conectividad | Demo Data |
|---|---|---|---|
| **Dashboard** | ✅ Operativo | `api/pedidos/ordenes.php`, `api/produccion/work_orders.php`, `api/ventas/list.php` | 🚫 Eliminada |
| **Punto de Venta** | ✅ Operativo | `api/inventario/list_tienda.php`, `api/ventas/checkout.php`, `api/ventas/caja.php` | 🚫 Eliminada |
| **Inventario** | ✅ Operativo | `api/inventario/list_tienda.php`, `api/taller/materiales.php` | 🚫 Eliminada |
| **Producción** | ✅ Operativo | `api/produccion/work_orders.php`, `api/produccion/mover_wo.php` | 🚫 Eliminada |
| **Pedidos** | ✅ Operativo | `api/pedidos/ordenes.php`, `api/pedidos/crear.php` | 🚫 Eliminada |
| **Reparto** | ✅ Operativo | `api/embarques/list.php`, `api/embarques/recibir.php` | 🚫 Eliminada |
| **Personal** | ✅ Operativo | `api/empleados/list.php`, `api/empleados/save.php` | 🚫 Eliminada |
| **Catálogo** | ✅ Operativo | `api/productos/list.php`, `api/productos/save.php` | 🚫 Eliminada |

---

## 🚀 Flujo de Trabajo Git & Pull Request
Para integrar las mejoras desarrolladas al repositorio principal de GitHub:

1. **Rama de Trabajo Actual:** `feature/ajustes-pdv-reporte-ventas`
2. **Rama Destino (Target):** `main`
3. **Checklist previo al PR:**
   - [x] Compilación limpia de TypeScript sin errores (`npm run build`).
   - [x] Bitácora de tickets documentada en `Docs/tickets/DEC-001` a `DEC-029`.
   - [x] Historial actualizado en `CHANGELOG.md`.
   - [x] Sin variables de entorno expuestas ni credenciales en código fuente.

---

## 📝 Log de Cambios Recientes

### [2026-08-26] — Sprint Integral de Producción y Persistencia MySQL (DEC-001 a DEC-029) ✅
*   **DEC-001 a DEC-007:** Control de turnos y corte Z en POS, soporte dual de escáner QR y catálogo en vivo, reporte transaccional de ventas por sucursal con exportación a PDF.
*   **DEC-010 a DEC-016:** Unificación de identidad institucional con paleta **Turquesa Santa Fe** (`#0d9488`), vista dual tabla/tarjetas y micro-KPIs interactivos en Inventario.
*   **DEC-017 a DEC-023:** Catálogo limpio de 736 productos oficiales, suite completa de endpoints CRUD con persistencia MySQL, módulo de materia prima y paginación rápida.
*   **DEC-024 a DEC-028:** Trazabilidad integral de pedidos desde taller hasta reparto unificado, persistencia de incidencias en entregas y simplificación de navegación.
*   **DEC-029:** Corrección de métricas de taller en Dashboard, sincronización de `empleado_id`, normalización de costos de mano de obra y cálculo en vivo de productividad por carpintero.

---

## 🤖 Guía para el Agente Orquestador (Mantenimiento)
1. **Sin Datos Estáticos:** Prohibido reintroducir `DEMO_DATA` en el frontend. Si no hay datos, renderizar `EmptyState`.
2. **Tipado Estricto:** Toda interacción de red y estado global debe implementar interfaces en `src/store/useStore.ts`.
3. **Mantenimiento y Reseteo:**
   - Para reiniciar operaciones sin afectar catálogos: `db/truncate_operaciones.sql`.
   - Para re-poblar catálogo maestro: `db/seed_completo.sql`.
