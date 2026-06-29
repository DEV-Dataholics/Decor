-- ============================================================
--  db/08_semilla_pos.sql
--  Datos de prueba para el módulo POS y Captura de Taller.
--  EJECUTAR DESPUÉS de 07_semilla.sql.
--
--  Genera:
--   - 1 proveedor semilla (requerido como FK en materiales)
--   - 6 productos terminados con codigo_sku escaneable
--   - 6 materiales del taller con codigo_referencia escaneable
--   - Inventario inicial en la tienda principal (id=1)
--   - Stock inicial de materiales
-- ============================================================

USE decor_muebleria;

-- ── Proveedor de prueba (requerido por FK en materiales) ────
-- Solo insertar si no existe ya
INSERT IGNORE INTO proveedores (id, nombre, tipo, pais, creado_por) VALUES
  (1, 'Proveedor General (Prueba)', 'materia_prima', 'México', 1);

-- ── Categorías (ya existen desde 01_catalogo.sql, referencia) ─
-- Sillas=1, Mesas=2, Bancos=3, Camas=4, Cómodas=5

-- ── Productos terminados con SKU (muebles de taller) ─────────
INSERT INTO productos (codigo_sku, nombre, categoria_id, origen, tipo_orden_taller,
                       precio_venta_base, precio_costo_base, activo, creado_por) VALUES
  ('SIL-001', 'Silla Colonial',            1, 'taller', 'linea',    2800.00, 1200.00, 1, 1),
  ('SIL-002', 'Silla de Cuero Camel',      1, 'taller', 'linea',    3500.00, 1600.00, 1, 1),
  ('MES-001', 'Mesa de Centro Rústica',    2, 'taller', 'linea',    5200.00, 2100.00, 1, 1),
  ('MES-002', 'Mesa de Comedor 6 Personas',2, 'taller', 'linea',   12000.00, 5000.00, 1, 1),
  ('BAN-001', 'Banco de Bar Giratorio',    3, 'taller', 'linea',    1900.00,  750.00, 1, 1),
  ('DEC-001', 'Espejo Marco Madera',      12, 'compra_externa', 'n/a', 780.00, 350.00, 1, 1);

-- ── Inventario en Tienda Principal (tienda_id = 1) ────────────
-- Relaciona los productos anteriores con stock real vendible
INSERT INTO inventario_tienda (tienda_id, producto_id, cantidad_disponible, origen_stock,
                                costo_unitario, precio_venta, lote_referencia_tipo)
SELECT
  1,
  p.id,
  CASE p.codigo_sku
    WHEN 'SIL-001' THEN 4
    WHEN 'SIL-002' THEN 2
    WHEN 'MES-001' THEN 3
    WHEN 'MES-002' THEN 1
    WHEN 'BAN-001' THEN 5
    WHEN 'DEC-001' THEN 2
  END,
  CASE p.origen
    WHEN 'taller'         THEN 'embarque_taller'
    WHEN 'compra_externa' THEN 'compra_externa'
    ELSE 'embarque_taller'
  END,
  p.precio_costo_base,
  p.precio_venta_base,
  NULL
FROM productos p
WHERE p.codigo_sku IN ('SIL-001','SIL-002','MES-001','MES-002','BAN-001','DEC-001');

-- ── Materiales del taller con código de barras ───────────────
INSERT INTO materiales (nombre, tipo, subtipo, unidad_medida, proveedor_id,
                        stock_actual, stock_minimo, stock_maximo,
                        costo_unitario, codigo_referencia, activo, creado_por) VALUES
  ('Madera Alder',     'madera',   'alder',   'tabla',   1, 120, 30, 300,  95.00, 'MAT-AL01', 1, 1),
  ('Madera Pino',      'madera',   'pino',    'tabla',   1,  80, 20, 200,  45.00, 'MAT-PI01', 1, 1),
  ('Laca Blanca',      'quimico',  'laca',    'litro',   1,  15,  5,  40, 180.00, 'MAT-LB01', 1, 1),
  ('Mancha Alder #2',  'quimico',  'mancha',  'litro',   1,  10,  3,  30, 155.00, 'MAT-MA02', 1, 1),
  ('Clavo Decorativo', 'insumo',   'clavo',   'caja',    1,  50, 10, 100,  35.00, 'MAT-CD01', 1, 1),
  ('Tela Cuero Camel', 'insumo',   'tela',    'metro',   1,  25,  8,  60, 220.00, 'MAT-TC01', 1, 1);

-- ── Mensaje de confirmación ───────────────────────────────────
-- Si llegaste aquí sin error, los datos de prueba están listos.
-- SKUs para escanear en el POS:    SIL-001  SIL-002  MES-001  MES-002  BAN-001  DEC-001
-- Códigos para escanear en Taller: MAT-AL01 MAT-PI01 MAT-LB01 MAT-MA02 MAT-CD01 MAT-TC01
