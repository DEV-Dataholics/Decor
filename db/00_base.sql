-- ============================================================
--  db/00_base.sql
--  Crear la base de datos y la tabla central de usuarios.
--  EJECUTAR PRIMERO en phpMyAdmin de Laragon.
--
--  Principio: Los usuarios son el eje de auditoría de TODO el
--  sistema. Cada tabla referencia usuario_id para saber QUIÉN
--  capturó o modificó el dato. Captura una vez → úsalo en todos lados.
-- ============================================================

CREATE DATABASE IF NOT EXISTS decor_muebleria
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE decor_muebleria;

-- ── Tabla maestra de usuarios del sistema ───────────────────
-- Roles definidos:
--   admin            → acceso total (Sergio / Norma)
--   gerente_tienda   → pedidos, POS, inventario tienda, reportes
--   encargado_taller → producción, materiales, embarques
--   cajero           → solo POS y consulta inventario tienda
--   carpintero       → solo sus propias work_orders
--   bodega           → entradas/salidas de materiales del taller
CREATE TABLE usuarios (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  rol           ENUM(
    'admin','gerente_tienda','encargado_taller',
    'cajero','carpintero','bodega','repartidor'
  ) NOT NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- El empleado vinculado (nullable: no todos los usuarios son empleados de taller)
  empleado_id   INT UNSIGNED  NULL,

  INDEX idx_email (email),
  INDEX idx_rol   (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Insertar el usuario admin inicial y demos
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
  ('Administrador', 'admin@decor.mx', '$2y$12$shOWXgfoHexigDOLiUaa0e4sefQ51nX5AxXyv34GNFn3/x6uexseO', 'admin'),
  ('Laura Mendoza', 'tienda@decor.mx', '$2y$12$shOWXgfoHexigDOLiUaa0e4sefQ51nX5AxXyv34GNFn3/x6uexseO', 'gerente_tienda'),
  ('Víctor Manuel', 'taller@decor.mx', '$2y$12$shOWXgfoHexigDOLiUaa0e4sefQ51nX5AxXyv34GNFn3/x6uexseO', 'encargado_taller'),
  ('Juan López', 'reparto@decor.mx', '$2y$12$shOWXgfoHexigDOLiUaa0e4sefQ51nX5AxXyv34GNFn3/x6uexseO', 'repartidor');
