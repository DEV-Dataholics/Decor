# ✅ tasks/todo.md — Decor Mueblería MVP (React SPA Edition)
> Generado por: Orquestador Principal
> Estado: 🟢 Operativo / Auditado — Preparación para Producción

---

## FASE 1: Arquitectura y Design System ✅
- [x] Migración de Multi-HTML a **React SPA (Vite + TypeScript)**.
- [x] Implementación de Design System Premium (Vanilla CSS + Tailwind).
- [x] Cliente de API centralizado con manejo de estados de carga/error.
- [x] Dashboard dinámico conectado a `stats.php`.

---

## FASE 2: Esquema de Base de Datos ✅ COMPLETADA
- [x] `db/00_base.sql` — BD `decor_muebleria` + Esquema Relacional.
- [x] `db/truncate_operaciones.sql` — Script para reseteo transaccional de auditoría.
- [x] Triggers automáticos para actualización de stock en tienda y taller.

---

## FASE 3: API PHP (Backend) 🔄
- [x] `api/auth/` — Autenticación base.
- [x] `api/dashboard/stats.php` — Estadísticas reales de operación.
- [x] `api/inventario/list_tienda.php` — Consulta de stock por sucursal.
- [x] `api/produccion/work_orders.php` — Gestión de Kanban y avance de estatus.
- [x] `api/pedidos/ordenes.php` — Listado y gestión de órdenes mayoristas.
- [ ] `api/config/auth_jwt.php` — Pendiente: Reforzar seguridad con tokens.

---

## FASE 4: Frontend React (Módulos Core) ✅
- [x] **Dashboard:** Visualización de KPIs dinámicos.
- [x] **POS:** Terminal de venta con gestión de carrito y selección de sucursal.
- [x] **Inventario:** Control de existencias con alertas visuales.
- [x] **Producción:** Tablero Kanban para gestión de Work Orders del taller.
- [x] **Pedidos:** Gestión de embarques y remisiones para mayoristas.

---

## FASE 5: Pulido y Soporte a Producción 🔄
- [ ] **Validación de Triggers Final:** Realizar pruebas de estrés en transacciones POS.
- [ ] **Generador de Etiquetas:** Integrar generación de PDF para códigos de barras.
- [ ] **Seguridad de Endpoints:** Auditar cada archivo PHP para prevenir inyecciones y accesos no autorizados.
- [ ] **Configuración Laragon Producción:** Ajustar variables de entorno y backups automáticos.

---

## 📝 Auditoría de Estado (28/04/2026)
*   **Limpieza:** Se han removido todos los fallbacks de `DEMO_DATA`.
*   **Conectividad:** Los 5 módulos principales se comunican con PDO.
*   **Ready:** El sistema está listo para que el usuario capture los catálogos reales e inicie la operación.

---
*Nota: Este archivo debe ser la brújula para el Agente Orquestador en cada sesión.*
