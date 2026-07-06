-- ============================================================
--  db/07_semilla.sql
--  Datos iniciales del sistema para arrancar operaciones.
--  EJECUTAR DESPUÉS de todos los scripts de esquema (00-06).
-- ============================================================

USE decor_muebleria;

-- Nota: El usuario admin ya fue insertado en 00_base.sql

-- Algunos acabados estándar de Decor Mueblería
INSERT INTO acabados (nombre, tipo, codigo_color, descripcion) VALUES
  ('Natural',      'natural',  NULL,        'Madera sin pigmento, solo cera de acabado'),
  ('Alder #2',     'mancha',   'Alder #2',  'Mancha oscura sobre madera de alder'),
  ('Santa Fe',     'mancha',   'Santa Fe',  'Tono rústico rojizo'),
  ('Blanco Laca',  'laca',     'BL001',     'Laca blanca brillante'),
  ('Negro Laca',   'laca',     'NL001',     'Laca negra mate'),
  ('Gris Fashion', 'fashion',  'GF001',     'Acabado fashion gris contemporáneo'),
  ('Distres Miel', 'distres',  'DM001',     'Efecto envejecido tono miel'),
  ('Cardeado',     'cardeado', NULL,        'Textura veteada a mano');

-- Tienda principal (ya existe un registro en 02_ordenes.sql)
-- Si la tienda de muestra no tiene encargado aún, se actualiza después de cargar empleados.
