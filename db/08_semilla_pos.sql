-- ============================================================
--  db/08_semilla_pos.sql
--  Datos de inicialización de materiales de taller para Decor Mueblería.
-- ============================================================

USE decor_muebleria;

-- ── Proveedor de materia prima (requerido por FK en materiales) ────
INSERT IGNORE INTO proveedores (id, nombre, tipo, pais, creado_por) VALUES
  (1, 'Proveedor General de Madera y Acabados', 'materia_prima', 'México', 1);

-- ── Materiales del taller con código de referencia ───────────────
INSERT INTO materiales (nombre, tipo, subtipo, unidad_medida, proveedor_id,
                        stock_actual, stock_minimo, stock_maximo,
                        costo_unitario, codigo_referencia, activo, creado_por) VALUES
  ('Madera Alder',     'madera',   'alder',   'tabla',   1, 120, 30, 300,  95.00, 'MAT-AL01', 1, 1),
  ('Madera Pino',      'madera',   'pino',    'tabla',   1,  80, 20, 200,  45.00, 'MAT-PI01', 1, 1),
  ('Laca Blanca',      'quimico',  'laca',    'litro',   1,  15,  5,  40, 180.00, 'MAT-LB01', 1, 1),
  ('Mancha Alder #2',  'quimico',  'mancha',  'litro',   1,  10,  3,  30, 155.00, 'MAT-MA02', 1, 1),
  ('Clavo Decorativo', 'insumo',   'clavo',   'caja',    1,  50, 10, 100,  35.00, 'MAT-CD01', 1, 1),
  ('Tela Cuero Camel', 'insumo',   'tela',    'metro',   1,  25,  8,  60, 220.00, 'MAT-TC01', 1, 1)
ON DUPLICATE KEY UPDATE
  stock_actual = VALUES(stock_actual),
  costo_unitario = VALUES(costo_unitario);
