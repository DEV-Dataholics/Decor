-- ============================================================
--  db/02_ordenes.sql
--  Cotizaciones, Órdenes de Producción e Ítems relacionados.
--
--  TRAZABILIDAD:
--  ─────────────────────────────────────────────────────────
--  Flujo canónico:
--   cotizacion → (aprobada) → orden → orden_items → work_orders
--
--  • La cotización conserva todos los ítems con precio estimado.
--  • Al convertirla en orden, se COPIA la referencia (cliente_id,
--    producto_id, acabado_id, especificaciones) sin re-capturar datos.
--  • La orden es el documento que dispara producción. Sus ítems
--    son la base para generar work_orders automáticamente.
--  • Ningún campo de "nombre de cliente" o "nombre de producto"
--    se escribe en texto libre aquí; siempre es un FK.
-- ============================================================

USE decor_muebleria;

-- ── 1. Tiendas ───────────────────────────────────────────────
-- Definidas como entidades propias para filtrar inventarios,
-- ventas y embarques por ubicación física.
-- Referenciadas en: ordenes, cotizaciones, inventario_tienda,
--  ventas_tienda, embarques.
CREATE TABLE tiendas (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL UNIQUE,
  ciudad        VARCHAR(80)  NOT NULL,
  direccion     VARCHAR(255) NULL,
  telefono      VARCHAR(25)  NULL,
  activa        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tienda semilla
INSERT INTO tiendas (nombre, ciudad) VALUES ('Taller Principal', 'Monterrey');


-- ── 2. Cotizaciones ──────────────────────────────────────────
-- Documento previo a la orden. Al aprobarla se convierte en orden
-- sin re-capturar datos de cliente ni ítems.
CREATE TABLE cotizaciones (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id        INT UNSIGNED      NOT NULL,
  tienda_origen_id  SMALLINT UNSIGNED NOT NULL COMMENT 'Tienda que genera la cotización',
  fecha             DATE              NOT NULL,
  vigencia_hasta    DATE              NULL,
  estatus           ENUM(
    'borrador','enviada','aprobada','rechazada','convertida'
  ) NOT NULL DEFAULT 'borrador',
  notas             TEXT              NULL,
  total_estimado    DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  creado_por        INT UNSIGNED      NOT NULL,
  creado_en         TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_cliente (cliente_id),
  INDEX idx_estatus (estatus),
  CONSTRAINT fk_cot_cliente  FOREIGN KEY (cliente_id)       REFERENCES clientes(id),
  CONSTRAINT fk_cot_tienda   FOREIGN KEY (tienda_origen_id) REFERENCES tiendas(id),
  CONSTRAINT fk_cot_creado   FOREIGN KEY (creado_por)       REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. Cotización ítems ──────────────────────────────────────
CREATE TABLE cotizacion_items (
  id                         INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id              INT UNSIGNED    NOT NULL,
  producto_id                INT UNSIGNED    NOT NULL
    COMMENT 'FK a productos — nunca texto libre',
  cantidad                   DECIMAL(8,2)    NOT NULL DEFAULT 1,
  acabado_id                 SMALLINT UNSIGNED NULL
    COMMENT 'FK a acabados — nunca texto libre',
  -- JSON para medidas o ajustes que difieren de las medidas base del producto
  especificaciones_custom    JSON            NULL
    COMMENT '{alto, ancho, fondo, ajustes_especiales}',
  precio_unitario_estimado   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
  subtotal                   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,

  INDEX idx_cot  (cotizacion_id),
  INDEX idx_prod (producto_id),
  CONSTRAINT fk_ci_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_producto   FOREIGN KEY (producto_id)   REFERENCES productos(id),
  CONSTRAINT fk_ci_acabado    FOREIGN KEY (acabado_id)    REFERENCES acabados(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. Órdenes de producción ─────────────────────────────────
-- Originadas por conversión de cotización (cotizacion_id NOT NULL)
-- o capturadas directamente (cotizacion_id NULL).
-- cliente_id y tienda_origen_id se toman del FK —sin re-capturar.
CREATE TABLE ordenes (
  id                      INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id           INT UNSIGNED      NULL
    COMMENT 'NULL = orden directa sin cotización previa',
  cliente_id              INT UNSIGNED      NOT NULL,
  tienda_origen_id        SMALLINT UNSIGNED NOT NULL,
  tipo_orden              ENUM('linea','linea_especial','especial') NOT NULL DEFAULT 'linea',
  fecha_creacion          DATE              NOT NULL,
  fecha_entrega_estimada  DATE              NULL,
  fecha_entrega_real      DATE              NULL,
  estatus                 ENUM(
    'borrador','confirmada','en_produccion',
    'lista','embarcada','entregada','cancelada'
  ) NOT NULL DEFAULT 'borrador',
  -- Todos los documentos/etiquetas se generan EN ESPAÑOL (requerimiento de negocio)
  idioma_orden            ENUM('es','en') NOT NULL DEFAULT 'es',
  notas                   TEXT              NULL,
  descuento_global        DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  total                   DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  creado_por              INT UNSIGNED      NOT NULL,
  creado_en               TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_cliente  (cliente_id),
  INDEX idx_estatus  (estatus),
  INDEX idx_tienda   (tienda_origen_id),
  CONSTRAINT fk_ord_cotizacion FOREIGN KEY (cotizacion_id)   REFERENCES cotizaciones(id),
  CONSTRAINT fk_ord_cliente    FOREIGN KEY (cliente_id)       REFERENCES clientes(id),
  CONSTRAINT fk_ord_tienda     FOREIGN KEY (tienda_origen_id) REFERENCES tiendas(id),
  CONSTRAINT fk_ord_creado     FOREIGN KEY (creado_por)       REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 5. Orden ítems ───────────────────────────────────────────
-- Cada item de una orden es la unidad mínima de producción.
-- Genera (1) work_order por empleado especializado.
-- TRAZABILIDAD: si nació de cotizacion_item, se conserva referencia.
CREATE TABLE orden_items (
  id                      INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  orden_id                INT UNSIGNED      NOT NULL,
  -- Si viene de conversión de cotización, apuntamos al item original
  cotizacion_item_id      INT UNSIGNED      NULL
    COMMENT 'Trazabilidad: ítem de cotización de origen',
  producto_id             INT UNSIGNED      NOT NULL
    COMMENT 'FK a productos — fuente única del nombre/sku/medidas base',
  cantidad                DECIMAL(8,2)      NOT NULL DEFAULT 1,
  acabado_id              SMALLINT UNSIGNED NULL,
  especificaciones_custom JSON              NULL
    COMMENT '{alto, ancho, fondo, ajustes_especiales}',
  precio_unitario         DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  descuento_item          DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  subtotal                DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  estatus_item            ENUM(
    'pendiente','en_produccion','terminado','embarcado'
  ) NOT NULL DEFAULT 'pendiente',

  INDEX idx_orden   (orden_id),
  INDEX idx_producto(producto_id),
  CONSTRAINT fk_oi_orden          FOREIGN KEY (orden_id)          REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_cot_item       FOREIGN KEY (cotizacion_item_id)REFERENCES cotizacion_items(id),
  CONSTRAINT fk_oi_producto       FOREIGN KEY (producto_id)       REFERENCES productos(id),
  CONSTRAINT fk_oi_acabado        FOREIGN KEY (acabado_id)        REFERENCES acabados(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
