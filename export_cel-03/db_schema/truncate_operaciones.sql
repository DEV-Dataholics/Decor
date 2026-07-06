-- ============================================================
-- SCRIPT DE LIMPIEZA: decor_muebleria (Reset a Cero)
-- Propósito: Eliminar historial de operaciones y reiniciar inventarios
-- Preservando: Usuarios, Catálogos de Productos, Clientes y Tiendas.
-- ============================================================

USE decor_muebleria;

-- 1. Desactivar revisión de llaves foráneas para permitir TRUNCATE
SET FOREIGN_KEY_CHECKS = 0;

-- 2. VACIADO DE TABLAS TRANSACCIONALES (Reinicia IDs a 1)
-- Grupo: Logística y Devoluciones
TRUNCATE TABLE `devoluciones`;
TRUNCATE TABLE `embarque_items`;
TRUNCATE TABLE `embarques`;

-- Grupo: POS y Ventas
TRUNCATE TABLE `pagos_venta`;
TRUNCATE TABLE `venta_items`;
TRUNCATE TABLE `ventas_tienda`;
TRUNCATE TABLE `cajas_tienda`;

-- Grupo: Compras y Movimientos de Tienda
TRUNCATE TABLE `compra_externa_items`;
TRUNCATE TABLE `compras_externas`;
TRUNCATE TABLE `movimientos_inventario_tienda`;
TRUNCATE TABLE `inventario_tienda`; -- Se eliminan registros de stock en tienda

-- Grupo: Producción y Órdenes
TRUNCATE TABLE `work_orders`;
TRUNCATE TABLE `orden_items`;
TRUNCATE TABLE `ordenes`;
TRUNCATE TABLE `cotizacion_items`;
TRUNCATE TABLE `cotizaciones`;

-- Grupo: Inventario Taller
TRUNCATE TABLE `movimientos_inventario_taller`;
TRUNCATE TABLE `alertas_stock_material`;

-- 3. REINICIO DE STOCK EN CATÁLOGOS (Set a 0)
-- Ponemos el stock de materia prima en cero
UPDATE `materiales` SET `stock_actual` = 0;

-- 4. Reactivar revisión de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- RESULTADO:
-- - Todas las órdenes, ventas y movimientos han sido borrados.
-- - Los folios de facturas y órdenes empezarán de nuevo en 1.
-- - Los productos y clientes siguen existiendo pero con stock 0.
-- ============================================================
