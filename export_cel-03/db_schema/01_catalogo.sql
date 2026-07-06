-- ============================================================
--  db/01_catalogo.sql
--  Catálogo de productos, acabados, clientes y proveedores.
--
--  PRINCIPIO "captura una vez, úsalo en muchos lugares":
--  ─────────────────────────────────────────────────────
--  • `categorias_mueble` → referenciada por productos, work_orders
--    y lista_precios_mano_obra. La categoría se captura UNA VEZ aquí.
--  • `proveedores` → referenciada por materiales, compras_externas
--    y productos (cuando el origen es externo). Un proveedor vive
--    en un solo lugar.
--  • `productos` es el ÚNICO origen de verdad de un artículo:
--    su nombre, código, medidas base y precio de lista. Cualquier
--    cotización, orden, venta o embarque apunta a este registro;
--    nunca se re-escribe la descripción del producto en otro lado.
--  • `acabados` → una paleta definida aquí, usada en cotizaciones,
--    orden_items y work_orders sin duplicar el nombre del acabado.
-- ============================================================

USE decor_muebleria;

-- ── 1. Categorías de mueble ──────────────────────────────────
-- Origen único del clasificador de productos.
-- Usado en: productos, lista_precios_mano_obra, reportes.
CREATE TABLE categorias_mueble (
  id     TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Semilla de categorías
INSERT INTO categorias_mueble (nombre) VALUES
  ('Sillas'), ('Mesas'), ('Bancos'), ('Camas'), ('Cómodas'),
  ('Escritorios'), ('Libreros'), ('Gabinetes'), ('Cabeceras'),
  ('Barras'), ('Artesanías'), ('Decoración'), ('Otros');


-- ── 2. Proveedores ───────────────────────────────────────────
-- Origen único de proveedor. Referenciado por materiales (taller)
-- y compras_externas (tienda). Un mismo proveedor NO se registra dos veces.
CREATE TABLE proveedores (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                VARCHAR(160) NOT NULL,
  razon_social          VARCHAR(200) NULL,
  rfc                   VARCHAR(15)  NULL UNIQUE,
  tipo                  ENUM(
    'materia_prima','quimicos','herramienta',
    'muebles_externos','artesanias','servicios'
  ) NOT NULL,
  ciudad                VARCHAR(80)  NULL,
  pais                  VARCHAR(60)  NOT NULL DEFAULT 'México',
  telefono              VARCHAR(25)  NULL,
  email                 VARCHAR(180) NULL,
  contacto_nombre       VARCHAR(120) NULL,
  lead_time_dias        TINYINT UNSIGNED NULL COMMENT 'Días promedio de entrega',
  metodo_pago_preferido VARCHAR(60)  NULL,
  notas                 TEXT         NULL,
  activo                TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por            INT UNSIGNED NOT NULL,
  creado_en             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tipo   (tipo),
  INDEX idx_activo (activo),
  CONSTRAINT fk_prov_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. Acabados ──────────────────────────────────────────────
-- Paleta de acabados definida UNA VEZ.
-- Referenciada en: producto_acabados, cotizacion_items, orden_items.
-- Nunca se escribe "Alder #2" duplicado en cada orden; solo el ID aquí.
CREATE TABLE acabados (
  id            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL UNIQUE,
  tipo          ENUM(
    'mancha','laca','cera','pintura','distres',
    'cardeado','natural','fashion'
  ) NOT NULL,
  codigo_color  VARCHAR(40)  NULL COMMENT 'Ej. Alder #2, Santa Fe',
  descripcion   TEXT         NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. Productos ─────────────────────────────────────────────
-- ÚNICA fuente de verdad de un artículo.
-- Nombre, SKU, medidas base y precio de lista se capturan aquí
-- y se REUTILIZAN en cotizaciones, órdenes, inventario y ventas.
CREATE TABLE productos (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo_sku           VARCHAR(40)  NOT NULL UNIQUE,
  nombre               VARCHAR(160) NOT NULL,
  descripcion          TEXT         NULL,
  categoria_id         TINYINT UNSIGNED NOT NULL,
  origen               ENUM(
    'taller','compra_externa','artesania','pieza_unica'
  ) NOT NULL DEFAULT 'taller',
  es_pieza_unica       TINYINT(1)   NOT NULL DEFAULT 0
    COMMENT 'Si TRUE: stock max 1, no reordenable igual',
  tipo_orden_taller    ENUM('linea','linea_especial','especial','n/a')
    NOT NULL DEFAULT 'linea',
  -- Medidas base en pulgadas (JSON: {alto, ancho, fondo})
  medidas_base         JSON         NULL,
  -- Lista de especificaciones estándar (cajones, molduras, etc.)
  habilitaciones       JSON         NULL,
  -- URLs de fotos (array JSON de strings)
  foto_url             JSON         NULL,
  precio_venta_base    DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Precio de lista sugerido',
  precio_costo_base    DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Costo estimado de producción o compra',
  -- Solo para productos de origen externo
  proveedor_externo_id INT UNSIGNED  NULL,
  activo               TINYINT(1)    NOT NULL DEFAULT 1,
  creado_por           INT UNSIGNED  NOT NULL,
  creado_en            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_sku       (codigo_sku),
  INDEX idx_categoria (categoria_id),
  INDEX idx_origen    (origen),
  INDEX idx_activo    (activo),
  CONSTRAINT fk_prod_categoria  FOREIGN KEY (categoria_id)         REFERENCES categorias_mueble(id),
  CONSTRAINT fk_prod_proveedor  FOREIGN KEY (proveedor_externo_id) REFERENCES proveedores(id),
  CONSTRAINT fk_prod_creado_por FOREIGN KEY (creado_por)           REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 5. Producto ↔ Acabados (N:N) ────────────────────────────
-- Relaciona qué acabados están disponibles para cada producto.
-- El acabado_id apunta a la tabla `acabados` —nunca texto libre.
CREATE TABLE producto_acabados (
  producto_id  INT UNSIGNED      NOT NULL,
  acabado_id   SMALLINT UNSIGNED NOT NULL,
  es_default   TINYINT(1)        NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, acabado_id),
  CONSTRAINT fk_pa_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_acabado  FOREIGN KEY (acabado_id)  REFERENCES acabados(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 6. Clientes ──────────────────────────────────────────────
-- Dato de cliente capturado UNA VEZ.
-- Reutilizado en: cotizaciones, ordenes, ventas_tienda, embarques.
-- El campo `saldo_pendiente` se calcula dinámicamente vía query;
-- aquí solo se almacena el límite de crédito para referencia.
CREATE TABLE clientes (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                VARCHAR(160) NOT NULL,
  razon_social          VARCHAR(200) NULL,
  rfc                   VARCHAR(15)  NULL UNIQUE,
  tipo                  ENUM(
    'mayorista','tienda_propia','disenador','publico_general'
  ) NOT NULL DEFAULT 'publico_general',
  email                 VARCHAR(180) NULL,
  telefono              VARCHAR(25)  NULL,
  ciudad                VARCHAR(80)  NULL,
  pais                  VARCHAR(60)  NOT NULL DEFAULT 'México',
  tipo_pago_preferido   ENUM(
    'efectivo','transferencia','cheque','credito'
  ) NOT NULL DEFAULT 'efectivo',
  credito_activo        TINYINT(1)   NOT NULL DEFAULT 0,
  limite_credito        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  notas                 TEXT         NULL,
  activo                TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por            INT UNSIGNED NOT NULL,
  creado_en             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tipo   (tipo),
  INDEX idx_activo (activo),
  CONSTRAINT fk_cli_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
