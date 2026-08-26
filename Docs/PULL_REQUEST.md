# 🚀 Pull Request: Sprint Integral de Producción, Persistencia MySQL y UI Santa Fe (DEC-001 a DEC-029)

## 📌 Información General
- **Rama Origen (Head):** `feature/ajustes-pdv-reporte-ventas`
- **Rama Destino (Base):** `main` (o `fix/production-fixes`)
- **Tipo de Cambio:** `Feature` / `Bugfix` / `Refactor` / `Documentation`
- **Tickets Resueltos:** DEC-001 al DEC-029 (Total: 29 tickets)

---

## 🎯 Resumen de Cambios

Este Pull Request integra la versión de producción completa para **Decor Mueblería**, logrando una arquitectura 100% transaccional conectada a MySQL, sin datos ficticios (`DEMO_DATA`), con la paleta de diseño institucional **Turquesa Santa Fe** (`#0d9488`) y cobertura en todos los flujos operativos.

---

## 📦 Módulos Principales Impactados

### 1. Punto de Venta (POS) & Cajas
- **Soporte Dual:** Lectura por escáner de códigos QR físicos y búsqueda reactiva de productos por SKU/nombre.
- **Arqueo Z & Turnos:** Apertura/cierre de turnos de caja, cálculo automático de diferencias e impresión de comprobante térmico.
- **Checkout Transaccional:** Registro de ventas con múltiples métodos de pago (efectivo, tarjeta, transferencia) y deducción automática de stock en sucursal.

### 2. Inventario & Materia Prima
- **Vista Dual:** Alternancia fluida entre Vista de Tabla detallada y Vista de Tarjetas visuales.
- **Filtros Multicriterio:** Por sucursal física, categoría de muebles, nivel de stock y micro-KPIs como filtros rápidos interactivos.
- **Módulo de Materia Prima:** Alta, edición y ajuste de stock en tiempo real con ordenamiento alfabético estable.

### 3. Producción (Kanban de Taller) & Mano de Obra
- **Trazabilidad de Work Orders:** Flujo de trabajo por fases (Pendiente → Producción → Acabados → Listo Envíos).
- **Asignación de Artesanos:** Tarificación de mano de obra pactada por pieza y cálculo de prenómina por carpintero.
- **Persistencia en MySQL:** Endpoints seguros con PDO para actualización y división de piezas en producción.

### 4. Logística & Reparto Unificado
- **Flujo de Reparto Simplificado:** Manifiesto de entrega directa a tienda o cliente con lectura QR.
- **Registro de Incidencias:** Estado de recepción (`ok`, `danado`, `rechazado`) con persistencia en base de datos.
- **Navegación Limpia:** Menú lateral consolidado eliminando pestañas redundantes.

### 5. Dashboard Estratégico & Analítica
- **Métricas Transaccionales:** Facturación real, tickets emitidos, ticket promedio y rentabilidad por producto.
- **Productividad en Vivo e Histórica:** Gráficas de carga activa y piezas terminadas por carpintero (DEC-029).
- **Reporte por Sucursal:** Filtro de fechas y exportación directa a PDF.

---

## 📂 Archivos Modificados Clave

| Componente | Archivos Principales |
|---|---|
| **Frontend** | `front/src/pages/*`, `front/src/store/useStore.ts`, `front/src/store/StoreContext.tsx`, `front/src/components/*` |
| **API Backend** | `api/produccion/work_orders.php`, `api/pedidos/crear.php`, `api/ventas/*`, `api/embarques/*`, `api/taller/*` |
| **Documentación** | `README.md`, `CHANGELOG.md`, `Docs/tickets/DEC-001` a `DEC-029`, `Docs/tickets/README.md` |

---

## 🧪 Pruebas y Validación Realizadas
- [x] **Compilación TypeScript:** `npm run build` ejecutado exitosamente con 0 errores de tipado.
- [x] **Cero Datos Demo:** Auditoría de código que certifica la ausencia de constantes ficticias o arrays simulados.
- [x] **Seguridad de Endpoints:** Validación de roles en PHP (`admin`, `gerente_tienda`, `ventas`, `encargado_taller`) y transacciones atómicas con PDO rollback.
- [x] **Compatibilidad de Base de Datos:** Esquema modular verificado con catálogo oficial de 736 productos (`DCR-0001` a `DCR-0736`).

---

## 📝 Instrucciones para Despliegue / Merge
1. Hacer Merge de este Pull Request en `main`.
2. En el servidor (cPanel / Producción), ejecutar `git pull origin main`.
3. Si se requiere reiniciar el entorno operativo conservando los 736 productos:
   - Ejecutar `db/truncate_operaciones.sql` en phpMyAdmin.
4. En el directorio `front/`, compilar con `npm run build` o servir los archivos generados en `dist/`.
