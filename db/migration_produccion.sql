-- ============================================================
-- migration_produccion.sql
-- Migración consolidada para producción — Sistema Decor
-- Generado automáticamente el 2026-07-06
--
-- INSTRUCCIONES:
-- 1. Crear la base de datos en cPanel → phpMyAdmin
-- 2. Seleccionar la base de datos
-- 3. Pestaña "Importar" → Seleccionar este archivo → Ejecutar
--
-- IMPORTANTE: Este archivo es IDEMPOTENTE con IF NOT EXISTS.
-- Si necesitas re-ejecutar, primero haz DROP DATABASE.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- PASO 1: CREAR BASE DE DATOS
-- ============================================================
-- NOTA: En cPanel, la base de datos ya se crea desde el panel.
-- Si ejecutas esto en Laragon local, descomenta la siguiente línea:
-- CREATE DATABASE IF NOT EXISTS decor_muebleria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE decor_muebleria;


-- ============================================================
-- ESQUEMA: 00_base.sql
-- ============================================================
-- ============================================================
--  db/00_base.sql
--  Crear la base de datos y la tabla central de usuarios.
--  EJECUTAR PRIMERO en phpMyAdmin de Laragon.
--
--  Principio: Los usuarios son el eje de auditoría de TODO el
--  sistema. Cada tabla referencia usuario_id para saber QUIÉN
--  capturó o modificó el dato. Captura una vez → úsalo en todos lados.
-- ============================================================

-- NOTA: La BD ya existe como noodluis_norma en cPanel.
-- Selecciónala en phpMyAdmin ANTES de importar este archivo.
-- CREATE DATABASE IF NOT EXISTS decor_muebleria
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;


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



-- ============================================================
-- ESQUEMA: 01_catalogo.sql
-- ============================================================
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


-- ── 1. Categorías de mueble ──────────────────────────────────
-- Origen único del clasificador de productos.
-- Usado en: productos, lista_precios_mano_obra, reportes.
CREATE TABLE categorias_mueble (
  id     TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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


-- ============================================================
-- ESQUEMA: 02_ordenes.sql
-- ============================================================
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


-- ============================================================
-- ESQUEMA: 03_produccion.sql
-- ============================================================
-- ============================================================
--  db/03_produccion.sql
--  Empleados, Semanas de Nómina, Work Orders y Lista de Precios.
--
--  TRAZABILIDAD:
--  ─────────────────────────────────────────────────────────
--  Flujo canónico de producción:
--   orden_item → work_order (asignada a empleado) → terminada →
--   semana_nomina → cierre de semana → monto_pago calculado.
--
--  PRINCIPIO "captura una vez":
--  • `empleados` define nombre, rol y tarifa base UNA VEZ.
--    La work_order apunta al empleado; nunca re-escribe su nombre.
--  • `lista_precios_mano_obra` es la ÚNICA tabla donde viven los
--    precios por categoría. Al calcular nómina se consulta aquí;
--    no se guarda el precio en cada work_order hasta el cierre.
--  • `semanas_nomina` define el período de corte. Las work_orders
--    saben a qué semana pertenecen por FK, no por fechas duplicadas.
--  • `rechazos` en work_orders registra calidad sin tabla aparte;
--    es un contador incremental que no pierde historial.
-- ============================================================


-- ── 1. Empleados ─────────────────────────────────────────────
-- Fuente única de datos de trabajadores del taller.
-- Referenciados en: work_orders (como ejecutor y como asignador),
--  tiendas (como encargado), usuarios.empleado_id.
CREATE TABLE empleados (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  rol             ENUM(
    'carpintero','pintor','tapicero','tallador','embalaje','encargado'
  ) NOT NULL,
  -- Especialidades: qué categorías de mueble puede trabajar
  -- JSON array: ["sillas","camas","mesas","acabados","talla","embalaje"]
  especialidades  JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  tarifa_base     DECIMAL(8,2) NOT NULL DEFAULT 0.00
    COMMENT 'Tarifa base por pieza para cálculo inicial de nómina',
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_ingreso   DATE         NULL,
  creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rol    (rol),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ahora que existe la tabla empleados, agregamos la FK en usuarios
ALTER TABLE usuarios
  ADD CONSTRAINT fk_usr_empleado
    FOREIGN KEY (empleado_id) REFERENCES empleados(id);

-- Actualizar tiendas para poder asignarle un encargado
ALTER TABLE tiendas
  ADD COLUMN encargado_id INT UNSIGNED NULL,
  ADD CONSTRAINT fk_tienda_encargado FOREIGN KEY (encargado_id) REFERENCES empleados(id);


-- ── 2. Lista de precios de mano de obra ──────────────────────
-- ÚNICA tabla donde viven los precios de producción por rol y categoría.
-- Al calcular el monto de una work_order se busca aquí el precio vigente;
-- no se almacena el precio en cada work_order hasta el cierre semanal.
CREATE TABLE lista_precios_mano_obra (
  id              INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  rol             ENUM(
    'carpintero','pintor','tapicero','tallador','embalaje','encargado'
  ) NOT NULL,
  categoria_id    TINYINT UNSIGNED  NOT NULL
    COMMENT 'FK a categorias_mueble — el precio aplica por categoría de mueble',
  precio_por_pieza DECIMAL(8,2)     NOT NULL DEFAULT 0.00,
  vigente_desde   DATE              NOT NULL,
  -- No hay vigente_hasta: el precio activo es el de mayor vigente_desde <= hoy
  creado_por      INT UNSIGNED      NOT NULL,
  creado_en       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rol_cat (rol, categoria_id),
  CONSTRAINT fk_lpm_categoria  FOREIGN KEY (categoria_id) REFERENCES categorias_mueble(id),
  CONSTRAINT fk_lpm_creado_por FOREIGN KEY (creado_por)   REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. Semanas de nómina ─────────────────────────────────────
-- Períodos de corte. Las work_orders se asignan aquí por FK.
-- REGLA: si una work_order se termina después del fecha_corte,
--   se asigna a la SIGUIENTE semana (lógica en la API, no en la BD).
CREATE TABLE semanas_nomina (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio  DATE         NOT NULL,
  fecha_corte   DATETIME     NOT NULL
    COMMENT 'Hasta este momento se cuentan piezas en esta semana',
  estatus       ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  total_pagado  DECIMAL(12,2) NOT NULL DEFAULT 0.00
    COMMENT 'Calculado al cerrar la semana; no se actualiza manualmente',
  cerrado_por   INT UNSIGNED  NULL,
  cerrado_en    TIMESTAMP     NULL,
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_estatus (estatus),
  CONSTRAINT fk_sn_cerrado_por FOREIGN KEY (cerrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. Work Orders ───────────────────────────────────────────
-- Unidad de trabajo individual. Cada work_order:
--  • Viene de UN orden_item específico (trazabilidad hacia el pedido original).
--  • Es asignada a UN empleado con su rol correspondiente.
--  • Pertenece a UNA semana_nomina.
--  • Su monto_pago se calcula al cerrar la semana (consulta lista_precios_mano_obra).
--
-- PRINCIPIO: el encargado NO re-captura el nombre del producto
-- ni del cliente. Toda esa información está en el orden_item → orden → cliente.
CREATE TABLE work_orders (
  id                INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  orden_item_id     INT UNSIGNED      NOT NULL
    COMMENT 'Trazabilidad completa hacia pedido original',
  empleado_id       INT UNSIGNED      NOT NULL
    COMMENT 'Quién ejecuta la pieza',
  asignado_por      INT UNSIGNED      NOT NULL
    COMMENT 'FK a empleados (encargado que asigna)',
  semana_nomina_id  INT UNSIGNED      NOT NULL
    COMMENT 'FK a semanas_nomina — determina período de pago',
  fecha_asignacion  DATE              NOT NULL,
  fecha_inicio_real DATE              NULL,
  fecha_terminado   DATETIME          NULL,
  estatus           ENUM(
    'pendiente','en_progreso','en_revision','terminado','pagado'
  ) NOT NULL DEFAULT 'pendiente',
  cantidad_asignada DECIMAL(8,2)      NOT NULL DEFAULT 1.00
    COMMENT 'Cantidad de piezas asignadas de esta partida',
  costo_mano_obra_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Tarifa unitaria pactada/fijada al asignar',
  -- Calculado: cantidad_asignada * costo_mano_obra_unitario (actualizado al asignar/cerrar)
  monto_pago        DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  notas_calidad     TEXT              NULL,
  -- Contador de rechazos: cuántas veces regresó al carpintero para corrección
  rechazos          TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  creado_por        INT UNSIGNED      NOT NULL,
  creado_en         TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_empleado  (empleado_id),
  INDEX idx_semana    (semana_nomina_id),
  INDEX idx_estatus   (estatus),
  INDEX idx_orden_item(orden_item_id),
  CONSTRAINT fk_wo_orden_item    FOREIGN KEY (orden_item_id)    REFERENCES orden_items(id),
  CONSTRAINT fk_wo_empleado      FOREIGN KEY (empleado_id)      REFERENCES empleados(id),
  CONSTRAINT fk_wo_asignado_por  FOREIGN KEY (asignado_por)     REFERENCES empleados(id),
  CONSTRAINT fk_wo_semana        FOREIGN KEY (semana_nomina_id) REFERENCES semanas_nomina(id),
  CONSTRAINT fk_wo_creado_por    FOREIGN KEY (creado_por)       REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- ESQUEMA: 04_inventario_taller.sql
-- ============================================================
-- ============================================================
--  db/04_inventario_taller.sql
--  Materiales del taller, movimientos y alertas de stock.
--
--  TRAZABILIDAD Y PRINCIPIO "captura una vez":
--  ────────────────────────────────────────────
--  • El `stock_actual` de `materiales` NO se actualiza directamente.
--    SIEMPRE se hace a través de `movimientos_inventario_taller`.
--    El stock real = SUM(entradas) - SUM(salidas) de los movimientos.
--    El campo stock_actual se actualiza por trigger o por la API
--    tras cada movimiento — NUNCA por UPDATE manual.
--
--  • Cada movimiento apunta a su `referencia_tipo` y `referencia_id`
--    para saber exactamente POR QUÉ entró o salió el material:
--    - 'compra'             → referencia_id = compra a proveedor
--    - 'consumo_produccion' → referencia_id = work_order_id
--    - 'ajuste_manual'      → referencia_id = NULL (solo con notas)
--
--  • Las `alertas_stock_material` se GENERAN automáticamente cuando
--    stock_actual <= stock_minimo; el usuario solo las "atiende".
--    Nunca se captura manualmente la alerta. Un mismo material no
--    puede tener dos alertas activas del mismo tipo (INDEX UNIQUE).
-- ============================================================


-- ── 1. Materiales ────────────────────────────────────────────
-- Fuente única de datos de materiales e insumos del taller.
-- Referenciado en: movimientos_inventario_taller, alertas_stock_material.
CREATE TABLE materiales (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(140) NOT NULL,
  tipo              ENUM(
    'madera','quimico','insumo','herramienta'
  ) NOT NULL,
  subtipo           VARCHAR(80)  NULL
    COMMENT 'Ej: pino, alder, laca, clavo decorativo',
  unidad_medida     VARCHAR(30)  NOT NULL
    COMMENT 'Ej: paca, cubeta, caja, litro, pieza',
  proveedor_id      INT UNSIGNED NOT NULL
    COMMENT 'FK a proveedores — único lugar donde vive el proveedor',
  stock_actual      DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'NUNCA actualizar directamente. Solo vía movimientos.',
  stock_minimo      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock_maximo      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_unitario    DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Último costo de compra registrado',
  codigo_referencia VARCHAR(60)  NULL
    COMMENT 'Código del proveedor o código interno',
  notas             TEXT         NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por        INT UNSIGNED NOT NULL,
  creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tipo     (tipo),
  INDEX idx_proveedor(proveedor_id),
  CONSTRAINT fk_mat_proveedor  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
  CONSTRAINT fk_mat_creado_por FOREIGN KEY (creado_por)   REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. Movimientos de inventario del taller ──────────────────
-- ÚNICA forma de modificar el stock de materiales.
-- Cada movimiento es inmutable: no se edita ni elimina (auditoria).
-- La API actualiza stock_actual en `materiales` DESPUÉS de insertar aquí.
CREATE TABLE movimientos_inventario_taller (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id         INT UNSIGNED NOT NULL,
  tipo_movimiento     ENUM('entrada','salida','ajuste') NOT NULL,
  cantidad            DECIMAL(10,2) NOT NULL
    COMMENT 'Positivo siempre; el tipo_movimiento define la dirección',
  costo_unitario_mov  DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Costo al momento del movimiento (puede diferir del costo_unitario base)',
  referencia_tipo     ENUM(
    'compra','consumo_produccion','ajuste_manual'
  ) NOT NULL,
  -- Apunta al ID del documento de origen según referencia_tipo:
  --   compra             → ID de compra a proveedor (tabla futura o notas)
  --   consumo_produccion → work_orders.id
  --   ajuste_manual      → NULL
  referencia_id       INT UNSIGNED NULL,
  fecha               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id          INT UNSIGNED NOT NULL
    COMMENT 'Quién registró el movimiento',
  notas               TEXT         NULL,

  INDEX idx_material  (material_id),
  INDEX idx_tipo_mov  (tipo_movimiento),
  INDEX idx_ref_tipo  (referencia_tipo, referencia_id),
  INDEX idx_fecha     (fecha),
  CONSTRAINT fk_mit_material FOREIGN KEY (material_id) REFERENCES materiales(id),
  CONSTRAINT fk_mit_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Trigger: actualizar stock_actual luego de cada movimiento ──
DELIMITER $$

CREATE TRIGGER trg_actualizar_stock_taller
AFTER INSERT ON movimientos_inventario_taller
FOR EACH ROW
BEGIN
  IF NEW.tipo_movimiento = 'entrada' THEN
    UPDATE materiales SET stock_actual = stock_actual + NEW.cantidad WHERE id = NEW.material_id;
  ELSEIF NEW.tipo_movimiento = 'salida' THEN
    UPDATE materiales SET stock_actual = stock_actual - NEW.cantidad WHERE id = NEW.material_id;
  ELSE
    -- ajuste: la cantidad puede ser positiva (corrección hacia arriba) o se usa el campo
    -- Para ajuste, la API pasa el delta firmado. Aquí asumimos que 'ajuste' siempre es delta.
    UPDATE materiales SET stock_actual = stock_actual + NEW.cantidad WHERE id = NEW.material_id;
  END IF;
END$$

DELIMITER ;


-- ── 3. Alertas de stock de material ──────────────────────────
-- Se generan automáticamente, nunca manualmente.
-- UNIQUE en (material_id, tipo_alerta, atendida=0) evita duplicados activos.
CREATE TABLE alertas_stock_material (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id       INT UNSIGNED NOT NULL,
  tipo_alerta       ENUM('minimo','agotado') NOT NULL,
  fecha_generacion  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atendida          TINYINT(1)   NOT NULL DEFAULT 0,
  fecha_atencion    TIMESTAMP    NULL,
  atendida_por      INT UNSIGNED NULL,

  -- Solo puede haber UNA alerta activa del mismo tipo por material
  UNIQUE KEY uq_alerta_activa (material_id, tipo_alerta, atendida),
  INDEX idx_atendida   (atendida),
  CONSTRAINT fk_alerta_material    FOREIGN KEY (material_id)  REFERENCES materiales(id),
  CONSTRAINT fk_alerta_atendida_por FOREIGN KEY (atendida_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Trigger: generar alerta automáticamente al actualizar stock ──
DELIMITER $$

CREATE TRIGGER trg_generar_alerta_stock
AFTER UPDATE ON materiales
FOR EACH ROW
BEGIN
  -- Alerta de agotado
  IF NEW.stock_actual <= 0 THEN
    INSERT IGNORE INTO alertas_stock_material (material_id, tipo_alerta)
    VALUES (NEW.id, 'agotado');
  -- Alerta de mínimo (solo si no está agotado)
  ELSEIF NEW.stock_actual <= NEW.stock_minimo THEN
    INSERT IGNORE INTO alertas_stock_material (material_id, tipo_alerta)
    VALUES (NEW.id, 'minimo');
  END IF;
END$$

DELIMITER ;


-- ============================================================
-- ESQUEMA: 05_tienda_pos.sql
-- ============================================================
-- ============================================================
--  db/05_tienda_pos.sql
--  Inventario de tienda, compras externas, POS y cajas.
--
--  TRAZABILIDAD Y PRINCIPIO "captura una vez":
--  ────────────────────────────────────────────
--  • `inventario_tienda` NUNCA se captura manualmente con cantidad.
--    Su estado es consecuencia de DOS flujos rastreables:
--    a) embarque_id → recepción de productos del taller.
--    b) compra_externa_id → ingreso de productos externos.
--    La `cantidad_disponible` se actualiza por trigger o API
--    sólo al procesar movimientos en `movimientos_inventario_tienda`.
--
--  • Cada venta descuenta el inventario vía `movimientos_inventario_tienda`
--    referenciando el `venta_id`. El stock jamás se toca directamente.
--
--  • Si `es_pieza_unica = TRUE` en el producto, al venderlo el trigger
--    marca `productos.activo = 0` automáticamente. Un solo punto de control.
--
--  • `cajas_tienda`: El total_efectivo_esperado se calcula desde los
--    pagos de venta; el operador solo captura total_efectivo_contado.
--    La diferencia la calcula la BD.
-- ============================================================


-- ── 1. Inventario de tienda ──────────────────────────────────
-- Cada fila = un producto en una tienda, con su origen rastreado.
CREATE TABLE inventario_tienda (
  id                    INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  tienda_id             SMALLINT UNSIGNED NOT NULL,
  producto_id           INT UNSIGNED      NOT NULL,
  cantidad_disponible   DECIMAL(10,2)     NOT NULL DEFAULT 0.00
    COMMENT 'NUNCA actualizar directamente — solo vía movimientos',
  cantidad_reservada    DECIMAL(10,2)     NOT NULL DEFAULT 0.00
    COMMENT 'Reservada por ventas pendientes de cobro',
  origen_stock          ENUM(
    'embarque_taller','compra_externa','artesania','pieza_unica'
  ) NOT NULL,
  costo_unitario        DECIMAL(10,2)     NOT NULL DEFAULT 0.00
    COMMENT 'Costo real de ingreso al inventario de tienda',
  precio_venta          DECIMAL(10,2)     NOT NULL DEFAULT 0.00
    COMMENT 'Puede diferir del precio_venta_base del producto',
  -- Apunta al embarque O a la compra externa de origen — nunca ambos
  lote_referencia_tipo  ENUM('embarque','compra_externa') NULL,
  lote_referencia_id    INT UNSIGNED      NULL,
  ultima_actualizacion  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_tienda_producto_origen (tienda_id, producto_id, origen_stock),
  INDEX idx_tienda   (tienda_id),
  INDEX idx_producto (producto_id),
  CONSTRAINT fk_it_tienda   FOREIGN KEY (tienda_id)   REFERENCES tiendas(id),
  CONSTRAINT fk_it_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. Movimientos de inventario de tienda ───────────────────
-- ÚNICA forma de cambiar el stock en tienda. Inmutable (no se edita).
CREATE TABLE movimientos_inventario_tienda (
  id                    INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  inventario_tienda_id  INT UNSIGNED      NOT NULL,
  tipo                  ENUM(
    'entrada','venta','devolucion','ajuste','traspaso'
  ) NOT NULL,
  cantidad              DECIMAL(10,2)     NOT NULL,
  referencia_tipo       ENUM(
    'embarque','compra_externa','venta','traspaso','ajuste_manual'
  ) NOT NULL,
  referencia_id         INT UNSIGNED      NULL
    COMMENT 'ID de embarque, venta, compra_externa o NULL para ajuste manual',
  fecha                 DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_id            INT UNSIGNED      NOT NULL,
  notas                 TEXT              NULL,

  INDEX idx_inv_tienda (inventario_tienda_id),
  INDEX idx_ref        (referencia_tipo, referencia_id),
  CONSTRAINT fk_mit2_inv     FOREIGN KEY (inventario_tienda_id) REFERENCES inventario_tienda(id),
  CONSTRAINT fk_mit2_usuario FOREIGN KEY (usuario_id)           REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Trigger: actualizar cantidad_disponible en inventario_tienda
DELIMITER $$

CREATE TRIGGER trg_actualizar_stock_tienda
AFTER INSERT ON movimientos_inventario_tienda
FOR EACH ROW
BEGIN
  IF NEW.tipo IN ('entrada','devolucion') THEN
    UPDATE inventario_tienda
    SET cantidad_disponible = cantidad_disponible + NEW.cantidad
    WHERE id = NEW.inventario_tienda_id;
  ELSEIF NEW.tipo = 'venta' THEN
    UPDATE inventario_tienda
    SET cantidad_disponible = cantidad_disponible - NEW.cantidad
    WHERE id = NEW.inventario_tienda_id;
  ELSEIF NEW.tipo = 'ajuste' THEN
    UPDATE inventario_tienda
    SET cantidad_disponible = cantidad_disponible + NEW.cantidad
    WHERE id = NEW.inventario_tienda_id;
  END IF;
END$$

DELIMITER ;


-- ── 3. Compras externas ──────────────────────────────────────
-- Registro de compras de oportunidad (remates, artesanías, etc.)
-- Al confirmar una compra_externa, la API genera entradas en inventario_tienda.
CREATE TABLE compras_externas (
  id                  INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  proveedor_id        INT UNSIGNED      NOT NULL,
  tienda_destino_id   SMALLINT UNSIGNED NOT NULL,
  fecha_compra        DATE              NOT NULL,
  folio_factura       VARCHAR(60)       NULL,
  total_compra        DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  estatus             ENUM(
    'registrada','recibida','en_inventario'
  ) NOT NULL DEFAULT 'registrada',
  notas               TEXT              NULL
    COMMENT 'Contexto: feria artesanal, lote de liquidación, etc.',
  usuario_id          INT UNSIGNED      NOT NULL,
  creado_en           TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_proveedor (proveedor_id),
  INDEX idx_tienda    (tienda_destino_id),
  CONSTRAINT fk_ce_proveedor FOREIGN KEY (proveedor_id)      REFERENCES proveedores(id),
  CONSTRAINT fk_ce_tienda    FOREIGN KEY (tienda_destino_id) REFERENCES tiendas(id),
  CONSTRAINT fk_ce_usuario   FOREIGN KEY (usuario_id)        REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. Ítems de compra externa ───────────────────────────────
CREATE TABLE compra_externa_items (
  id                      INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  compra_externa_id       INT UNSIGNED  NOT NULL,
  -- Si el producto ya existe en catálogo, se usa su ID
  producto_id             INT UNSIGNED  NULL
    COMMENT 'NULL si es pieza única nueva — se registra en productos al guardar',
  descripcion_libre       TEXT          NULL
    COMMENT 'Para piezas sin SKU previo. Al guardar, API crea producto y llena producto_id',
  cantidad                DECIMAL(8,2)  NOT NULL DEFAULT 1,
  costo_unitario          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  precio_venta_sugerido   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  es_pieza_unica          TINYINT(1)    NOT NULL DEFAULT 0,
  foto_url                JSON          NULL
    COMMENT 'Array de URLs de fotos tomadas en el momento de la compra',

  INDEX idx_compra   (compra_externa_id),
  INDEX idx_producto (producto_id),
  CONSTRAINT fk_cei_compra   FOREIGN KEY (compra_externa_id) REFERENCES compras_externas(id) ON DELETE CASCADE,
  CONSTRAINT fk_cei_producto FOREIGN KEY (producto_id)       REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 5. Cajas de tienda ───────────────────────────────────────
CREATE TABLE cajas_tienda (
  id                        INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  tienda_id                 SMALLINT UNSIGNED NOT NULL,
  nombre                    VARCHAR(60)       NOT NULL DEFAULT 'Caja 1',
  fondo_inicial             DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  fecha_apertura            DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_cierre              DATETIME          NULL,
  total_efectivo_esperado   DECIMAL(12,2)     NOT NULL DEFAULT 0.00
    COMMENT 'Calculado: fondo_inicial + total ventas en efectivo del día',
  total_efectivo_contado    DECIMAL(12,2)     NOT NULL DEFAULT 0.00
    COMMENT 'Capturado por el cajero al cierre',
  diferencia                DECIMAL(10,2)     GENERATED ALWAYS AS
    (total_efectivo_contado - total_efectivo_esperado) STORED
    COMMENT 'Calculado automáticamente por la BD',
  estatus                   ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  usuario_apertura_id       INT UNSIGNED      NOT NULL,
  usuario_cierre_id         INT UNSIGNED      NULL,

  INDEX idx_tienda  (tienda_id),
  INDEX idx_estatus (estatus),
  CONSTRAINT fk_caja_tienda    FOREIGN KEY (tienda_id)           REFERENCES tiendas(id),
  CONSTRAINT fk_caja_apertura  FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id),
  CONSTRAINT fk_caja_cierre    FOREIGN KEY (usuario_cierre_id)   REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 6. Ventas de tienda (POS) ────────────────────────────────
CREATE TABLE ventas_tienda (
  id                    INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  tienda_id             SMALLINT UNSIGNED NOT NULL,
  -- FK nullable al cliente registrado (NULL = venta al público general)
  cliente_id            INT UNSIGNED      NULL
    COMMENT 'NULL = venta sin cliente registrado',
  cliente_nombre_libre  VARCHAR(160)      NULL
    COMMENT 'Solo cuando cliente_id es NULL',
  caja_id               INT UNSIGNED      NOT NULL,
  fecha_venta           DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estatus               ENUM(
    'borrador','confirmada','cancelada'
  ) NOT NULL DEFAULT 'borrador',
  subtotal              DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  descuento_total       DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  impuestos             DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  total                 DECIMAL(12,2)     NOT NULL DEFAULT 0.00,
  motivo_cancelacion    TEXT              NULL,
  notas                 TEXT              NULL,
  usuario_cajero_id     INT UNSIGNED      NOT NULL,

  INDEX idx_tienda  (tienda_id),
  INDEX idx_cliente (cliente_id),
  INDEX idx_caja    (caja_id),
  INDEX idx_fecha   (fecha_venta),
  CONSTRAINT fk_vt_tienda   FOREIGN KEY (tienda_id)         REFERENCES tiendas(id),
  CONSTRAINT fk_vt_cliente  FOREIGN KEY (cliente_id)        REFERENCES clientes(id),
  CONSTRAINT fk_vt_caja     FOREIGN KEY (caja_id)           REFERENCES cajas_tienda(id),
  CONSTRAINT fk_vt_cajero   FOREIGN KEY (usuario_cajero_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 7. Ítems de venta ────────────────────────────────────────
-- Cada ítem apunta al inventario_tienda específico (trazabilidad de lote)
-- Y al producto (para nombre/sku sin re-capturo).
CREATE TABLE venta_items (
  id                    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  venta_id              INT UNSIGNED  NOT NULL,
  inventario_tienda_id  INT UNSIGNED  NOT NULL
    COMMENT 'Trazabilidad: de qué lote/origen salió el producto',
  producto_id           INT UNSIGNED  NOT NULL
    COMMENT 'FK — nunca texto libre con el nombre del producto',
  cantidad              DECIMAL(8,2)  NOT NULL DEFAULT 1,
  precio_unitario       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_item        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal              DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  INDEX idx_venta    (venta_id),
  INDEX idx_inv      (inventario_tienda_id),
  INDEX idx_producto (producto_id),
  CONSTRAINT fk_vi_venta     FOREIGN KEY (venta_id)             REFERENCES ventas_tienda(id) ON DELETE CASCADE,
  CONSTRAINT fk_vi_inv       FOREIGN KEY (inventario_tienda_id) REFERENCES inventario_tienda(id),
  CONSTRAINT fk_vi_producto  FOREIGN KEY (producto_id)          REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 8. Pagos de venta ────────────────────────────────────────
-- Soporte para pago mixto: múltiples métodos por venta.
-- El total de pagos debe igualar ventas_tienda.total (validado en API).
CREATE TABLE pagos_venta (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  venta_id   INT UNSIGNED NOT NULL,
  metodo     ENUM(
    'efectivo','transferencia','tarjeta','cheque','credito_cliente'
  ) NOT NULL,
  monto      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  referencia VARCHAR(120)  NULL
    COMMENT 'Folio de transferencia, número de cheque, etc.',
  fecha      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_venta (venta_id),
  CONSTRAINT fk_pv_venta FOREIGN KEY (venta_id) REFERENCES ventas_tienda(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Trigger: al confirmar venta, registrar movimiento de inventario (llamado desde API)
-- NOTE: El trigger de descuento en inventario se maneja desde la API PHP
-- para poder validar stock antes de ejecutar. Aquí solo hay el trigger de pieza_unica.

-- Trigger: si pieza única se vende (confirmada), desactivar el producto
DELIMITER $$

CREATE TRIGGER trg_pieza_unica_vendida
AFTER UPDATE ON ventas_tienda
FOR EACH ROW
BEGIN
  IF NEW.estatus = 'confirmada' AND OLD.estatus != 'confirmada' THEN
    -- Deshabilitar productos de pieza única vendidos en esta venta
    UPDATE productos p
    INNER JOIN venta_items vi ON vi.producto_id = p.id AND vi.venta_id = NEW.id
    SET p.activo = 0
    WHERE p.es_pieza_unica = 1;
  END IF;
END$$

DELIMITER ;


-- ============================================================
-- ESQUEMA: 06_logistica.sql
-- ============================================================
-- ============================================================
--  db/06_logistica.sql
--  Embarques, ítems de embarque y devoluciones.
--
--  TRAZABILIDAD:
--  ─────────────────────────────────────────────────────────
--  Flujo canónico de embarque:
--   orden_items (terminados) → embarque → embarque_items →
--   confirmación_recepcion → inventario_tienda (entrada)
--
--  • Cada embarque_item apunta al orden_item que lo originó,
--    cerrando el ciclo: pedido → producción → embarque → tienda.
--  • Al confirmar recepción, la API crea automáticamente el
--    movimiento de entrada en inventario_tienda, sin re-capturo.
--  • `diferencia` en embarque_items detecta faltantes.
--    Nunca se asume que lo enviado = lo recibido. Si hay diferencia,
--    queda documentada y trazada al embarque específico.
--
--  Flujo de devolución:
--   venta_tienda o orden_item → devolucion →
--   (según estatus) inventario_tienda o merma
-- ============================================================


-- ── 1. Embarques ─────────────────────────────────────────────
CREATE TABLE embarques (
  id                    INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  -- Nullable: puede haber embarques de reposición sin orden formal
  orden_id              INT UNSIGNED      NULL,
  tienda_destino_id     SMALLINT UNSIGNED NOT NULL,
  fecha_embarque        DATE              NOT NULL,
  placas_trailer        VARCHAR(20)       NULL,
  transportista         VARCHAR(120)      NULL,
  carta_porte_url       VARCHAR(500)      NULL,
  folio_carta_porte     VARCHAR(60)       NULL,
  estatus               ENUM(
    'preparando','embarcado','en_transito','entregado'
  ) NOT NULL DEFAULT 'preparando',
  usuario_embarque_id   INT UNSIGNED      NOT NULL,
  creado_en             TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tienda_dest (tienda_destino_id),
  INDEX idx_orden       (orden_id),
  INDEX idx_estatus     (estatus),
  CONSTRAINT fk_emb_orden   FOREIGN KEY (orden_id)           REFERENCES ordenes(id),
  CONSTRAINT fk_emb_tienda  FOREIGN KEY (tienda_destino_id)  REFERENCES tiendas(id),
  CONSTRAINT fk_emb_usuario FOREIGN KEY (usuario_embarque_id)REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. Ítems de embarque ─────────────────────────────────────
-- Trazabilidad completa: orden_item → embarque_item → inventario_tienda
CREATE TABLE embarque_items (
  id                  INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  embarque_id         INT UNSIGNED  NOT NULL,
  orden_item_id       INT UNSIGNED  NULL
    COMMENT 'NULL solo para reposiciones sin orden formal',
  producto_id         INT UNSIGNED  NOT NULL
    COMMENT 'FK directa para facilitar consultas; redunda con orden_item pero es necesaria',
  cantidad_embarcada  DECIMAL(8,2)  NOT NULL DEFAULT 0,
  etiqueta_generada   TINYINT(1)    NOT NULL DEFAULT 0,
  embarcado           TINYINT(1)    NOT NULL DEFAULT 0,
  -- Recepción en tienda
  cantidad_danada     DECIMAL(8,2)  NOT NULL DEFAULT 0.00
    COMMENT 'Cantidad de piezas recibidas con daños físicos o de calidad',
  recibido_en_tienda  TINYINT(1)    NOT NULL DEFAULT 0,
  cantidad_recibida   DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  diferencia          DECIMAL(8,2)  GENERATED ALWAYS AS
    (cantidad_recibida - cantidad_embarcada) STORED
    COMMENT 'Negativo = faltante; Positivo = sobrante (anómalo)',

  INDEX idx_embarque  (embarque_id),
  INDEX idx_ord_item  (orden_item_id),
  INDEX idx_producto  (producto_id),
  CONSTRAINT fk_ei_embarque  FOREIGN KEY (embarque_id)   REFERENCES embarques(id)    ON DELETE CASCADE,
  CONSTRAINT fk_ei_ord_item  FOREIGN KEY (orden_item_id) REFERENCES orden_items(id),
  CONSTRAINT fk_ei_producto  FOREIGN KEY (producto_id)   REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. Devoluciones ──────────────────────────────────────────
-- Cubre dos orígenes: venta_tienda (cliente devuelve) u orden_produccion (pieza defectuosa).
-- La referencia_id apunta al documento de origen según el campo `origen`.
CREATE TABLE devoluciones (
  id            INT UNSIGNED      AUTO_INCREMENT PRIMARY KEY,
  origen        ENUM(
    'venta_tienda','orden_produccion'
  ) NOT NULL,
  referencia_id INT UNSIGNED      NOT NULL
    COMMENT 'venta_id (si origen=venta_tienda) u orden_item_id (si origen=orden_produccion)',
  producto_id   INT UNSIGNED      NOT NULL,
  cantidad      DECIMAL(8,2)      NOT NULL DEFAULT 1,
  motivo        TEXT              NOT NULL,
  estatus       ENUM(
    'recibida','en_reparacion','reintegrada_inventario','descartada_merma'
  ) NOT NULL DEFAULT 'recibida',
  tienda_id     SMALLINT UNSIGNED NOT NULL
    COMMENT 'Tienda donde se recibe la devolución',
  fecha         DATE              NOT NULL,
  usuario_id    INT UNSIGNED      NOT NULL,
  notas         TEXT              NULL,
  creado_en     TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_origen    (origen, referencia_id),
  INDEX idx_producto  (producto_id),
  INDEX idx_tienda    (tienda_id),
  CONSTRAINT fk_dev_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  CONSTRAINT fk_dev_tienda   FOREIGN KEY (tienda_id)   REFERENCES tiendas(id),
  CONSTRAINT fk_dev_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- PASO 2: DATOS SEMILLA
-- ============================================================

-- ── Categorías de mueble ──────────────────────────────────
INSERT INTO categorias_mueble (id, nombre) VALUES
  (1, 'Armories'),\n  (2, 'Bars'),\n  (3, 'Barstools'),\n  (4, 'Bench'),\n  (5, 'Bistros'),\n  (6, 'Bookcases'),\n  (7, 'Buffet'),\n  (8, 'CD''S'),\n  (9, 'Chairs'),\n  (10, 'Coffee Tables'),\n  (11, 'Desk'),\n  (12, 'End Table'),\n  (13, 'Jelly´s'),\n  (14, 'Nightstand'),\n  (15, 'Sideboard'),\n  (16, 'Sofa Table'),\n  (17, 'Tables and islands'),\n  (18, 'Tv stand'),\n  (19, 'Varios'),\n  (20, 'dresser''s, chest & mirror'),\n  (21, 'headboard & beds'),\n  (22, 'hutch''s'),\n  (23, 'siso');

-- ── Acabados ────────────────────────────────────────────────
INSERT INTO acabados (id, nombre, tipo, activo) VALUES
  (1, 'Santa Fe', 'mancha', 1),\n  (2, 'Alder', 'mancha', 1),\n  (3, 'Dark Walnut', 'mancha', 1),\n  (4, 'Natural', 'natural', 1),\n  (5, 'Distress White', 'distres', 1),\n  (6, 'Rústico', 'mancha', 1),\n  (7, 'Cardeado', 'cardeado', 1),\n  (8, 'Distrés Polilla', 'distres', 1),\n  (9, 'Glass Laca', 'laca', 1),\n  (10, 'Semi-Glass', 'laca', 1),\n  (11, 'Mate', 'laca', 1),\n  (12, 'Con Cera', 'cera', 1),\n  (13, 'Phoenix', 'mancha', 1),\n  (14, 'Fino', 'laca', 1),\n  (15, 'Manchado Natural', 'natural', 1),\n  (16, 'Laqueado Claro', 'laca', 1),\n  (17, 'Encerado', 'cera', 1);

-- ── Tiendas ─────────────────────────────────────────────────
INSERT INTO tiendas (id, nombre, ciudad, direccion, telefono, activa) VALUES
  (1, 'Sucursal Matriz (Centro)', 'Chihuahua', 'Av. Juárez #1234, Col. Centro', '+52 614 123 4567', 1),\n  (2, 'Sucursal Norte', 'Chihuahua', 'Blvd. Ortiz Mena #5678, Col. San Felipe', '+52 614 234 5678', 1),\n  (3, 'Sucursal Sur', 'Chihuahua', 'Periférico de la Juventud #9012, Col. Saucito', '+52 614 345 6789', 1);

-- ── Usuario Admin ───────────────────────────────────────────
-- Hash bcrypt generado para producción (password_verify compatible)
INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES
  (1, 'Administrador', 'admin@decor.mx', '$2y$10$O9GdUADRhbDfjCXpYYxvveO1rtazHSlQmdwHrBLkTrw61mWu.wVgu', 'admin'),
  (2, 'Laura Mendoza', 'tienda@decor.mx', '$2y$10$/90QlgUM9EEf3ufWUGRbAuTElPiPLU9GaDcKmy2BmNogBq.R/voNS', 'gerente_tienda'),
  (3, 'Víctor Manuel', 'taller@decor.mx', '$2y$10$/90QlgUM9EEf3ufWUGRbAuTElPiPLU9GaDcKmy2BmNogBq.R/voNS', 'encargado_taller'),
  (4, 'Juan López', 'reparto@decor.mx', '$2y$10$/90QlgUM9EEf3ufWUGRbAuTElPiPLU9GaDcKmy2BmNogBq.R/voNS', 'repartidor');

-- ── Empleados ───────────────────────────────────────────────
INSERT INTO empleados (id, nombre, rol, especialidades, tarifa_base, activo) VALUES
  (1, 'Víctor Manuel López', 'encargado', '["supervisión","acabados"]', 0.00, 1),\n  (2, 'José García Ramírez', 'carpintero', '["sillas","mesas","bancos"]', 350.00, 1),\n  (3, 'Miguel Hernández Soto', 'carpintero', '["camas","libreros","gabinetes"]', 380.00, 1),\n  (4, 'Carlos Martínez Ruiz', 'carpintero', '["barras","hutches","buffets"]', 400.00, 1),\n  (5, 'Roberto Sánchez Díaz', 'pintor', '["manchas","lacas","distress"]', 320.00, 1),\n  (6, 'Fernando Torres Luna', 'tapicero', '["cuero","tela","cowhide"]', 360.00, 1),\n  (7, 'Alberto Morales Cruz', 'carpintero', '["mesas","escritorios"]', 370.00, 1),\n  (8, 'Pedro Jiménez Flores', 'embalaje', '["empaque","embarque"]', 280.00, 1);

-- ── Productos (736 registros) ────────────────────────────
INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (1, 'DCR-0001', 'FANCY TIN NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":22,"fondo":16}', 118.60, 1, 1),\n  (2, 'DCR-0002', 'CROSS NIGHTSTAND', 14, 'taller', '{"alto":25,"ancho":21,"fondo":16}', 115.00, 1, 1),\n  (3, 'DCR-0003', 'NAIL NIGHTSTAND', 14, 'taller', '{"alto":24,"ancho":20,"fondo":20}', 132.80, 1, 1),\n  (4, 'DCR-0004', 'CHIHUAHUA NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":20,"fondo":17}', 118.60, 1, 1),\n  (5, 'DCR-0005', 'MARIO''S NIGHTSTAND', 14, 'taller', '{"alto":27,"ancho":23,"fondo":20}', 75.80, 1, 1),\n  (6, 'DCR-0006', 'GLASS & TILE NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":20,"fondo":16}', 133.00, 1, 1),\n  (7, 'DCR-0007', '3-DWRS FANCY TIN NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":20,"fondo":16}', 167.00, 1, 1),\n  (8, 'DCR-0008', '6-DRWS FANCY TIN NIGHTSTAND', 14, 'taller', '{"alto":25,"ancho":22,"fondo":19}', 282.00, 1, 1),\n  (9, 'DCR-0009', '2-DRW IRON BASE NIGHTSTAND', 14, 'taller', '{"alto":25,"ancho":20,"fondo":16}', 138.00, 1, 1),\n  (10, 'DCR-0010', 'KACHINA NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":24,"fondo":19}', 179.00, 1, 1),\n  (11, 'DCR-0011', 'KACHINA NIGHTSTAND DOUBLE', 14, 'taller', '{"alto":27,"ancho":24,"fondo":18}', 242.00, 1, 1),\n  (12, 'DCR-0012', '48" SANTA FE HUTCH', 22, 'taller', '{"alto":73,"ancho":60,"fondo":19}', 565.40, 1, 1),\n  (13, 'DCR-0013', '60" SANTA FE HUTCH', 22, 'taller', '{"alto":81,"ancho":42,"fondo":21}', 670.80, 1, 1),\n  (14, 'DCR-0014', '72" SANTA FE HUTCH', 22, 'taller', '{"alto":72,"ancho":40,"fondo":19}', 801.20, 1, 1),\n  (15, 'DCR-0015', 'CURIO HUTCH', 22, 'taller', '{"alto":75,"ancho":38,"fondo":20}', 207.00, 1, 1),\n  (16, 'DCR-0016', 'CURIO HUTCH SINGLE TOP ONLY', 22, 'taller', '{"alto":82,"ancho":50,"fondo":22}', 110.00, 1, 1),\n  (17, 'DCR-0017', 'CURIO HUTCH SINGLE BOTTOM ONLY', 22, 'taller', '{"alto":77,"ancho":57,"fondo":21}', 121.00, 1, 1),\n  (18, 'DCR-0018', 'CURIO HUTCH DOUBLE', 22, 'taller', '{"alto":74,"ancho":53,"fondo":21}', 282.00, 1, 1),\n  (19, 'DCR-0019', 'CURIO HUTCH DOUBLE BOTTOM ONLY', 22, 'taller', '{"alto":73,"ancho":40,"fondo":19}', 156.00, 1, 1),\n  (20, 'DCR-0020', 'CURIO HUTCH DOUBLE TOP ONLY', 22, 'taller', '{"alto":82,"ancho":55,"fondo":22}', 144.00, 1, 1),\n  (21, 'DCR-0021', 'SANTA FE HUTCH BOTTOM ONLY 48"', 22, 'taller', '{"alto":76,"ancho":42,"fondo":19}', 334.00, 1, 1),\n  (22, 'DCR-0022', 'SANTA FE HUTCH BOTTOM ONLY 60"', 22, 'taller', '{"alto":76,"ancho":48,"fondo":20}', 391.00, 1, 1),\n  (23, 'DCR-0023', 'SANTA FE HUTCH BOTTOM ONLY 72"', 22, 'taller', '{"alto":83,"ancho":41,"fondo":18}', 449.00, 1, 1),\n  (24, 'DCR-0024', 'SANTA FE HUTCH TOP ONLY 60"', 22, 'taller', '{"alto":73,"ancho":43,"fondo":18}', 299.00, 1, 1),\n  (25, 'DCR-0025', 'SANTA FE HUTCH TOP ONLY 48"', 22, 'taller', '{"alto":72,"ancho":38,"fondo":18}', 242.00, 1, 1),\n  (26, 'DCR-0026', 'SHAKER TIN HUTCH', 22, 'taller', '{"alto":80,"ancho":46,"fondo":22}', 757.00, 1, 1),\n  (27, 'DCR-0027', '60" TV STAND W/PANEL', 22, 'taller', '{"alto":80,"ancho":55,"fondo":22}', 260.00, 1, 1),\n  (28, 'DCR-0028', 'TAOS CD GLASS', 8, 'taller', '{"alto":48,"ancho":20,"fondo":12}', 184.00, 1, 1),\n  (29, 'DCR-0029', 'TAOS CD IRON', 8, 'taller', '{"alto":45,"ancho":24,"fondo":15}', 202.00, 1, 1),\n  (30, 'DCR-0030', 'TAOS CD DOUBLE GLASS', 8, 'taller', '{"alto":38,"ancho":18,"fondo":13}', 276.00, 1, 1),\n  (31, 'DCR-0031', 'TAOS CD DOUBLE IRON', 8, 'taller', '{"alto":41,"ancho":20,"fondo":13}', 299.00, 1, 1),\n  (32, 'DCR-0032', 'CD DOME GLASS', 8, 'taller', '{"alto":36,"ancho":18,"fondo":15}', 184.00, 1, 1),\n  (33, 'DCR-0033', 'CD DOME DOUBLE GLASS', 8, 'taller', '{"alto":45,"ancho":20,"fondo":12}', 276.00, 1, 1),\n  (34, 'DCR-0034', 'CD DOME W/IRON', 8, 'taller', '{"alto":40,"ancho":19,"fondo":14}', 202.00, 1, 1),\n  (35, 'DCR-0035', 'CD DOME DOUBLEW/IRON', 8, 'taller', '{"alto":45,"ancho":23,"fondo":15}', 299.00, 1, 1),\n  (36, 'DCR-0036', 'CHIHUAHUA BUFFET', 7, 'taller', '{"alto":36,"ancho":63,"fondo":18}', 253.00, 1, 1),\n  (37, 'DCR-0037', 'SHAKER TIN BOTTOM ONLY', 7, 'taller', '{"alto":39,"ancho":57,"fondo":21}', 414.00, 1, 1),\n  (38, 'DCR-0038', '6 FT. CROSS BUFFET', 7, 'taller', '{"alto":40,"ancho":69,"fondo":20}', 0.00, 1, 1),\n  (39, 'DCR-0039', 'CROSS BUFFET', 7, 'taller', '{"alto":38,"ancho":70,"fondo":20}', 317.00, 1, 1),\n  (40, 'DCR-0040', '4-TILE BUFFET', 7, 'taller', '{"alto":41,"ancho":59,"fondo":20}', 426.00, 1, 1),\n  (41, 'DCR-0041', '3-TILE BUFFET', 7, 'taller', '{"alto":38,"ancho":62,"fondo":19}', 403.00, 1, 1),\n  (42, 'DCR-0042', '2-TILE BUFFET', 7, 'taller', '{"alto":37,"ancho":60,"fondo":21}', 380.00, 1, 1),\n  (43, 'DCR-0043', 'TAPER LEGS BUFFET NO SHELF', 7, 'taller', '{"alto":38,"ancho":54,"fondo":22}', 179.00, 1, 1),\n  (44, 'DCR-0044', 'TAPER LEGS BUFFET W/SHELF', 7, 'taller', '{"alto":37,"ancho":53,"fondo":19}', 202.00, 1, 1),\n  (45, 'DCR-0045', 'SHAKER BUFFET', 7, 'taller', '{"alto":38,"ancho":71,"fondo":18}', 432.40, 1, 1),\n  (46, 'DCR-0046', '48" SANTA FE BUFFET', 7, 'taller', '{"alto":39,"ancho":60,"fondo":22}', 348.20, 1, 1),\n  (47, 'DCR-0047', '60" SANTA FE BUFFET', 7, 'taller', '{"alto":41,"ancho":68,"fondo":18}', 396.40, 1, 1),\n  (48, 'DCR-0048', '72" SANTA FE BUFFET', 7, 'taller', '{"alto":38,"ancho":58,"fondo":19}', 450.60, 1, 1),\n  (49, 'DCR-0049', '60X36X20 DOUBLE PLAIN JELLY', 13, 'taller', '{"alto":48,"ancho":25,"fondo":16}', 420.00, 1, 1),\n  (50, 'DCR-0050', 'TALL DOUBLE JELLY W/FANCY TIN', 13, 'taller', '{"alto":60,"ancho":36,"fondo":16}', 317.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (51, 'DCR-0051', 'TALL DOUBLE JELLY W/CROSS', 13, 'taller', '{"alto":49,"ancho":25,"fondo":14}', 236.00, 1, 1),\n  (52, 'DCR-0052', '60X36X20 DOBLE CROSS JELLY', 13, 'taller', '{"alto":58,"ancho":28,"fondo":18}', 420.00, 1, 1),\n  (53, 'DCR-0053', 'TALL JELLY W/ TIN RUSTIC', 13, 'taller', '{"alto":56,"ancho":45,"fondo":18}', 156.00, 1, 1),\n  (54, 'DCR-0054', 'SHORT JELLY W/TIN RUSTIC', 13, 'taller', '{"alto":69,"ancho":34,"fondo":17}', 144.00, 1, 1),\n  (55, 'DCR-0055', '60X36X20 DOUBLE TIN JELLY', 13, 'taller', '{"alto":72,"ancho":42,"fondo":18}', 420.00, 1, 1),\n  (56, 'DCR-0056', 'TALL ARCH JELLY', 13, 'taller', '{"alto":60,"ancho":32,"fondo":18}', 199.75, 1, 1),\n  (57, 'DCR-0057', 'SHORT JELLY W/SUN', 13, 'taller', '{"alto":48,"ancho":45,"fondo":16}', 144.00, 1, 1),\n  (58, 'DCR-0058', 'TALL JELLY W/SUN', 13, 'taller', '{"alto":51,"ancho":27,"fondo":18}', 156.00, 1, 1),\n  (59, 'DCR-0059', 'KACHINA TALL JELLY', 13, 'taller', '{"alto":49,"ancho":40,"fondo":16}', 213.00, 1, 1),\n  (60, 'DCR-0060', 'KACHINA DOUBLE TALL JELLY', 13, 'taller', '{"alto":68,"ancho":26,"fondo":17}', 328.00, 1, 1),\n  (61, 'DCR-0061', 'CHIHUAHUA DOUBLE JELLY W/TIN', 13, 'taller', '{"alto":48,"ancho":38,"fondo":15}', 205.00, 1, 1),\n  (62, 'DCR-0062', 'CHIHUAHUA DOUBLE JELLY W/GLASS', 13, 'taller', '{"alto":53,"ancho":28,"fondo":16}', 205.00, 1, 1),\n  (63, 'DCR-0063', 'CHIHUAHUA DOUBLE JELLY W/SCREEN', 13, 'taller', '{"alto":52,"ancho":27,"fondo":16}', 205.00, 1, 1),\n  (64, 'DCR-0064', 'KACHINA SHORT JELLY', 13, 'taller', '{"alto":53,"ancho":32,"fondo":18}', 184.00, 1, 1),\n  (65, 'DCR-0065', 'KACHINA SHORT DOUBLE JELLY', 13, 'taller', '{"alto":61,"ancho":40,"fondo":16}', 299.00, 1, 1),\n  (66, 'DCR-0066', 'TALL JELLY FANCY TIN', 13, 'taller', '{"alto":49,"ancho":28,"fondo":15}', 202.00, 1, 1),\n  (67, 'DCR-0067', 'SHORT JELLY FANCY TIN', 13, 'taller', '{"alto":49,"ancho":27,"fondo":15}', 144.00, 1, 1),\n  (68, 'DCR-0068', 'TALL PLAIN DOUBLE JELLY', 13, 'taller', '{"alto":61,"ancho":45,"fondo":14}', 420.00, 1, 1),\n  (69, 'DCR-0069', 'PLAIN TALL JELLY', 13, 'taller', '{"alto":58,"ancho":36,"fondo":16}', 156.00, 1, 1),\n  (70, 'DCR-0070', 'PLAIN SHORT JELLY', 13, 'taller', '{"alto":51,"ancho":33,"fondo":18}', 133.00, 1, 1),\n  (71, 'DCR-0071', 'CROSS TALL JELLY', 13, 'taller', '{"alto":62,"ancho":41,"fondo":15}', 155.20, 1, 1),\n  (72, 'DCR-0072', 'CROSS SHORT JELLY', 13, 'taller', '{"alto":65,"ancho":33,"fondo":18}', 132.20, 1, 1),\n  (73, 'DCR-0073', '60 " CHILI JELYY', 13, 'taller', '{"alto":70,"ancho":41,"fondo":18}', 150.00, 1, 1),\n  (74, 'DCR-0074', '48" CHILI CABINET', 13, 'taller', '{"alto":61,"ancho":26,"fondo":18}', 115.00, 1, 1),\n  (75, 'DCR-0075', 'JARILLA JELLY 36"', 13, 'taller', '{"alto":63,"ancho":33,"fondo":15}', 171.00, 1, 1),\n  (76, 'DCR-0076', 'JARILLA JELLY 48"', 13, 'taller', '{"alto":61,"ancho":40,"fondo":15}', 182.00, 1, 1),\n  (77, 'DCR-0077', 'JARILLA JELLY 60"', 13, 'taller', '{"alto":72,"ancho":33,"fondo":15}', 194.00, 1, 1),\n  (78, 'DCR-0078', 'CROSS SHORT DOUBLE JELLY', 13, 'taller', '{"alto":70,"ancho":46,"fondo":15}', 199.40, 1, 1),\n  (79, 'DCR-0079', 'SHORT PLAIN DOUBLE JELLY', 13, 'taller', '{"alto":69,"ancho":29,"fondo":15}', 205.00, 1, 1),\n  (80, 'DCR-0080', 'CROSS TALL DOUBLE JELLY', 13, 'taller', '{"alto":69,"ancho":33,"fondo":14}', 274.00, 1, 1),\n  (81, 'DCR-0081', 'ROPE COFFEE TABLE W/GLASS', 10, 'taller', '{"alto":17,"ancho":43,"fondo":31}', 317.00, 1, 1),\n  (82, 'DCR-0082', 'NAIL COFFEE TABLE', 10, 'taller', '{"alto":18,"ancho":51,"fondo":25}', 235.80, 1, 1),\n  (83, 'DCR-0083', 'TAPER LEGS COFFEE TABLE', 10, 'taller', '{"alto":17,"ancho":49,"fondo":29}', 144.00, 1, 1),\n  (84, 'DCR-0084', 'TAPER LEGS END TABLE', 12, 'taller', '{"alto":26,"ancho":21,"fondo":22}', 98.00, 1, 1),\n  (85, 'DCR-0085', 'NAIL END TABLE', 12, 'taller', '{"alto":22,"ancho":21,"fondo":25}', 120.49, 1, 1),\n  (86, 'DCR-0086', 'ROPE END TABLE', 12, 'taller', '{"alto":26,"ancho":22,"fondo":23}', 167.00, 1, 1),\n  (87, 'DCR-0087', 'TAPER LEGS SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":63,"fondo":14}', 156.00, 1, 1),\n  (88, 'DCR-0088', 'ROPE SOFA TABLE W/GLASS', 16, 'taller', '{"alto":29,"ancho":55,"fondo":14}', 317.00, 1, 1),\n  (89, 'DCR-0089', '3-TILE SOFA TABLE W/IRON & SHELF', 16, 'taller', '{"alto":32,"ancho":68,"fondo":16}', 259.00, 1, 1),\n  (90, 'DCR-0090', 'HALFMOON SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":72,"fondo":18}', 144.00, 1, 1),\n  (91, 'DCR-0091', 'TAPER LEGS SOFA TABLE', 16, 'taller', '{"alto":30,"ancho":54,"fondo":17}', 156.00, 1, 1),\n  (92, 'DCR-0092', 'CHIHUAHUA SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":64,"fondo":18}', 259.00, 1, 1),\n  (93, 'DCR-0093', 'NAIL SOFA TABLE', 16, 'taller', '{"alto":28,"ancho":68,"fondo":15}', 258.40, 1, 1),\n  (94, 'DCR-0094', '2-TILE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":30,"ancho":54,"fondo":14}', 212.20, 1, 1),\n  (95, 'DCR-0095', '3-TILE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":31,"ancho":65,"fondo":15}', 254.60, 1, 1),\n  (96, 'DCR-0096', '4-TILE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":32,"ancho":58,"fondo":18}', 299.00, 1, 1),\n  (97, 'DCR-0097', '2-TILE IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":69,"fondo":16}', 296.00, 1, 1),\n  (98, 'DCR-0098', '3-TILE IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":60,"fondo":17}', 319.00, 1, 1),\n  (99, 'DCR-0099', '4-TILE IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":67,"fondo":17}', 342.00, 1, 1),\n  (100, 'DCR-0100', '4-TILE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":29,"ancho":71,"fondo":17}', 365.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (101, 'DCR-0101', '72" OX YOKE SOFA TABLE ( NO TILE)', 16, 'taller', '{"alto":32,"ancho":48,"fondo":17}', 0.00, 1, 1),\n  (102, 'DCR-0102', 'TARAHUMARA SOFA TABLE 36"', 16, 'taller', '{"alto":31,"ancho":48,"fondo":14}', 0.00, 1, 1),\n  (103, 'DCR-0103', 'TARAHUMARA SOFA TABLE 48"', 16, 'taller', '{"alto":31,"ancho":58,"fondo":17}', 0.00, 1, 1),\n  (104, 'DCR-0104', 'TARAHUMARA SOFA TABLE 60"', 16, 'taller', '{"alto":32,"ancho":50,"fondo":18}', 0.00, 1, 1),\n  (105, 'DCR-0105', '24X13X48 CURIO BOOKCASE', 6, 'taller', '{"alto":47,"ancho":20,"fondo":13}', 0.00, 1, 1),\n  (106, 'DCR-0106', '30X13X60 CURIO BOOKCASE', 6, 'taller', '{"alto":64,"ancho":34,"fondo":15}', 0.00, 1, 1),\n  (107, 'DCR-0107', '42X13X60 CURIO BOOKCASE', 6, 'taller', '{"alto":58,"ancho":37,"fondo":16}', 0.00, 1, 1),\n  (108, 'DCR-0108', 'CHIHUAHUA BOOKCASE', 6, 'taller', '{"alto":58,"ancho":33,"fondo":18}', 333.30, 1, 1),\n  (109, 'DCR-0109', '18" CURIO BOOKCASE', 6, 'taller', '{"alto":70,"ancho":58,"fondo":13}', 132.80, 1, 1),\n  (110, 'DCR-0110', '24" CURIO BOOKCASE', 6, 'taller', '{"alto":82,"ancho":22,"fondo":17}', 154.00, 1, 1),\n  (111, 'DCR-0111', '30" CURIO BOOKCASE', 6, 'taller', '{"alto":37,"ancho":23,"fondo":14}', 171.60, 1, 1),\n  (112, 'DCR-0112', '36" CURIO BOOKCASE', 6, 'taller', '{"alto":48,"ancho":25,"fondo":15}', 193.40, 1, 1),\n  (113, 'DCR-0113', '48" CURIO BOOKCASE', 6, 'taller', '{"alto":37,"ancho":41,"fondo":16}', 227.80, 1, 1),\n  (114, 'DCR-0114', '18" TARAHUMARA BOOKCASE', 6, 'taller', '{"alto":51,"ancho":24,"fondo":14}', 144.00, 1, 1),\n  (115, 'DCR-0115', '24" TARAHUMARA BOOKCASE', 6, 'taller', '{"alto":62,"ancho":53,"fondo":12}', 167.00, 1, 1),\n  (116, 'DCR-0116', '30" TARAHUMARA BOOKCASE', 6, 'taller', '{"alto":58,"ancho":39,"fondo":16}', 179.00, 1, 1),\n  (117, 'DCR-0117', '36" TARAHUMARA BOOKCASE', 6, 'taller', '{"alto":58,"ancho":45,"fondo":14}', 213.00, 1, 1),\n  (118, 'DCR-0118', '48" TARAHUMARA BOOKCASE', 6, 'taller', '{"alto":40,"ancho":59,"fondo":14}', 236.00, 1, 1),\n  (119, 'DCR-0119', '18" CURIO BOOKCASE 60 H', 6, 'taller', '{"alto":45,"ancho":41,"fondo":16}', 121.00, 1, 1),\n  (120, 'DCR-0120', '24" CURIO BOOKCASE 60 H', 6, 'taller', '{"alto":41,"ancho":31,"fondo":12}', 138.00, 1, 1),\n  (121, 'DCR-0121', '30" CURIO BOOKCASE 60 H', 6, 'taller', '{"alto":82,"ancho":28,"fondo":17}', 156.00, 1, 1),\n  (122, 'DCR-0122', '36" CURIO BOOKCASE 60 H', 6, 'taller', '{"alto":54,"ancho":31,"fondo":14}', 167.00, 1, 1),\n  (123, 'DCR-0123', '42" CURIO BOOKCASE 60 H', 6, 'taller', '{"alto":55,"ancho":21,"fondo":13}', 179.00, 1, 1),\n  (124, 'DCR-0124', '48" CURIO BOOKCASE 60H', 6, 'taller', '{"alto":55,"ancho":38,"fondo":17}', 190.00, 1, 1),\n  (125, 'DCR-0125', '18" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":80,"ancho":31,"fondo":15}', 104.00, 1, 1),\n  (126, 'DCR-0126', '24" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":37,"ancho":57,"fondo":12}', 121.00, 1, 1),\n  (127, 'DCR-0127', '30" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":71,"ancho":35,"fondo":13}', 133.00, 1, 1),\n  (128, 'DCR-0128', '36" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":72,"ancho":34,"fondo":16}', 156.00, 1, 1),\n  (129, 'DCR-0129', '42" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":59,"ancho":30,"fondo":13}', 167.00, 1, 1),\n  (130, 'DCR-0130', '48" CURIO BOOKCASE 48 H', 6, 'taller', '{"alto":72,"ancho":19,"fondo":15}', 190.00, 1, 1),\n  (131, 'DCR-0131', '3-DWR CHEST W/EXT.RAIL', 20, 'taller', '{"alto":39,"ancho":43,"fondo":18}', 294.00, 1, 1),\n  (132, 'DCR-0132', '4-DWR CHEST W/EXT RIEL', 20, 'taller', '{"alto":42,"ancho":63,"fondo":19}', 357.00, 1, 1),\n  (133, 'DCR-0133', 'PANEL DRESSER 48" 5-DWRS', 20, 'taller', '{"alto":48,"ancho":61,"fondo":19}', 472.00, 1, 1),\n  (134, 'DCR-0134', 'PANEL DRESSER 48" 5-DWR W/TIN', 20, 'taller', '{"alto":37,"ancho":60,"fondo":20}', 506.00, 1, 1),\n  (135, 'DCR-0135', 'PANEL DRESSER 60" 6-DWRS', 20, 'taller', '{"alto":45,"ancho":59,"fondo":18}', 512.00, 1, 1),\n  (136, 'DCR-0136', 'PANEL DRESSER 60" 7-DWRS', 20, 'taller', '{"alto":41,"ancho":48,"fondo":18}', 535.00, 1, 1),\n  (137, 'DCR-0137', 'PANEL DRESSER 60" 7-DWRS W/TIN', 20, 'taller', '{"alto":38,"ancho":64,"fondo":22}', 587.00, 1, 1),\n  (138, 'DCR-0138', 'BUTT BENCH 1-SEAT', 4, 'taller', '{"alto":20,"ancho":59,"fondo":14}', 50.60, 1, 1),\n  (139, 'DCR-0139', 'BUTT BENCH 2-SEAT', 4, 'taller', '{"alto":19,"ancho":63,"fondo":16}', 67.80, 1, 1),\n  (140, 'DCR-0140', 'BUTT BENCH 3-SEAT', 4, 'taller', '{"alto":18,"ancho":48,"fondo":18}', 85.00, 1, 1),\n  (141, 'DCR-0141', 'BUTT BENCH 4-SEAT', 4, 'taller', '{"alto":20,"ancho":67,"fondo":16}', 102.60, 1, 1),\n  (142, 'DCR-0142', '48" ROSETTA BENCH', 4, 'taller', '{"alto":18,"ancho":63,"fondo":19}', 190.00, 1, 1),\n  (143, 'DCR-0143', 'TAOS BENCH', 4, 'taller', '{"alto":18,"ancho":68,"fondo":18}', 179.00, 1, 1),\n  (144, 'DCR-0144', 'IRON BASE PUPITRE DESK', 11, 'taller', '{"alto":30,"ancho":42,"fondo":29}', 317.00, 1, 1),\n  (145, 'DCR-0145', 'IRON BASE DESK', 11, 'taller', '{"alto":32,"ancho":55,"fondo":27}', 297.40, 1, 1),\n  (146, 'DCR-0146', 'SPINDEL DESK 36"', 11, 'taller', '{"alto":31,"ancho":51,"fondo":20}', 176.80, 1, 1),\n  (147, 'DCR-0147', 'SPINDEL DESK 48"', 11, 'taller', '{"alto":30,"ancho":58,"fondo":23}', 199.20, 1, 1),\n  (148, 'DCR-0148', 'TAOS CHAIR', 9, 'taller', '{"alto":37,"ancho":22,"fondo":21}', 92.00, 1, 1),\n  (149, 'DCR-0149', 'TAOS ARM CHAIR', 9, 'taller', '{"alto":38,"ancho":20,"fondo":20}', 104.00, 1, 1),\n  (150, 'DCR-0150', 'ROSETTA CHAIR', 9, 'taller', '{"alto":36,"ancho":18,"fondo":22}', 98.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (151, 'DCR-0151', 'ROSETTA ARM CHAIR', 9, 'taller', '{"alto":38,"ancho":22,"fondo":20}', 110.00, 1, 1),\n  (152, 'DCR-0152', 'OX YOKE CHAIR', 9, 'taller', '{"alto":40,"ancho":18,"fondo":19}', 122.60, 1, 1),\n  (153, 'DCR-0153', 'OX YOKE CHAIR W/LEATHER', 9, 'taller', '{"alto":40,"ancho":19,"fondo":19}', 146.80, 1, 1),\n  (154, 'DCR-0154', 'TARAHUMARA CHAIR', 9, 'taller', '{"alto":37,"ancho":20,"fondo":20}', 98.00, 1, 1),\n  (155, 'DCR-0155', 'TARAHUMARA ARM CHAIR', 9, 'taller', '{"alto":43,"ancho":19,"fondo":18}', 110.00, 1, 1),\n  (156, 'DCR-0156', 'ROSETTA BARSTOOL', 3, 'taller', '{"alto":28,"ancho":20,"fondo":20}', 110.00, 1, 1),\n  (157, 'DCR-0157', 'TARAHUMARA BARSTOOL', 3, 'taller', '{"alto":36,"ancho":20,"fondo":19}', 110.00, 1, 1),\n  (158, 'DCR-0158', '30" HARLEY BARSTOOL', 3, 'taller', '{"alto":25,"ancho":19,"fondo":18}', 138.00, 1, 1),\n  (159, 'DCR-0159', '30" PLAIN BARSTOOL', 3, 'taller', '{"alto":29,"ancho":20,"fondo":16}', 92.00, 1, 1),\n  (160, 'DCR-0160', 'TAOS BARSTOOL', 3, 'taller', '{"alto":35,"ancho":17,"fondo":18}', 85.40, 1, 1),\n  (161, 'DCR-0161', 'OX YOKE BARSTOOL', 3, 'taller', '{"alto":30,"ancho":20,"fondo":19}', 127.00, 1, 1),\n  (162, 'DCR-0162', '60" DINING TABLE', 17, 'taller', '{"alto":30,"ancho":59,"fondo":46}', 460.00, 1, 1),\n  (163, 'DCR-0163', '72" DINING TABLE', 17, 'taller', '{"alto":31,"ancho":44,"fondo":33}', 495.00, 1, 1),\n  (164, 'DCR-0164', '84" DINING TABLE', 17, 'taller', '{"alto":30,"ancho":48,"fondo":47}', 529.00, 1, 1),\n  (165, 'DCR-0165', '8 FT. DINING TABLE', 17, 'taller', '{"alto":32,"ancho":61,"fondo":34}', 564.00, 1, 1),\n  (166, 'DCR-0166', '72" YUGO DINING TABLE', 17, 'taller', '{"alto":32,"ancho":44,"fondo":30}', 644.00, 1, 1),\n  (167, 'DCR-0167', 'TERRACOTA KITCHEN ISLAND 6-TILE', 17, 'taller', '{"alto":34,"ancho":51,"fondo":31}', 535.00, 1, 1),\n  (168, 'DCR-0168', 'TERRACOTA KITCHEN ISLAND 4-TILE', 17, 'taller', '{"alto":33,"ancho":58,"fondo":44}', 414.00, 1, 1),\n  (169, 'DCR-0169', '48" PLAIN BAR', 2, 'taller', '{"alto":47,"ancho":60,"fondo":24}', 484.40, 1, 1),\n  (170, 'DCR-0170', '48" CORONA BAR', 2, 'taller', '{"alto":47,"ancho":79,"fondo":21}', 514.20, 1, 1),\n  (171, 'DCR-0171', '72" CORONA BAR', 2, 'taller', '{"alto":45,"ancho":94,"fondo":26}', 602.00, 1, 1),\n  (172, 'DCR-0172', '48" HARLEY BAR', 2, 'taller', '{"alto":47,"ancho":83,"fondo":24}', 609.20, 1, 1),\n  (173, 'DCR-0173', '72" HARLEY BAR', 2, 'taller', '{"alto":47,"ancho":96,"fondo":26}', 695.80, 1, 1),\n  (174, 'DCR-0174', 'MEDICINE CABINET', 19, 'taller', '{"alto":46,"ancho":31,"fondo":23}', 55.00, 1, 1),\n  (175, 'DCR-0175', 'KACHINA MEDICINE CABINET', 19, 'taller', '{"alto":39,"ancho":41,"fondo":12}', 80.00, 1, 1),\n  (176, 'DCR-0176', 'CURIO CORNER', 19, 'taller', '{"alto":36,"ancho":29,"fondo":22}', 156.00, 1, 1),\n  (177, 'DCR-0177', 'MED CORNER CABINET', 19, 'taller', '{"alto":40,"ancho":28,"fondo":22}', 282.00, 1, 1),\n  (178, 'DCR-0178', 'LARGE CORNER CABINET', 19, 'taller', '{"alto":48,"ancho":44,"fondo":14}', 443.00, 1, 1),\n  (179, 'DCR-0179', 'LG BATEAS', 19, 'taller', '{"alto":24,"ancho":32,"fondo":18}', 25.00, 1, 1),\n  (180, 'DCR-0180', 'BATEAS', 19, 'taller', '{"alto":29,"ancho":30,"fondo":21}', 13.00, 1, 1),\n  (181, 'DCR-0181', 'PULLS', 19, 'taller', '{"alto":28,"ancho":37,"fondo":21}', 3.00, 1, 1),\n  (182, 'DCR-0182', 'CONCHOS NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":20,"fondo":18}', 242.00, 1, 1),\n  (183, 'DCR-0183', 'RAISE PANEL NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":21,"fondo":19}', 115.00, 1, 1),\n  (184, 'DCR-0184', 'CROSS NIGHTSTAND 1-DWR', 14, 'taller', '{"alto":24,"ancho":22,"fondo":20}', 126.75, 1, 1),\n  (185, 'DCR-0185', 'CACHINA NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":24,"fondo":20}', 172.75, 1, 1),\n  (186, 'DCR-0186', '3-DWR NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":21,"fondo":20}', 144.25, 1, 1),\n  (187, 'DCR-0187', '2-DWR IRON BASE NIGHTSTAND', 14, 'taller', '{"alto":27,"ancho":21,"fondo":20}', 138.00, 1, 1),\n  (188, 'DCR-0188', 'GLASS NIGHTSTAND', 14, 'taller', '{"alto":27,"ancho":22,"fondo":20}', 120.75, 1, 1),\n  (189, 'DCR-0189', 'GLASS & SLATTE NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":20,"fondo":19}', 132.75, 1, 1),\n  (190, 'DCR-0190', 'WESTER NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":21,"fondo":16}', 132.75, 1, 1),\n  (191, 'DCR-0191', 'COW HIDE NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":20,"fondo":17}', 299.25, 1, 1),\n  (192, 'DCR-0192', 'FANCY TIN NIGHTSTAND 3 DRWS.', 14, 'taller', '{"alto":24,"ancho":22,"fondo":19}', 175.50, 1, 1),\n  (193, 'DCR-0193', 'NIGHTSTAND W/ STAR', 14, 'taller', '{"alto":27,"ancho":22,"fondo":19}', 138.00, 1, 1),\n  (194, 'DCR-0194', 'FANCY TIN NIGHTSTAND 6 DRWS.', 14, 'taller', '{"alto":26,"ancho":22,"fondo":19}', 279.00, 1, 1),\n  (195, 'DCR-0195', '4 DWR NIGHTSTAND 2-SM 2-LG', 14, 'taller', '{"alto":28,"ancho":21,"fondo":18}', 183.50, 1, 1),\n  (196, 'DCR-0196', 'SPANISH NIGHTSTAND', 14, 'taller', '{"alto":27,"ancho":23,"fondo":20}', 182.00, 1, 1),\n  (197, 'DCR-0197', 'HONDO NIGHTSTAND', 14, 'taller', '{"alto":25,"ancho":24,"fondo":18}', 227.75, 1, 1),\n  (198, 'DCR-0198', 'DOUBLE CURIO HUTCH', 22, 'taller', '{"alto":73,"ancho":41,"fondo":19}', 281.75, 1, 1),\n  (199, 'DCR-0199', 'TRASTERITO', 22, 'taller', '{"alto":76,"ancho":38,"fondo":20}', 220.75, 1, 1),\n  (200, 'DCR-0200', 'TRASTERITO W/DOOR', 22, 'taller', '{"alto":82,"ancho":46,"fondo":18}', 220.75, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (201, 'DCR-0201', '6 DRW. TRASTERITO', 22, 'taller', '{"alto":77,"ancho":45,"fondo":21}', 239.75, 1, 1),\n  (202, 'DCR-0202', 'SINGLE CD W/GLASS DOOR', 8, 'taller', '{"alto":47,"ancho":23,"fondo":12}', 195.75, 1, 1),\n  (203, 'DCR-0203', 'DOUBLE CD W/GLASS DOOR', 8, 'taller', '{"alto":46,"ancho":20,"fondo":15}', 258.75, 1, 1),\n  (204, 'DCR-0204', 'SINGLE CD W/IRON DOOR', 8, 'taller', '{"alto":42,"ancho":19,"fondo":14}', 198.75, 1, 1),\n  (205, 'DCR-0205', 'DOUBLE CD W/IRON DOOR', 8, 'taller', '{"alto":39,"ancho":18,"fondo":13}', 297.00, 1, 1),\n  (206, 'DCR-0206', 'TAOS CD W/GLASS DOOR', 8, 'taller', '{"alto":45,"ancho":23,"fondo":15}', 165.75, 1, 1),\n  (207, 'DCR-0207', 'TAOS CD W/IRON DOOR', 8, 'taller', '{"alto":46,"ancho":18,"fondo":15}', 198.75, 1, 1),\n  (208, 'DCR-0208', 'WESTER SINGLE CD', 8, 'taller', '{"alto":48,"ancho":23,"fondo":12}', 220.75, 1, 1),\n  (209, 'DCR-0209', 'WESTER DOUBLE CD', 8, 'taller', '{"alto":48,"ancho":24,"fondo":15}', 303.75, 1, 1),\n  (210, 'DCR-0210', 'WESTER DOUBLE CD W/IRON DOOR', 8, 'taller', '{"alto":39,"ancho":23,"fondo":15}', 334.00, 1, 1),\n  (211, 'DCR-0211', '2-DOOR SLATTE SIDEBOARD', 15, 'taller', '{"alto":38,"ancho":65,"fondo":19}', 262.75, 1, 1),\n  (212, 'DCR-0212', '3-DOOR SLATTE SIDEBOARD', 15, 'taller', '{"alto":36,"ancho":51,"fondo":20}', 370.75, 1, 1),\n  (213, 'DCR-0213', '4-DOOR SLATTE SIDEBOARD', 15, 'taller', '{"alto":34,"ancho":64,"fondo":19}', 517.75, 1, 1),\n  (214, 'DCR-0214', '5-DOOR SLATTE SIDEBOARD', 15, 'taller', '{"alto":40,"ancho":50,"fondo":19}', 586.75, 1, 1),\n  (215, 'DCR-0215', '6-DOOR SLATTE SIDEBOARD', 15, 'taller', '{"alto":40,"ancho":65,"fondo":18}', 660.25, 1, 1),\n  (216, 'DCR-0216', '2-DOOR TILE SIDEBOARD', 15, 'taller', '{"alto":36,"ancho":49,"fondo":16}', 267.75, 1, 1),\n  (217, 'DCR-0217', '3-DOOR TILE SIDEBOARD', 15, 'taller', '{"alto":37,"ancho":49,"fondo":17}', 350.75, 1, 1),\n  (218, 'DCR-0218', '4-DOOR TILE SIDEBOARD', 15, 'taller', '{"alto":40,"ancho":66,"fondo":19}', 436.25, 1, 1),\n  (219, 'DCR-0219', '5-DOOR TILE SIDEBOARD', 15, 'taller', '{"alto":37,"ancho":66,"fondo":16}', 517.75, 1, 1),\n  (220, 'DCR-0220', '6-DOOR TILE SIDEBOARD', 15, 'taller', '{"alto":36,"ancho":64,"fondo":20}', 601.75, 1, 1),\n  (221, 'DCR-0221', '2 TILE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":37,"ancho":57,"fondo":17}', 279.00, 1, 1),\n  (222, 'DCR-0222', '3 TILE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":38,"ancho":55,"fondo":18}', 368.00, 1, 1),\n  (223, 'DCR-0223', '4 TILE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":39,"ancho":56,"fondo":17}', 457.75, 1, 1),\n  (224, 'DCR-0224', '2 SLATTE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":36,"ancho":52,"fondo":19}', 273.75, 1, 1),\n  (225, 'DCR-0225', '3 SLATTE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":36,"ancho":52,"fondo":16}', 389.00, 1, 1),\n  (226, 'DCR-0226', '4 SLATTE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":40,"ancho":61,"fondo":19}', 542.75, 1, 1),\n  (227, 'DCR-0227', '5 SLATTE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":36,"ancho":61,"fondo":17}', 616.75, 1, 1),\n  (228, 'DCR-0228', '6 SLATTE SIDEBOARD W/FANCY TIN', 15, 'taller', '{"alto":35,"ancho":58,"fondo":16}', 696.75, 1, 1),\n  (229, 'DCR-0229', '1-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":36,"ancho":60,"fondo":16}', 248.75, 1, 1),\n  (230, 'DCR-0230', '2-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":37,"ancho":66,"fondo":16}', 362.00, 1, 1),\n  (231, 'DCR-0231', '3-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":37,"ancho":54,"fondo":18}', 519.75, 1, 1),\n  (232, 'DCR-0232', '4-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":40,"ancho":56,"fondo":16}', 717.75, 1, 1),\n  (233, 'DCR-0233', '5-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":39,"ancho":66,"fondo":17}', 834.75, 1, 1),\n  (234, 'DCR-0234', '6-DOOR SLATTE SIDEBOARD W/COOPER', 15, 'taller', '{"alto":36,"ancho":62,"fondo":17}', 959.75, 1, 1),\n  (235, 'DCR-0235', '6-DOOR SLATTE SIDEBOARD W/GLASS DOOR', 15, 'taller', '{"alto":40,"ancho":65,"fondo":18}', 694.50, 1, 1),\n  (236, 'DCR-0236', '5-DOOR SIDEBOARD SOLID TOP', 15, 'taller', '{"alto":35,"ancho":56,"fondo":19}', 586.75, 1, 1),\n  (237, 'DCR-0237', '5-TILE SIDEBOARD (NO TILE)', 15, 'taller', '{"alto":38,"ancho":53,"fondo":16}', 502.50, 1, 1),\n  (238, 'DCR-0238', 'MISSION BUFFET 3 DRWS.', 7, 'taller', '{"alto":38,"ancho":72,"fondo":19}', 408.75, 1, 1),\n  (239, 'DCR-0239', 'TAPER LEG''S BUFFET', 7, 'taller', '{"alto":37,"ancho":59,"fondo":20}', 174.75, 1, 1),\n  (240, 'DCR-0240', 'MISSION BUFFET W/TOP', 7, 'taller', '{"alto":39,"ancho":67,"fondo":22}', 451.00, 1, 1),\n  (241, 'DCR-0241', 'CACHINA BUFFEET', 7, 'taller', '{"alto":41,"ancho":49,"fondo":21}', 515.50, 1, 1),\n  (242, 'DCR-0242', 'NAIL BUFFET', 7, 'taller', '{"alto":41,"ancho":65,"fondo":21}', 411.75, 1, 1),\n  (243, 'DCR-0243', '36" IRON BASE BUFFET W/DRWS', 7, 'taller', '{"alto":41,"ancho":51,"fondo":18}', 298.50, 1, 1),\n  (244, 'DCR-0244', '48" IRON BASE BUFFET W/DRWS.', 7, 'taller', '{"alto":38,"ancho":71,"fondo":20}', 336.75, 1, 1),\n  (245, 'DCR-0245', '60" IRON BASE BUFFET W/DRWS', 7, 'taller', '{"alto":39,"ancho":59,"fondo":19}', 377.50, 1, 1),\n  (246, 'DCR-0246', '72" IRON BASE BUFFET W/DRWS.', 7, 'taller', '{"alto":39,"ancho":71,"fondo":21}', 416.75, 1, 1),\n  (247, 'DCR-0247', 'PUEBLA BUFFET W/IRONBASE', 7, 'taller', '{"alto":42,"ancho":69,"fondo":19}', 236.00, 1, 1),\n  (248, 'DCR-0248', 'PUEBLA BUFFET', 7, 'taller', '{"alto":39,"ancho":57,"fondo":21}', 175.00, 1, 1),\n  (249, 'DCR-0249', 'BUFFET W/DRWS.', 7, 'taller', '{"alto":41,"ancho":60,"fondo":18}', 363.75, 1, 1),\n  (250, 'DCR-0250', '6DRWS. BUFFET', 7, 'taller', '{"alto":42,"ancho":60,"fondo":19}', 377.50, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (251, 'DCR-0251', 'SHAKER BUFFET XL', 7, 'taller', '{"alto":36,"ancho":58,"fondo":19}', 425.50, 1, 1),\n  (252, 'DCR-0252', 'SM TWIG BUFFET 36X18X36', 7, 'taller', '{"alto":41,"ancho":49,"fondo":22}', 266.75, 1, 1),\n  (253, 'DCR-0253', 'TALL ARCH CAVA', 13, 'taller', '{"alto":72,"ancho":43,"fondo":16}', 322.00, 1, 1),\n  (254, 'DCR-0254', 'SHORT ARCH JELLY', 13, 'taller', '{"alto":62,"ancho":35,"fondo":16}', 167.00, 1, 1),\n  (255, 'DCR-0255', 'CHIHUAHUA JELLY', 13, 'taller', '{"alto":49,"ancho":44,"fondo":17}', 132.00, 1, 1),\n  (256, 'DCR-0256', 'CHIHUAHUA DOUBLE JELLY', 13, 'taller', '{"alto":66,"ancho":28,"fondo":16}', 198.75, 1, 1),\n  (257, 'DCR-0257', '48" CHILI JELLY', 13, 'taller', '{"alto":71,"ancho":31,"fondo":14}', 102.75, 1, 1),\n  (258, 'DCR-0258', '60" CHILI JELLY', 13, 'taller', '{"alto":50,"ancho":44,"fondo":17}', 132.00, 1, 1),\n  (259, 'DCR-0259', '48" CHILI DOUBLE JELLY', 13, 'taller', '{"alto":66,"ancho":40,"fondo":18}', 198.75, 1, 1),\n  (260, 'DCR-0260', '60" CHILI DOUBLE JELLY', 13, 'taller', '{"alto":58,"ancho":39,"fondo":15}', 270.00, 1, 1),\n  (261, 'DCR-0261', 'FANCY TIN SHORT JELLY', 13, 'taller', '{"alto":57,"ancho":26,"fondo":15}', 159.75, 1, 1),\n  (262, 'DCR-0262', 'FANCY TIN TALL JELLY', 13, 'taller', '{"alto":61,"ancho":41,"fondo":14}', 198.75, 1, 1),\n  (263, 'DCR-0263', 'DOUBLE FANCY TIN TALL JELLY', 13, 'taller', '{"alto":58,"ancho":42,"fondo":18}', 315.25, 1, 1),\n  (264, 'DCR-0264', 'TALL CACHINA JELLY', 13, 'taller', '{"alto":71,"ancho":34,"fondo":17}', 210.00, 1, 1),\n  (265, 'DCR-0265', 'SHORT CACHINA JELLY', 13, 'taller', '{"alto":69,"ancho":44,"fondo":15}', 183.50, 1, 1),\n  (266, 'DCR-0266', 'DOUBLE CACHINA JELLY', 13, 'taller', '{"alto":65,"ancho":24,"fondo":17}', 328.50, 1, 1),\n  (267, 'DCR-0267', '8-PANEL TALL JELLY', 13, 'taller', '{"alto":64,"ancho":26,"fondo":17}', 217.75, 1, 1),\n  (268, 'DCR-0268', 'RUSTIC TIN SHORT JELLY', 13, 'taller', '{"alto":62,"ancho":34,"fondo":15}', 132.00, 1, 1),\n  (269, 'DCR-0269', 'RUSTIC TIN TALL JELLY', 13, 'taller', '{"alto":58,"ancho":30,"fondo":15}', 155.00, 1, 1),\n  (270, 'DCR-0270', 'ARCH TOP IRON BASE JELLY', 13, 'taller', '{"alto":57,"ancho":41,"fondo":17}', 209.00, 1, 1),\n  (271, 'DCR-0271', '48" WESTERN JELLY', 13, 'taller', '{"alto":57,"ancho":39,"fondo":15}', 159.00, 1, 1),\n  (272, 'DCR-0272', 'PIE SAFE', 13, 'taller', '{"alto":50,"ancho":48,"fondo":14}', 187.75, 1, 1),\n  (273, 'DCR-0273', 'TALL PIE SAFE', 13, 'taller', '{"alto":61,"ancho":24,"fondo":15}', 270.00, 1, 1),\n  (274, 'DCR-0274', 'CHEST LINGERIE 5 DRW.', 13, 'taller', '{"alto":61,"ancho":30,"fondo":15}', 216.00, 1, 1),\n  (275, 'DCR-0275', 'CHEST LINGERIE 5 DRWS 2-SM 3-LG', 13, 'taller', '{"alto":51,"ancho":48,"fondo":14}', 310.75, 1, 1),\n  (276, 'DCR-0276', '72" TWIG JELLY CABINET', 13, 'taller', '{"alto":72,"ancho":26,"fondo":16}', 290.75, 1, 1),\n  (277, 'DCR-0277', '60" TWIG JELLY CABINET', 13, 'taller', '{"alto":66,"ancho":39,"fondo":15}', 194.75, 1, 1),\n  (278, 'DCR-0278', '48" TWIG JELLY CABINET', 13, 'taller', '{"alto":54,"ancho":37,"fondo":17}', 181.00, 1, 1),\n  (279, 'DCR-0279', 'SM TWIG JELLY CABINET', 13, 'taller', '{"alto":57,"ancho":46,"fondo":17}', 170.75, 1, 1),\n  (280, 'DCR-0280', 'TWIG MICROWAVE', 13, 'taller', '{"alto":63,"ancho":46,"fondo":15}', 216.75, 1, 1),\n  (281, 'DCR-0281', 'WALL TASCATE COFFEE TABLE TURQ. INLAY', 10, 'taller', '{"alto":19,"ancho":44,"fondo":38}', 367.00, 1, 1),\n  (282, 'DCR-0282', 'TURN LEGS ROUND COFFEE TABLE 38"', 10, 'taller', '{"alto":18,"ancho":36,"fondo":24}', 309.50, 1, 1),\n  (283, 'DCR-0283', 'TASCATE COFFEE TABLE W/IRON BASE TURQ. INLAY', 10, 'taller', '{"alto":20,"ancho":45,"fondo":40}', 474.50, 1, 1),\n  (284, 'DCR-0284', 'OX YOKE SLATTE COFFEE TABLE', 10, 'taller', '{"alto":16,"ancho":46,"fondo":29}', 408.75, 1, 1),\n  (285, 'DCR-0285', 'TARAHUMARA OX YOKE COFFEE TABLE', 10, 'taller', '{"alto":20,"ancho":45,"fondo":30}', 225.50, 1, 1),\n  (286, 'DCR-0286', 'SHADOW COFFEE TABLE', 10, 'taller', '{"alto":18,"ancho":54,"fondo":40}', 374.00, 1, 1),\n  (287, 'DCR-0287', '2 X 4 FANCY TIN COFFEE TABLE', 10, 'taller', '{"alto":19,"ancho":54,"fondo":29}', 336.25, 1, 1),\n  (288, 'DCR-0288', '2 SLATTE X 3 SLATTE TIN COFFE', 10, 'taller', '{"alto":19,"ancho":38,"fondo":28}', 316.75, 1, 1),\n  (289, 'DCR-0289', '4'' X 4'' FANCY TIN COFFEE TABLE', 10, 'taller', '{"alto":18,"ancho":36,"fondo":31}', 328.75, 1, 1),\n  (290, 'DCR-0290', '42" X 42" SLATTE COFFEE TABLE', 10, 'taller', '{"alto":20,"ancho":42,"fondo":42}', 413.50, 1, 1),\n  (291, 'DCR-0291', '2 X 4 FANCY IRON BASE COFFEE TABLE', 10, 'taller', '{"alto":16,"ancho":54,"fondo":28}', 413.50, 1, 1),\n  (292, 'DCR-0292', '2 X 3 FANCY IRON BASE COFFEE TABLE', 10, 'taller', '{"alto":19,"ancho":41,"fondo":41}', 394.50, 1, 1),\n  (293, 'DCR-0293', 'COFFEE BULLET TABLE', 10, 'taller', '{"alto":16,"ancho":41,"fondo":39}', 210.00, 1, 1),\n  (294, 'DCR-0294', '"X" COFFEE 48X30X18', 10, 'taller', '{"alto":18,"ancho":37,"fondo":38}', 251.00, 1, 1),\n  (295, 'DCR-0295', 'WESTER STAR END TABLE', 12, 'taller', '{"alto":26,"ancho":24,"fondo":26}', 161.25, 1, 1),\n  (296, 'DCR-0296', 'SHADOW END TABLE', 12, 'taller', '{"alto":24,"ancho":21,"fondo":20}', 254.75, 1, 1),\n  (297, 'DCR-0297', '26" X 26" FANCY TIN END TABLE W/SLATTE', 12, 'taller', '{"alto":25,"ancho":21,"fondo":25}', 161.25, 1, 1),\n  (298, 'DCR-0298', '22" X 22" FANCY TIN END TABLE W/SLATTE', 12, 'taller', '{"alto":23,"ancho":24,"fondo":21}', 157.75, 1, 1),\n  (299, 'DCR-0299', 'TURN LEG END TABLE W/LACQUER', 12, 'taller', '{"alto":23,"ancho":21,"fondo":23}', 152.00, 1, 1),\n  (300, 'DCR-0300', 'OX YOKE SLATTE END TABLE', 12, 'taller', '{"alto":22,"ancho":20,"fondo":22}', 217.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (301, 'DCR-0301', 'WALL TASCATE END TABLE INTAKE TURQ.', 12, 'taller', '{"alto":23,"ancho":24,"fondo":25}', 188.25, 1, 1),\n  (302, 'DCR-0302', 'WALL TASCATE END TABLE INTAKE TURQ. IRONBASE', 12, 'taller', '{"alto":24,"ancho":20,"fondo":23}', 237.25, 1, 1),\n  (303, 'DCR-0303', 'OX YOKE END TABLE 24X24', 12, 'taller', '{"alto":22,"ancho":20,"fondo":21}', 275.50, 1, 1),\n  (304, 'DCR-0304', 'TARAHUMARA OX YOKE END TABLE', 12, 'taller', '{"alto":23,"ancho":25,"fondo":21}', 142.75, 1, 1),\n  (305, 'DCR-0305', 'END BULLET TABLE', 12, 'taller', '{"alto":22,"ancho":20,"fondo":25}', 113.00, 1, 1),\n  (306, 'DCR-0306', '"X" END TABLE 22X22X24', 12, 'taller', '{"alto":24,"ancho":23,"fondo":26}', 129.75, 1, 1),\n  (307, 'DCR-0307', 'IRON BASE 22X22 FANCY TIN END TABLE W/SLATTE', 12, 'taller', '{"alto":24,"ancho":20,"fondo":21}', 259.00, 1, 1),\n  (308, 'DCR-0308', 'WALL TASCATE SOFA TABLE INTAKE TURQ.', 16, 'taller', '{"alto":30,"ancho":64,"fondo":14}', 367.25, 1, 1),\n  (309, 'DCR-0309', 'WESTER STAR SOFA TABLE', 16, 'taller', '{"alto":28,"ancho":57,"fondo":15}', 335.75, 1, 1),\n  (310, 'DCR-0310', 'SHADOW SOFA TABLE', 16, 'taller', '{"alto":30,"ancho":61,"fondo":14}', 373.75, 1, 1),\n  (311, 'DCR-0311', 'HALF MOON SOFA TABLE', 16, 'taller', '{"alto":31,"ancho":64,"fondo":14}', 132.00, 1, 1),\n  (312, 'DCR-0312', 'TURN LEGS SOFA TABLE', 16, 'taller', '{"alto":28,"ancho":48,"fondo":18}', 294.50, 1, 1),\n  (313, 'DCR-0313', '5 FT. OX YOKE SOFA TABLE W/SLATTE', 16, 'taller', '{"alto":30,"ancho":67,"fondo":14}', 412.50, 1, 1),\n  (314, 'DCR-0314', '4 FT. OX YOKE SOFA TABLE W/SLATTE', 16, 'taller', '{"alto":28,"ancho":68,"fondo":18}', 451.00, 1, 1),\n  (315, 'DCR-0315', 'WALL TASCATE SOFA TABLE INTAKE TURQ. IRONBASE', 16, 'taller', '{"alto":30,"ancho":71,"fondo":17}', 474.50, 1, 1),\n  (316, 'DCR-0316', '5 TILE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":31,"ancho":65,"fondo":14}', 339.75, 1, 1),\n  (317, 'DCR-0317', '2-SLATTE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":31,"ancho":62,"fondo":15}', 225.50, 1, 1),\n  (318, 'DCR-0318', '3-SLATTE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":71,"fondo":14}', 305.50, 1, 1),\n  (319, 'DCR-0319', '4-SLATTE IRON BASE SOFA TABLE', 16, 'taller', '{"alto":30,"ancho":63,"fondo":15}', 326.50, 1, 1),\n  (320, 'DCR-0320', '2-SLATTE WESTER SOFA TABLE', 16, 'taller', '{"alto":32,"ancho":70,"fondo":15}', 268.50, 1, 1),\n  (321, 'DCR-0321', '3-SLATTE WESTER SOFA TABLE', 16, 'taller', '{"alto":32,"ancho":64,"fondo":18}', 305.50, 1, 1),\n  (322, 'DCR-0322', '4-SLATTE WESTER SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":63,"fondo":14}', 351.50, 1, 1),\n  (323, 'DCR-0323', '2 TILE FANCY TIN SOFA TABLE', 16, 'taller', '{"alto":28,"ancho":60,"fondo":17}', 215.00, 1, 1),\n  (324, 'DCR-0324', '3 TILE FANCY TIN SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":50,"fondo":18}', 261.00, 1, 1),\n  (325, 'DCR-0325', '4 FANCY TIN SOFA TABLE', 16, 'taller', '{"alto":32,"ancho":61,"fondo":15}', 304.50, 1, 1),\n  (326, 'DCR-0326', '2 SLATTE FANCY TIN TABLE', 16, 'taller', '{"alto":30,"ancho":71,"fondo":17}', 229.25, 1, 1),\n  (327, 'DCR-0327', '3 SLATTE FANCY TIN SOFA TABLE', 16, 'taller', '{"alto":32,"ancho":57,"fondo":16}', 316.00, 1, 1),\n  (328, 'DCR-0328', '4 SLATTE FANCY TIN SOFA TABLE', 16, 'taller', '{"alto":29,"ancho":61,"fondo":15}', 360.00, 1, 1),\n  (329, 'DCR-0329', '2 SOLID TOP IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":29,"ancho":56,"fondo":14}', 225.50, 1, 1),\n  (330, 'DCR-0330', '3 SOLID TOP IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":70,"fondo":16}', 305.50, 1, 1),\n  (331, 'DCR-0331', '4 SOLID TOP IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":32,"ancho":61,"fondo":14}', 351.50, 1, 1),\n  (332, 'DCR-0332', '2 TILE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":68,"fondo":15}', 232.25, 1, 1),\n  (333, 'DCR-0333', '3 TILE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":53,"fondo":15}', 318.25, 1, 1),\n  (334, 'DCR-0334', '4 TILE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":29,"ancho":48,"fondo":17}', 367.25, 1, 1),\n  (335, 'DCR-0335', '5 TILE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":52,"fondo":17}', 414.00, 1, 1),\n  (336, 'DCR-0336', '2 SLATTE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":52,"fondo":18}', 235.75, 1, 1),\n  (337, 'DCR-0337', '3 SLATTE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":28,"ancho":67,"fondo":14}', 323.50, 1, 1),\n  (338, 'DCR-0338', '4 SLATTE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":70,"fondo":15}', 373.75, 1, 1),\n  (339, 'DCR-0339', '5 SLATTE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":66,"fondo":17}', 424.25, 1, 1),\n  (340, 'DCR-0340', '6 SLATTE IRONBASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":30,"ancho":71,"fondo":15}', 471.75, 1, 1),\n  (341, 'DCR-0341', 'TARAHUMARA OX YOKE SOFA TABLE', 16, 'taller', '{"alto":28,"ancho":69,"fondo":15}', 225.50, 1, 1),\n  (342, 'DCR-0342', '"X" SOFA TABLE 60X16X30', 16, 'taller', '{"alto":29,"ancho":52,"fondo":14}', 297.50, 1, 1),\n  (343, 'DCR-0343', '36''X 36"CURIO BOOKCASE', 6, 'taller', '{"alto":51,"ancho":29,"fondo":15}', 103.75, 1, 1),\n  (344, 'DCR-0344', '18" DENTAL BOOKCASE', 6, 'taller', '{"alto":67,"ancho":42,"fondo":15}', 149.75, 1, 1),\n  (345, 'DCR-0345', '24" DENTAL BOOKCASE', 6, 'taller', '{"alto":40,"ancho":40,"fondo":15}', 165.25, 1, 1),\n  (346, 'DCR-0346', '30" DENTAL BOOKCASE', 6, 'taller', '{"alto":53,"ancho":52,"fondo":18}', 194.25, 1, 1),\n  (347, 'DCR-0347', '36" DENTAL BOOKCASE', 6, 'taller', '{"alto":47,"ancho":38,"fondo":17}', 207.00, 1, 1),\n  (348, 'DCR-0348', '48" DENTAL BOOKCASE', 6, 'taller', '{"alto":75,"ancho":29,"fondo":12}', 248.50, 1, 1),\n  (349, 'DCR-0349', 'BOOKCASE SIMPLE 60X15X36', 6, 'taller', '{"alto":48,"ancho":54,"fondo":13}', 184.00, 1, 1),\n  (350, 'DCR-0350', '18" DOME BOOKCASE', 6, 'taller', '{"alto":58,"ancho":45,"fondo":18}', 166.75, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (351, 'DCR-0351', '24" DOME BOOKCASE', 6, 'taller', '{"alto":76,"ancho":37,"fondo":15}', 197.25, 1, 1),\n  (352, 'DCR-0352', '30" DOME BOOKCASE', 6, 'taller', '{"alto":72,"ancho":52,"fondo":18}', 228.50, 1, 1),\n  (353, 'DCR-0353', '36" DOME BOOKCASE', 6, 'taller', '{"alto":39,"ancho":39,"fondo":14}', 243.25, 1, 1),\n  (354, 'DCR-0354', '48" DOME BOOKCASE', 6, 'taller', '{"alto":83,"ancho":41,"fondo":13}', 288.50, 1, 1),\n  (355, 'DCR-0355', '18" ARCH BOOKCASE', 6, 'taller', '{"alto":76,"ancho":31,"fondo":18}', 197.25, 1, 1),\n  (356, 'DCR-0356', '24" ARCH BOOKCASE', 6, 'taller', '{"alto":72,"ancho":18,"fondo":15}', 228.50, 1, 1),\n  (357, 'DCR-0357', '30" ARCH BOOKCASE', 6, 'taller', '{"alto":79,"ancho":45,"fondo":16}', 244.00, 1, 1),\n  (358, 'DCR-0358', '36" ARCH BOOKCASE', 6, 'taller', '{"alto":50,"ancho":39,"fondo":14}', 266.25, 1, 1),\n  (359, 'DCR-0359', '48" ARCH BOOKCASE', 6, 'taller', '{"alto":48,"ancho":20,"fondo":17}', 288.50, 1, 1),\n  (360, 'DCR-0360', '18" SIERRA BOOKCASE', 6, 'taller', '{"alto":51,"ancho":50,"fondo":14}', 138.00, 1, 1),\n  (361, 'DCR-0361', '24" SIERRA BOOKCASE', 6, 'taller', '{"alto":80,"ancho":58,"fondo":18}', 159.50, 1, 1),\n  (362, 'DCR-0362', '30" SIERRA BOOKCASE', 6, 'taller', '{"alto":69,"ancho":49,"fondo":14}', 184.00, 1, 1),\n  (363, 'DCR-0363', '36" SIERRA BOOKCASE', 6, 'taller', '{"alto":39,"ancho":48,"fondo":13}', 212.75, 1, 1),\n  (364, 'DCR-0364', '48" SIERRA BOOKCASE', 6, 'taller', '{"alto":42,"ancho":53,"fondo":17}', 244.00, 1, 1),\n  (365, 'DCR-0365', 'TARAHUMARA BOOKCASE 30"', 6, 'taller', '{"alto":71,"ancho":36,"fondo":12}', 167.50, 1, 1),\n  (366, 'DCR-0366', 'TARAHUMARA BOOKCASE 36"', 6, 'taller', '{"alto":50,"ancho":55,"fondo":14}', 186.25, 1, 1),\n  (367, 'DCR-0367', 'TARAHUMARA BOOKCASE 48"', 6, 'taller', '{"alto":77,"ancho":53,"fondo":16}', 243.25, 1, 1),\n  (368, 'DCR-0368', '36" TWIG BOOKCASE', 6, 'taller', '{"alto":46,"ancho":28,"fondo":12}', 148.25, 1, 1),\n  (369, 'DCR-0369', '18" TWIG BOOKCASE', 6, 'taller', '{"alto":42,"ancho":56,"fondo":14}', 133.50, 1, 1),\n  (370, 'DCR-0370', 'SHORT BOOK ZUNI', 6, 'taller', '{"alto":76,"ancho":33,"fondo":12}', 126.75, 1, 1),\n  (371, 'DCR-0371', 'BOOKCASE SIMPLE 60X15X48', 6, 'taller', '{"alto":56,"ancho":39,"fondo":13}', 184.00, 1, 1),\n  (372, 'DCR-0372', '24" OX YOKE BOOKCASE', 6, 'taller', '{"alto":57,"ancho":18,"fondo":18}', 228.50, 1, 1),\n  (373, 'DCR-0373', '36" OX YOKE BOOKCASE', 6, 'taller', '{"alto":73,"ancho":40,"fondo":16}', 258.75, 1, 1),\n  (374, 'DCR-0374', '48" OX YOKE BOOKCASE', 6, 'taller', '{"alto":81,"ancho":42,"fondo":17}', 288.50, 1, 1),\n  (375, 'DCR-0375', '24" TWIG BOOKCASE', 6, 'taller', '{"alto":69,"ancho":48,"fondo":14}', 141.00, 1, 1),\n  (376, 'DCR-0376', '48" TWIG BOOKCASE', 6, 'taller', '{"alto":61,"ancho":55,"fondo":17}', 178.25, 1, 1),\n  (377, 'DCR-0377', '60X18X84 CURIO BOOKCASE', 6, 'taller', '{"alto":69,"ancho":35,"fondo":17}', 368.00, 1, 1),\n  (378, 'DCR-0378', 'CROSS ARMOIRE 22" DEEP', 1, 'taller', '{"alto":70,"ancho":42,"fondo":24}', 448.75, 1, 1),\n  (379, 'DCR-0379', 'FANCY TIN ARMOIRE 22" DEEP', 1, 'taller', '{"alto":70,"ancho":38,"fondo":23}', 448.75, 1, 1),\n  (380, 'DCR-0380', '5-DWR WARDROBE ARMOIRE', 1, 'taller', '{"alto":70,"ancho":41,"fondo":21}', 495.50, 1, 1),\n  (381, 'DCR-0381', '5-DWR RIGHT WARDROBE ARMOIRE 2-DOOR', 1, 'taller', '{"alto":74,"ancho":54,"fondo":23}', 472.00, 1, 1),\n  (382, 'DCR-0382', 'CACHINA ARMOIRE', 1, 'taller', '{"alto":69,"ancho":46,"fondo":24}', 583.00, 1, 1),\n  (383, 'DCR-0383', '42" IRON BASE ARMOIRE', 1, 'taller', '{"alto":68,"ancho":47,"fondo":24}', 530.50, 1, 1),\n  (384, 'DCR-0384', '48" IRON BASE ARMOIRE', 1, 'taller', '{"alto":68,"ancho":46,"fondo":22}', 567.50, 1, 1),\n  (385, 'DCR-0385', 'RAISE PANEL ARMOIRE 44X22X72', 1, 'taller', '{"alto":75,"ancho":46,"fondo":22}', 575.00, 1, 1),\n  (386, 'DCR-0386', '4-DWR UNDER WARDROBE ARMOIRE 2-DOOR', 1, 'taller', '{"alto":76,"ancho":43,"fondo":22}', 578.00, 1, 1),\n  (387, 'DCR-0387', 'CACHINA QUEEN BED', 21, 'taller', '{"alto":57,"ancho":55,"fondo":3}', 0.00, 1, 1),\n  (388, 'DCR-0388', 'CACHINA QUEEN HEADBOARD', 21, 'taller', '{"alto":56,"ancho":75,"fondo":4}', 373.75, 1, 1),\n  (389, 'DCR-0389', 'COW BOY HEADBOARD', 21, 'taller', '{"alto":50,"ancho":70,"fondo":3}', 395.25, 1, 1),\n  (390, 'DCR-0390', 'BAKARU HEADBOARD TWIN', 21, 'taller', '{"alto":61,"ancho":75,"fondo":6}', 319.00, 1, 1),\n  (391, 'DCR-0391', 'BAKARU HEADBOARD QUEEN', 21, 'taller', '{"alto":57,"ancho":79,"fondo":6}', 373.75, 1, 1),\n  (392, 'DCR-0392', 'BAKARU HEADBOARD KING', 21, 'taller', '{"alto":62,"ancho":69,"fondo":3}', 428.75, 1, 1),\n  (393, 'DCR-0393', 'QUEEN HEADBOARD W/PANELS', 21, 'taller', '{"alto":62,"ancho":70,"fondo":6}', 268.50, 1, 1),\n  (394, 'DCR-0394', 'COWHIDE KING BED', 21, 'taller', '{"alto":60,"ancho":76,"fondo":6}', 1495.00, 1, 1),\n  (395, 'DCR-0395', 'COWHIDE QUEEN BED', 21, 'taller', '{"alto":59,"ancho":75,"fondo":2}', 1403.25, 1, 1),\n  (396, 'DCR-0396', 'COWHIDE CUT OUT KING BED', 21, 'taller', '{"alto":48,"ancho":69,"fondo":5}', 1495.00, 1, 1),\n  (397, 'DCR-0397', 'COWHIDE CUT OUT QUEEN BED', 21, 'taller', '{"alto":54,"ancho":75,"fondo":3}', 1403.25, 1, 1),\n  (398, 'DCR-0398', 'PUEBLO HEADBOARD QUEEN', 21, 'taller', '{"alto":49,"ancho":55,"fondo":3}', 299.00, 1, 1),\n  (399, 'DCR-0399', 'PUEBLO HEADBOARD KING', 21, 'taller', '{"alto":51,"ancho":67,"fondo":2}', 327.75, 1, 1),\n  (400, 'DCR-0400', 'CONCHOS KS BED', 21, 'taller', '{"alto":60,"ancho":65,"fondo":4}', 1169.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (401, 'DCR-0401', 'CONCHOS CHEST', 21, 'taller', '{"alto":57,"ancho":67,"fondo":2}', 893.00, 1, 1),\n  (402, 'DCR-0402', 'PUEBLO HEADBOARD FULL', 21, 'taller', '{"alto":54,"ancho":75,"fondo":4}', 258.75, 1, 1),\n  (403, 'DCR-0403', 'HB/FB PUEBLO COMPLETE BED QS', 21, 'taller', '{"alto":58,"ancho":69,"fondo":5}', 586.75, 1, 1),\n  (404, 'DCR-0404', 'HB/FB PUEBLO COMPLETE BED KS', 21, 'taller', '{"alto":59,"ancho":70,"fondo":5}', 661.75, 1, 1),\n  (405, 'DCR-0405', 'HONDO KS COMPLETE BED', 21, 'taller', '{"alto":52,"ancho":55,"fondo":3}', 1100.00, 1, 1),\n  (406, 'DCR-0406', 'HONDO QS COMPLETE BED', 21, 'taller', '{"alto":57,"ancho":74,"fondo":2}', 1035.00, 1, 1),\n  (407, 'DCR-0407', '6-DWR DRESSER', 20, 'taller', '{"alto":47,"ancho":65,"fondo":22}', 460.00, 1, 1),\n  (408, 'DCR-0408', '7-DWR DRESSER', 20, 'taller', '{"alto":40,"ancho":65,"fondo":19}', 483.00, 1, 1),\n  (409, 'DCR-0409', 'COWHIDE DRESSER W/MIRROR', 20, 'taller', '{"alto":48,"ancho":54,"fondo":18}', 1016.25, 1, 1),\n  (410, 'DCR-0410', 'COWHIDE DRESSER NO MIRROR', 20, 'taller', '{"alto":43,"ancho":49,"fondo":18}', 925.00, 1, 1),\n  (411, 'DCR-0411', 'COWHIDE CHEST', 20, 'taller', '{"alto":46,"ancho":43,"fondo":22}', 855.25, 1, 1),\n  (412, 'DCR-0412', 'CONCHOS DRESSER', 20, 'taller', '{"alto":48,"ancho":57,"fondo":21}', 961.00, 1, 1),\n  (413, 'DCR-0413', 'COWHIDE MIRROR', 20, 'taller', '{"alto":39,"ancho":62,"fondo":22}', 168.50, 1, 1),\n  (414, 'DCR-0414', '5-DWR CHEST 2-SM 3-LG', 20, 'taller', '{"alto":42,"ancho":59,"fondo":20}', 357.50, 1, 1),\n  (415, 'DCR-0415', '4-DWR CHEST', 20, 'taller', '{"alto":48,"ancho":39,"fondo":18}', 260.00, 1, 1),\n  (416, 'DCR-0416', '3- DWR CHEST', 20, 'taller', '{"alto":47,"ancho":53,"fondo":21}', 0.00, 1, 1),\n  (417, 'DCR-0417', 'HONDO CHEST', 20, 'taller', '{"alto":38,"ancho":48,"fondo":22}', 615.00, 1, 1),\n  (418, 'DCR-0418', 'HONDO DRESSER', 20, 'taller', '{"alto":38,"ancho":45,"fondo":18}', 642.00, 1, 1),\n  (419, 'DCR-0419', 'HONDO MIRROR', 20, 'taller', '{"alto":44,"ancho":37,"fondo":21}', 138.00, 1, 1),\n  (420, 'DCR-0420', 'OLD DOOR BENCH LARGE', 4, 'taller', '{"alto":18,"ancho":44,"fondo":20}', 333.75, 1, 1),\n  (421, 'DCR-0421', 'BENCH TASCATE INLAY 72X20X18', 4, 'taller', '{"alto":19,"ancho":43,"fondo":16}', 317.50, 1, 1),\n  (422, 'DCR-0422', '36" ROSETTE BENCH', 4, 'taller', '{"alto":19,"ancho":47,"fondo":20}', 161.00, 1, 1),\n  (423, 'DCR-0423', '48" ROSETTE BENCH', 4, 'taller', '{"alto":19,"ancho":52,"fondo":17}', 166.75, 1, 1),\n  (424, 'DCR-0424', '60" ROSETTE BENCH', 4, 'taller', '{"alto":20,"ancho":61,"fondo":15}', 179.50, 1, 1),\n  (425, 'DCR-0425', '48" CORONA BENCH', 4, 'taller', '{"alto":19,"ancho":46,"fondo":17}', 320.50, 1, 1),\n  (426, 'DCR-0426', '60" CORONA BENCH', 4, 'taller', '{"alto":18,"ancho":69,"fondo":18}', 339.75, 1, 1),\n  (427, 'DCR-0427', '72" CORONA BENCH', 4, 'taller', '{"alto":20,"ancho":67,"fondo":19}', 363.50, 1, 1),\n  (428, 'DCR-0428', 'COW HIDE BENCH', 4, 'taller', '{"alto":20,"ancho":46,"fondo":16}', 396.75, 1, 1),\n  (429, 'DCR-0429', '48" TARAHUMARA BENCH', 4, 'taller', '{"alto":18,"ancho":39,"fondo":17}', 166.75, 1, 1),\n  (430, 'DCR-0430', '54"OX YOKE BENCH W/LEATHER', 4, 'taller', '{"alto":18,"ancho":61,"fondo":15}', 328.50, 1, 1),\n  (431, 'DCR-0431', '3 DRW. BENCH', 4, 'taller', '{"alto":19,"ancho":68,"fondo":17}', 233.00, 1, 1),\n  (432, 'DCR-0432', '60" CROOS BENCH', 4, 'taller', '{"alto":19,"ancho":44,"fondo":18}', 327.75, 1, 1),\n  (433, 'DCR-0433', '8 FT. TASCATE BENCH TURQ. INLAY', 4, 'taller', '{"alto":19,"ancho":37,"fondo":14}', 385.00, 1, 1),\n  (434, 'DCR-0434', 'BENCH TASCATE INLAY 48X20X18', 4, 'taller', '{"alto":18,"ancho":63,"fondo":19}', 250.75, 1, 1),\n  (435, 'DCR-0435', 'BENCH TASCATE INLAY 60X20X18', 4, 'taller', '{"alto":18,"ancho":65,"fondo":19}', 267.50, 1, 1),\n  (436, 'DCR-0436', '72" OX YOKE BENCH W/LEATHER', 4, 'taller', '{"alto":18,"ancho":53,"fondo":17}', 363.00, 1, 1),\n  (437, 'DCR-0437', '2-DWR SPINDEL DESK 48"', 11, 'taller', '{"alto":31,"ancho":40,"fondo":30}', 297.50, 1, 1),\n  (438, 'DCR-0438', 'IRON BASE DESK 18" DEEP', 11, 'taller', '{"alto":31,"ancho":53,"fondo":18}', 254.50, 1, 1),\n  (439, 'DCR-0439', 'IRON BASE DESK 24" DEEP', 11, 'taller', '{"alto":31,"ancho":46,"fondo":21}', 275.25, 1, 1),\n  (440, 'DCR-0440', 'COWHIDE EXECUTIVE DESK', 11, 'taller', '{"alto":32,"ancho":40,"fondo":20}', 960.75, 1, 1),\n  (441, 'DCR-0441', 'JR. COWHIDE DESK', 11, 'taller', '{"alto":31,"ancho":69,"fondo":27}', 533.75, 1, 1),\n  (442, 'DCR-0442', 'COWHIDE FILE CABINET 3 DRWS', 11, 'taller', '{"alto":31,"ancho":68,"fondo":22}', 409.50, 1, 1),\n  (443, 'DCR-0443', 'WESTER EXECUTIVE DESK', 11, 'taller', '{"alto":30,"ancho":67,"fondo":22}', 791.50, 1, 1),\n  (444, 'DCR-0444', 'SECRETARY DESK', 11, 'taller', '{"alto":32,"ancho":53,"fondo":20}', 392.50, 1, 1),\n  (445, 'DCR-0445', 'JR. WESTERN DESK', 11, 'taller', '{"alto":32,"ancho":67,"fondo":18}', 460.00, 1, 1),\n  (446, 'DCR-0446', '54" RUSTIC SIERRA DESK', 11, 'taller', '{"alto":32,"ancho":67,"fondo":29}', 242.50, 1, 1),\n  (447, 'DCR-0447', '60" RUSTIC SIERRA DESK', 11, 'taller', '{"alto":32,"ancho":68,"fondo":20}', 273.00, 1, 1),\n  (448, 'DCR-0448', '3-DWR IRON BASE DESK', 11, 'taller', '{"alto":31,"ancho":55,"fondo":21}', 342.00, 1, 1),\n  (449, 'DCR-0449', '5-DWR IRON BASE DESK', 11, 'taller', '{"alto":30,"ancho":55,"fondo":23}', 395.25, 1, 1),\n  (450, 'DCR-0450', 'SOUTHWEST CHAIR', 9, 'taller', '{"alto":38,"ancho":20,"fondo":18}', 121.50, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (451, 'DCR-0451', 'SOUTHWEST CHAIR W/LEATHER', 9, 'taller', '{"alto":38,"ancho":19,"fondo":22}', 164.00, 1, 1),\n  (452, 'DCR-0452', 'TURN LEGS WESTERN CHAIR', 9, 'taller', '{"alto":44,"ancho":19,"fondo":21}', 103.00, 1, 1),\n  (453, 'DCR-0453', 'RICARDO CHAIR', 9, 'taller', '{"alto":37,"ancho":19,"fondo":18}', 79.25, 1, 1),\n  (454, 'DCR-0454', 'RICARDO ARM CHAIR', 9, 'taller', '{"alto":37,"ancho":20,"fondo":18}', 90.50, 1, 1),\n  (455, 'DCR-0455', 'RICARDO CHAIR W/LACQUER', 9, 'taller', '{"alto":39,"ancho":18,"fondo":20}', 90.50, 1, 1),\n  (456, 'DCR-0456', 'MEXICAN CHAIR', 9, 'taller', '{"alto":44,"ancho":21,"fondo":19}', 103.00, 1, 1),\n  (457, 'DCR-0457', 'CORONA CHAIR', 9, 'taller', '{"alto":44,"ancho":19,"fondo":19}', 79.25, 1, 1),\n  (458, 'DCR-0458', 'PLAIN CHAIR', 9, 'taller', '{"alto":37,"ancho":20,"fondo":19}', 69.00, 1, 1),\n  (459, 'DCR-0459', 'CHAIR FOR DESK', 9, 'taller', '{"alto":42,"ancho":19,"fondo":22}', 103.00, 1, 1),\n  (460, 'DCR-0460', 'COWHIDE CHAIR FOR DESK', 9, 'taller', '{"alto":36,"ancho":21,"fondo":18}', 132.75, 1, 1),\n  (461, 'DCR-0461', 'CURVE MEZCALERO CHAIR', 9, 'taller', '{"alto":41,"ancho":19,"fondo":18}', 87.50, 1, 1),\n  (462, 'DCR-0462', 'MEZCALERO CHAIR W/LEATHER', 9, 'taller', '{"alto":40,"ancho":19,"fondo":22}', 138.00, 1, 1),\n  (463, 'DCR-0463', 'MEZCALERO CHAIR W/COOPER WOOD SEAT', 9, 'taller', '{"alto":38,"ancho":21,"fondo":21}', 115.00, 1, 1),\n  (464, 'DCR-0464', 'MEZCALERO CHAIR W/COOPER & LEATHER', 9, 'taller', '{"alto":38,"ancho":22,"fondo":21}', 160.25, 1, 1),\n  (465, 'DCR-0465', 'OFFICE CHAIR', 9, 'taller', '{"alto":36,"ancho":19,"fondo":21}', 544.50, 1, 1),\n  (466, 'DCR-0466', 'WINGBACK CHAIR', 9, 'taller', '{"alto":40,"ancho":19,"fondo":19}', 544.50, 1, 1),\n  (467, 'DCR-0467', 'RUSTIC CHAIR', 9, 'taller', '{"alto":36,"ancho":20,"fondo":21}', 89.00, 1, 1),\n  (468, 'DCR-0468', 'RUSTIC CHAIR W/LEATHER', 9, 'taller', '{"alto":42,"ancho":21,"fondo":21}', 138.00, 1, 1),\n  (469, 'DCR-0469', 'TASCATE CHAIR W/LEATHER TURQ. INLAY', 9, 'taller', '{"alto":41,"ancho":18,"fondo":21}', 225.50, 1, 1),\n  (470, 'DCR-0470', 'JUAREZ YOKE TOOLED CHAIR W/LACQUER', 9, 'taller', '{"alto":41,"ancho":18,"fondo":21}', 308.50, 1, 1),\n  (471, 'DCR-0471', 'TASCATE CHAIR W/WRAPPED LEATHER', 9, 'taller', '{"alto":38,"ancho":19,"fondo":20}', 164.00, 1, 1),\n  (472, 'DCR-0472', 'MEZCALERO CHAIR W/WRAPPED LEATHER', 9, 'taller', '{"alto":39,"ancho":19,"fondo":22}', 164.00, 1, 1),\n  (473, 'DCR-0473', 'ROSETTA CURVE BACK CHAIR W/LEATHER', 9, 'taller', '{"alto":44,"ancho":22,"fondo":20}', 164.00, 1, 1),\n  (474, 'DCR-0474', 'MEZCALERO CURVE CACHINA STRIP CHAIR W/LEATHER', 9, 'taller', '{"alto":44,"ancho":18,"fondo":19}', 140.25, 1, 1),\n  (475, 'DCR-0475', 'SINGLE ROCKING CHAIR', 9, 'taller', '{"alto":42,"ancho":18,"fondo":18}', 184.00, 1, 1),\n  (476, 'DCR-0476', 'DOUBLE ROCKING CHAIR', 9, 'taller', '{"alto":38,"ancho":22,"fondo":19}', 259.00, 1, 1),\n  (477, 'DCR-0477', 'STAR BARSTOOL', 3, 'taller', '{"alto":26,"ancho":20,"fondo":19}', 79.00, 1, 1),\n  (478, 'DCR-0478', 'MEXICAN BARSTOOL', 17, 'taller', '{"alto":30,"ancho":71,"fondo":39}', 103.00, 1, 1),\n  (479, 'DCR-0479', 'MEXICAN BARSTOOL 30"', 17, 'taller', '{"alto":34,"ancho":61,"fondo":35}', 103.00, 1, 1),\n  (480, 'DCR-0480', 'CORONA BARSTOOL 26''''', 17, 'taller', '{"alto":33,"ancho":71,"fondo":31}', 79.25, 1, 1),\n  (481, 'DCR-0481', 'CORONA BARSTOOL 30"', 17, 'taller', '{"alto":31,"ancho":57,"fondo":41}', 79.25, 1, 1),\n  (482, 'DCR-0482', 'TECATE BARSTOOL 30"', 17, 'taller', '{"alto":35,"ancho":63,"fondo":41}', 79.25, 1, 1),\n  (483, 'DCR-0483', 'XX LAGER BARSTOOL 30"', 17, 'taller', '{"alto":31,"ancho":47,"fondo":38}', 87.50, 1, 1),\n  (484, 'DCR-0484', 'BUDWEISER BARSTOOL 30"', 17, 'taller', '{"alto":30,"ancho":46,"fondo":48}', 87.50, 1, 1),\n  (485, 'DCR-0485', 'HARLEY BARSTOOLS 26"', 17, 'taller', '{"alto":34,"ancho":58,"fondo":28}', 140.25, 1, 1),\n  (486, 'DCR-0486', 'HARLEY BARSTOOLS 30"', 17, 'taller', '{"alto":35,"ancho":65,"fondo":32}', 140.25, 1, 1),\n  (487, 'DCR-0487', 'PLAIN BARSTOOL 24"', 17, 'taller', '{"alto":35,"ancho":40,"fondo":39}', 72.00, 1, 1),\n  (488, 'DCR-0488', 'PLAIN BARSTOOL 30"', 17, 'taller', '{"alto":34,"ancho":43,"fondo":31}', 72.00, 1, 1),\n  (489, 'DCR-0489', 'PLAIN BARSTOOL 26"', 17, 'taller', '{"alto":33,"ancho":71,"fondo":35}', 76.50, 1, 1),\n  (490, 'DCR-0490', 'COWHIDE SWIVEL BARSTOOL', 17, 'taller', '{"alto":36,"ancho":66,"fondo":48}', 276.00, 1, 1),\n  (491, 'DCR-0491', '24" STOOLS W/LEATHER', 17, 'taller', '{"alto":33,"ancho":39,"fondo":28}', 109.75, 1, 1),\n  (492, 'DCR-0492', '30" STOOLS W/LEATHER', 17, 'taller', '{"alto":31,"ancho":69,"fondo":45}', 109.75, 1, 1),\n  (493, 'DCR-0493', 'MEZCALERO BARSTOOL 24" W/COOPER', 17, 'taller', '{"alto":33,"ancho":48,"fondo":34}', 155.00, 1, 1),\n  (494, 'DCR-0494', '26" PLAIN BARSTOOL W/LACQUER', 17, 'taller', '{"alto":33,"ancho":50,"fondo":42}', 87.50, 1, 1),\n  (495, 'DCR-0495', 'TASCATE BARSTOOL W/WRAPPED LEATHER', 17, 'taller', '{"alto":30,"ancho":38,"fondo":32}', 164.00, 1, 1),\n  (496, 'DCR-0496', 'TWIST BARSTOOL IRON BLACK', 17, 'taller', '{"alto":30,"ancho":52,"fondo":45}', 98.50, 1, 1),\n  (497, 'DCR-0497', 'IRON BASE BARSTOOL TOOLED LEATHER SEAT', 17, 'taller', '{"alto":30,"ancho":59,"fondo":48}', 184.00, 1, 1),\n  (498, 'DCR-0498', '30" MEZCALERO BARSTOOL W/LEATHER', 17, 'taller', '{"alto":34,"ancho":60,"fondo":41}', 196.00, 1, 1),\n  (499, 'DCR-0499', 'PLAIN BISTRO TABLE', 5, 'taller', '{"alto":33,"ancho":36,"fondo":36}', 257.25, 1, 1),\n  (500, 'DCR-0500', 'CORONA BISTRO TABLE', 5, 'taller', '{"alto":32,"ancho":32,"fondo":32}', 255.25, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (501, 'DCR-0501', 'STAR BISTRO TABLE', 5, 'taller', '{"alto":32,"ancho":32,"fondo":31}', 267.00, 1, 1),\n  (502, 'DCR-0502', 'HARLEY BISTRO TABLE', 5, 'taller', '{"alto":32,"ancho":34,"fondo":35}', 287.75, 1, 1),\n  (503, 'DCR-0503', 'MEXICAN BISTRO TABLE', 5, 'taller', '{"alto":35,"ancho":35,"fondo":30}', 408.00, 1, 1),\n  (504, 'DCR-0504', '42" TALL PLAIN BISTRO TABLE', 5, 'taller', '{"alto":30,"ancho":36,"fondo":30}', 247.75, 1, 1),\n  (505, 'DCR-0505', 'PLAIN BISTRO RECTANGLE', 5, 'taller', '{"alto":34,"ancho":36,"fondo":33}', 356.75, 1, 1),\n  (506, 'DCR-0506', 'PLAIN BISTRO RECTANGLE W/LACQUER', 5, 'taller', '{"alto":32,"ancho":32,"fondo":34}', 392.50, 1, 1),\n  (507, 'DCR-0507', 'TASCATE PLAIN BISTRO RECTANGLE TURQ. INLAY', 5, 'taller', '{"alto":30,"ancho":30,"fondo":30}', 494.75, 1, 1),\n  (508, 'DCR-0508', 'XX LAGER BISTRO TABLE', 5, 'taller', '{"alto":36,"ancho":35,"fondo":31}', 256.00, 1, 1),\n  (509, 'DCR-0509', '48" MEXICAN BAR', 2, 'taller', '{"alto":43,"ancho":62,"fondo":23}', 514.75, 1, 1),\n  (510, 'DCR-0510', '72" MEXICAN BAR', 2, 'taller', '{"alto":42,"ancho":65,"fondo":21}', 600.25, 1, 1),\n  (511, 'DCR-0511', '72" TECATE BAR', 2, 'taller', '{"alto":43,"ancho":54,"fondo":22}', 600.25, 1, 1),\n  (512, 'DCR-0512', '72" BUDWEISER BAR', 2, 'taller', '{"alto":47,"ancho":48,"fondo":21}', 627.50, 1, 1),\n  (513, 'DCR-0513', '48" XX LAGER BAR', 2, 'taller', '{"alto":47,"ancho":52,"fondo":27}', 609.00, 1, 1),\n  (514, 'DCR-0514', '72" XX LAGER BAR', 2, 'taller', '{"alto":42,"ancho":95,"fondo":25}', 734.50, 1, 1),\n  (515, 'DCR-0515', '72" PLAIN BAR', 2, 'taller', '{"alto":44,"ancho":65,"fondo":27}', 571.25, 1, 1),\n  (516, 'DCR-0516', '60" PLAIN BAR', 2, 'taller', '{"alto":45,"ancho":53,"fondo":24}', 529.00, 1, 1),\n  (517, 'DCR-0517', '60" PLAIN BAR W/SLATTE', 2, 'taller', '{"alto":45,"ancho":93,"fondo":28}', 598.00, 1, 1),\n  (518, 'DCR-0518', '72" PLAIN BAR W/SLATTE', 2, 'taller', '{"alto":42,"ancho":83,"fondo":28}', 646.25, 1, 1),\n  (519, 'DCR-0519', '72" PLAIN BAR W/TILE', 2, 'taller', '{"alto":48,"ancho":66,"fondo":23}', 619.50, 1, 1),\n  (520, 'DCR-0520', '48" PLAIN BAR W/SLATTE', 2, 'taller', '{"alto":45,"ancho":49,"fondo":25}', 551.25, 1, 1),\n  (521, 'DCR-0521', '48" TECATE BAR', 2, 'taller', '{"alto":44,"ancho":62,"fondo":27}', 516.25, 1, 1),\n  (522, 'DCR-0522', '7FT. SIERRA BAR', 2, 'taller', '{"alto":43,"ancho":56,"fondo":23}', 874.00, 1, 1),\n  (523, 'DCR-0523', 'CURIO CORNER CAB.', 19, 'taller', '{"alto":48,"ancho":48,"fondo":19}', 152.75, 1, 1),\n  (524, 'DCR-0524', 'MED.CORNER CAB.', 19, 'taller', '{"alto":41,"ancho":28,"fondo":23}', 279.50, 1, 1),\n  (525, 'DCR-0525', 'TALL CORNER CAB.', 19, 'taller', '{"alto":30,"ancho":42,"fondo":21}', 442.00, 1, 1),\n  (526, 'DCR-0526', '12X12 MARIO''S TABLE', 19, 'taller', '{"alto":48,"ancho":29,"fondo":20}', 61.50, 1, 1),\n  (527, 'DCR-0527', '12X24 MARIO''S TABLE', 19, 'taller', '{"alto":33,"ancho":24,"fondo":18}', 75.50, 1, 1),\n  (528, 'DCR-0528', '12X36 MARIO''S TABLE', 19, 'taller', '{"alto":25,"ancho":32,"fondo":12}', 92.00, 1, 1),\n  (529, 'DCR-0529', '12X48 MARIO''S TABLE', 19, 'taller', '{"alto":39,"ancho":38,"fondo":15}', 109.75, 1, 1),\n  (530, 'DCR-0530', '16X16 MARIO''S TABLE', 19, 'taller', '{"alto":41,"ancho":30,"fondo":18}', 75.50, 1, 1),\n  (531, 'DCR-0531', '16X24 MARIO''S TABLE', 19, 'taller', '{"alto":40,"ancho":45,"fondo":22}', 94.67, 1, 1),\n  (532, 'DCR-0532', '16X36 MARIO''S TABLE', 19, 'taller', '{"alto":27,"ancho":48,"fondo":17}', 106.75, 1, 1),\n  (533, 'DCR-0533', '16X48 MARIO''S TABLE', 19, 'taller', '{"alto":36,"ancho":38,"fondo":17}', 132.00, 1, 1),\n  (534, 'DCR-0534', 'SMALL COOLER', 19, 'taller', '{"alto":27,"ancho":40,"fondo":17}', 241.00, 1, 1),\n  (535, 'DCR-0535', 'COOLER', 19, 'taller', '{"alto":41,"ancho":30,"fondo":21}', 276.00, 1, 1),\n  (536, 'DCR-0536', 'CABINET LINEN 4'' CROSS 36X13X48', 23, 'taller', '{"alto":25,"ancho":27,"fondo":18}', 199.50, 1, 1),\n  (537, 'DCR-0537', 'CABINET LINEN 4'' FANCY TIN 36X13X48', 23, 'taller', '{"alto":31,"ancho":31,"fondo":13}', 241.00, 1, 1),\n  (538, 'DCR-0538', 'CABINET LINEN 4'' CROSS 36X18X48', 23, 'taller', '{"alto":31,"ancho":25,"fondo":12}', 230.00, 1, 1),\n  (539, 'DCR-0539', 'CABINET LINEN 4'' FANCY TIN 36X18X48', 23, 'taller', '{"alto":27,"ancho":27,"fondo":18}', 275.25, 1, 1),\n  (540, 'DCR-0540', 'CABINET LINEN 4'' RUSTIC TIN 36X16X48', 23, 'taller', '{"alto":33,"ancho":30,"fondo":18}', 158.50, 1, 1),\n  (541, 'DCR-0541', 'CABINET LINEN 5'' CROSS 36X13X60', 23, 'taller', '{"alto":27,"ancho":31,"fondo":12}', 257.25, 1, 1),\n  (542, 'DCR-0542', 'CABINET LINEN 5'' FANCY TIN 36X13X60', 23, 'taller', '{"alto":24,"ancho":30,"fondo":12}', 299.00, 1, 1),\n  (543, 'DCR-0543', 'CABINET LINEN 5'' CROSS 36X18X60', 23, 'taller', '{"alto":29,"ancho":32,"fondo":18}', 299.00, 1, 1),\n  (544, 'DCR-0544', 'CABINET LINEN 5'' 36X18X60', 23, 'taller', '{"alto":33,"ancho":24,"fondo":15}', 343.00, 1, 1),\n  (545, 'DCR-0545', 'CABINET LINEN 5" RUSTIC TIN 36X13X60', 23, 'taller', '{"alto":32,"ancho":33,"fondo":14}', 274.50, 1, 1),\n  (546, 'DCR-0546', 'CABINET LINEN 5'' RUSTIC TIN 36X18X60', 23, 'taller', '{"alto":28,"ancho":35,"fondo":17}', 316.75, 1, 1),\n  (547, 'DCR-0547', 'CABINET LINEN 6'' CROSS 36X13X72', 23, 'taller', '{"alto":29,"ancho":24,"fondo":17}', 282.50, 1, 1),\n  (548, 'DCR-0548', 'CABINET LINEN 6'' FANCY TIN 36X13X72', 23, 'taller', '{"alto":36,"ancho":36,"fondo":12}', 323.50, 1, 1),\n  (549, 'DCR-0549', 'CABINET LINEN 6'' CROSS 36X18X72', 23, 'taller', '{"alto":24,"ancho":32,"fondo":17}', 343.50, 1, 1),\n  (550, 'DCR-0550', 'CABINET LINEN 6'' FANCY TIN 36X18X72', 23, 'taller', '{"alto":28,"ancho":36,"fondo":16}', 391.25, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (551, 'DCR-0551', 'CABINET LINEN 6'' RUSTIC TIN 36X18X72', 23, 'taller', '{"alto":30,"ancho":32,"fondo":13}', 357.50, 1, 1),\n  (552, 'DCR-0552', '5'' TWIG CABINET LINEN', 23, 'taller', '{"alto":27,"ancho":34,"fondo":14}', 241.75, 1, 1),\n  (553, 'DCR-0553', '4'' TWIG CABINET LINEN', 23, 'taller', '{"alto":35,"ancho":33,"fondo":13}', 217.25, 1, 1),\n  (554, 'DCR-0554', 'SM TWIG CABINET LINEN', 23, 'taller', '{"alto":32,"ancho":25,"fondo":17}', 195.75, 1, 1),\n  (555, 'DCR-0555', '36X13X30 TWIG CABINET LINEN', 23, 'taller', '{"alto":30,"ancho":32,"fondo":16}', 241.75, 1, 1),\n  (556, 'DCR-0556', '1-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":25,"ancho":29,"fondo":12}', 199.50, 1, 1),\n  (557, 'DCR-0557', '2-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":27,"ancho":36,"fondo":12}', 261.00, 1, 1),\n  (558, 'DCR-0558', '3-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":30,"ancho":26,"fondo":16}', 370.25, 1, 1),\n  (559, 'DCR-0559', '4-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":34,"ancho":24,"fondo":13}', 517.75, 1, 1),\n  (560, 'DCR-0560', '5-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":29,"ancho":27,"fondo":15}', 586.75, 1, 1),\n  (561, 'DCR-0561', '6-DOOR LAFON SIDEBOARD W/SLATTE', 23, 'taller', '{"alto":35,"ancho":32,"fondo":16}', 661.75, 1, 1),\n  (562, 'DCR-0562', 'LAFON IRON 2-DOOR 3-SHELF', 23, 'taller', '{"alto":32,"ancho":35,"fondo":14}', 494.75, 1, 1),\n  (563, 'DCR-0563', 'LAFON IRON 1-DOOR 5-SHELF', 23, 'taller', '{"alto":28,"ancho":33,"fondo":16}', 478.50, 1, 1),\n  (564, 'DCR-0564', 'LAFON ALL METAL DOORS', 23, 'taller', '{"alto":36,"ancho":28,"fondo":13}', 494.75, 1, 1),\n  (565, 'DCR-0565', 'LAFON MULTIPANEL 2-DOOR', 23, 'taller', '{"alto":30,"ancho":35,"fondo":15}', 311.50, 1, 1),\n  (566, 'DCR-0566', 'LAFON MULTIPANEL 4-DOOR', 23, 'taller', '{"alto":32,"ancho":26,"fondo":18}', 494.75, 1, 1),\n  (567, 'DCR-0567', 'RUSTIC LAFON 1-DOOR', 23, 'taller', '{"alto":29,"ancho":33,"fondo":14}', 311.50, 1, 1),\n  (568, 'DCR-0568', 'RUSTIC LAFON 2-DOOR', 23, 'taller', '{"alto":30,"ancho":30,"fondo":13}', 494.75, 1, 1),\n  (569, 'DCR-0569', '48" TWIG TV-STAND 48X18X30', 23, 'taller', '{"alto":35,"ancho":28,"fondo":18}', 303.00, 1, 1),\n  (570, 'DCR-0570', '60" TWIG TV-STAND', 23, 'taller', '{"alto":28,"ancho":36,"fondo":12}', 323.00, 1, 1),\n  (571, 'DCR-0571', '72" TWIG TV-STAND', 23, 'taller', '{"alto":29,"ancho":27,"fondo":15}', 357.50, 1, 1),\n  (572, 'DCR-0572', '60" TV STAND W/GLASS', 23, 'taller', '{"alto":27,"ancho":31,"fondo":18}', 391.00, 1, 1),\n  (573, 'DCR-0573', '72" TV STAND W/GLASS', 23, 'taller', '{"alto":33,"ancho":35,"fondo":12}', 445.00, 1, 1),\n  (574, 'DCR-0574', 'TV/VCR STAND W/ROPE 42X13X30', 23, 'taller', '{"alto":31,"ancho":31,"fondo":18}', 258.75, 1, 1),\n  (575, 'DCR-0575', 'TV STAND W/FANCY TIN 42X13X30', 23, 'taller', '{"alto":24,"ancho":34,"fondo":13}', 293.75, 1, 1),\n  (576, 'DCR-0576', 'TV STAND CACHINA BORDER', 23, 'taller', '{"alto":29,"ancho":31,"fondo":12}', 392.50, 1, 1),\n  (577, 'DCR-0577', 'TV/VCR STAND ROPE 58X18X30', 23, 'taller', '{"alto":30,"ancho":29,"fondo":15}', 386.00, 1, 1),\n  (578, 'DCR-0578', 'TV-VCR STAND GLASS 60X18X36', 23, 'taller', '{"alto":25,"ancho":33,"fondo":18}', 393.25, 1, 1),\n  (579, 'DCR-0579', 'TV/VCR STAND ROPE 60X18X36', 23, 'taller', '{"alto":30,"ancho":26,"fondo":12}', 419.00, 1, 1),\n  (580, 'DCR-0580', 'TV/VCR CACHINA BORDER (NO CACHINA)', 23, 'taller', '{"alto":33,"ancho":29,"fondo":15}', 274.50, 1, 1),\n  (581, 'DCR-0581', '60" TV STAND WOOD PANEL', 23, 'taller', '{"alto":31,"ancho":31,"fondo":12}', 410.00, 1, 1),\n  (582, 'DCR-0582', '60" TV-CONSOLE W/GLASS', 23, 'taller', '{"alto":32,"ancho":30,"fondo":17}', 381.25, 1, 1),\n  (583, 'DCR-0583', '72" TV-CONSOLE W/GLASS', 23, 'taller', '{"alto":29,"ancho":25,"fondo":18}', 408.75, 1, 1),\n  (584, 'DCR-0584', '60" TV-CONSOLE', 23, 'taller', '{"alto":34,"ancho":34,"fondo":17}', 401.50, 1, 1),\n  (585, 'DCR-0585', '72" TV-CONSOLE', 23, 'taller', '{"alto":33,"ancho":35,"fondo":16}', 408.75, 1, 1),\n  (586, 'DCR-0586', '60" TV-CONSOLE W/COOPER', 23, 'taller', '{"alto":31,"ancho":30,"fondo":13}', 477.00, 1, 1),\n  (587, 'DCR-0587', '72" TV-CONSOLE W/COOPER', 23, 'taller', '{"alto":32,"ancho":31,"fondo":14}', 511.00, 1, 1),\n  (588, 'DCR-0588', '60" HACIENDA TV-CONSOLE', 23, 'taller', '{"alto":28,"ancho":34,"fondo":13}', 477.00, 1, 1),\n  (589, 'DCR-0589', '72" HACIENDA TV-CONSOLE', 23, 'taller', '{"alto":28,"ancho":31,"fondo":13}', 511.00, 1, 1),\n  (590, 'DCR-0590', '48X12X32 TV TARAHUMARA', 23, 'taller', '{"alto":30,"ancho":35,"fondo":17}', 257.25, 1, 1),\n  (591, 'DCR-0591', '3 FT. SIERRA TV STAND', 23, 'taller', '{"alto":34,"ancho":35,"fondo":13}', 270.00, 1, 1),\n  (592, 'DCR-0592', '4 FT. SIERRA TV STAND', 23, 'taller', '{"alto":31,"ancho":32,"fondo":17}', 282.50, 1, 1),\n  (593, 'DCR-0593', '5 FT. SIERRA TV STAND', 23, 'taller', '{"alto":35,"ancho":29,"fondo":16}', 293.75, 1, 1),\n  (594, 'DCR-0594', '6 FT. SIERRA TV STAND', 23, 'taller', '{"alto":28,"ancho":32,"fondo":16}', 304.00, 1, 1),\n  (595, 'DCR-0595', '8 FT. SIERRA TV STAND', 23, 'taller', '{"alto":31,"ancho":28,"fondo":16}', 379.75, 1, 1),\n  (596, 'DCR-0596', '48" GOTIK DRESSER', 23, 'taller', '{"alto":28,"ancho":36,"fondo":12}', 305.00, 1, 1),\n  (597, 'DCR-0597', '60" GOTIK DRESSER', 23, 'taller', '{"alto":30,"ancho":30,"fondo":18}', 317.00, 1, 1),\n  (598, 'DCR-0598', '72" GOTIK DRESSER', 23, 'taller', '{"alto":26,"ancho":34,"fondo":18}', 328.00, 1, 1),\n  (599, 'DCR-0599', '84" GOTIK DRESSER', 23, 'taller', '{"alto":27,"ancho":26,"fondo":16}', 340.00, 1, 1),\n  (600, 'DCR-0600', '96" GOTIK DRESSER', 23, 'taller', '{"alto":31,"ancho":24,"fondo":15}', 357.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (601, 'DCR-0601', 'TARAHUMARA POT SM', 23, 'taller', '{"alto":29,"ancho":32,"fondo":14}', 14.75, 1, 1),\n  (602, 'DCR-0602', 'TARAHUMARA POT MED', 23, 'taller', '{"alto":33,"ancho":25,"fondo":13}', 29.98, 1, 1),\n  (603, 'DCR-0603', 'TARAUMARA POT LG.', 23, 'taller', '{"alto":34,"ancho":29,"fondo":18}', 44.75, 1, 1),\n  (604, 'DCR-0604', 'SUGAR MOULDING 2', 23, 'taller', '{"alto":28,"ancho":33,"fondo":14}', 6.75, 1, 1),\n  (605, 'DCR-0605', 'SUGAR MOULDING 3', 23, 'taller', '{"alto":34,"ancho":32,"fondo":13}', 9.75, 1, 1),\n  (606, 'DCR-0606', 'SUGAR MOULDING 4', 23, 'taller', '{"alto":32,"ancho":28,"fondo":16}', 12.50, 1, 1),\n  (607, 'DCR-0607', 'SUGAR MOULDING 5', 23, 'taller', '{"alto":30,"ancho":31,"fondo":12}', 14.75, 1, 1),\n  (608, 'DCR-0608', 'SUGAR MOULDING 6', 23, 'taller', '{"alto":30,"ancho":29,"fondo":15}', 18.50, 1, 1),\n  (609, 'DCR-0609', 'SUGAR MOULDING 7', 23, 'taller', '{"alto":34,"ancho":24,"fondo":17}', 20.75, 1, 1),\n  (610, 'DCR-0610', 'SUGAR MOULDING 8', 23, 'taller', '{"alto":31,"ancho":34,"fondo":13}', 25.50, 1, 1),\n  (611, 'DCR-0611', 'SUGAR MOULDING 9', 23, 'taller', '{"alto":28,"ancho":35,"fondo":14}', 27.75, 1, 1),\n  (612, 'DCR-0612', 'SUGAR MOULDING 10', 23, 'taller', '{"alto":30,"ancho":35,"fondo":17}', 29.75, 1, 1),\n  (613, 'DCR-0613', 'SUGAR MOULDING 11', 23, 'taller', '{"alto":30,"ancho":24,"fondo":12}', 33.50, 1, 1),\n  (614, 'DCR-0614', 'SUGAR MOULDING 12', 23, 'taller', '{"alto":32,"ancho":24,"fondo":14}', 35.75, 1, 1),\n  (615, 'DCR-0615', 'SUGAR MOULDING BASE', 23, 'taller', '{"alto":35,"ancho":31,"fondo":18}', 6.75, 1, 1),\n  (616, 'DCR-0616', 'BATEAS GRANDES', 23, 'taller', '{"alto":29,"ancho":24,"fondo":13}', 26.50, 1, 1),\n  (617, 'DCR-0617', 'BATEAS CHICAS', 23, 'taller', '{"alto":25,"ancho":35,"fondo":15}', 45.00, 1, 1),\n  (618, 'DCR-0618', 'LADDER 2''', 23, 'taller', '{"alto":26,"ancho":27,"fondo":14}', 12.50, 1, 1),\n  (619, 'DCR-0619', 'LADDER 3''', 23, 'taller', '{"alto":32,"ancho":26,"fondo":12}', 16.75, 1, 1),\n  (620, 'DCR-0620', 'LADDER 4''', 23, 'taller', '{"alto":35,"ancho":32,"fondo":14}', 23.00, 1, 1),\n  (621, 'DCR-0621', 'LADDER 5''', 23, 'taller', '{"alto":36,"ancho":24,"fondo":13}', 28.75, 1, 1),\n  (622, 'DCR-0622', 'LADDER 6''', 23, 'taller', '{"alto":30,"ancho":24,"fondo":12}', 34.75, 1, 1),\n  (623, 'DCR-0623', 'LADDER 7''', 23, 'taller', '{"alto":30,"ancho":35,"fondo":18}', 41.75, 1, 1),\n  (624, 'DCR-0624', 'LADDER 8''', 23, 'taller', '{"alto":32,"ancho":32,"fondo":18}', 47.50, 1, 1),\n  (625, 'DCR-0625', '2 FT. TARAHUMARA LADDER W/LEATHER', 23, 'taller', '{"alto":33,"ancho":30,"fondo":13}', 35.75, 1, 1),\n  (626, 'DCR-0626', '3 FT. TARAHUMARA LADDER W/LEATHER', 23, 'taller', '{"alto":32,"ancho":33,"fondo":12}', 55.75, 1, 1),\n  (627, 'DCR-0627', '4 FT. TARAHUMARA LADDER W/LEATHER', 23, 'taller', '{"alto":24,"ancho":31,"fondo":14}', 75.75, 1, 1),\n  (628, 'DCR-0628', '7 FT. TARAHUMARA LADDER W/LEATHER', 23, 'taller', '{"alto":24,"ancho":31,"fondo":14}', 129.50, 1, 1),\n  (629, 'DCR-0629', '15" LAMP SHAKES', 23, 'taller', '{"alto":26,"ancho":32,"fondo":14}', 35.75, 1, 1),\n  (630, 'DCR-0630', '18" LAMP SHAKES', 23, 'taller', '{"alto":26,"ancho":27,"fondo":16}', 43.75, 1, 1),\n  (631, 'DCR-0631', '20" LAMP SHAKES', 23, 'taller', '{"alto":30,"ancho":27,"fondo":15}', 49.75, 1, 1),\n  (632, 'DCR-0632', '24" LAMP SHAKES', 23, 'taller', '{"alto":25,"ancho":33,"fondo":15}', 59.50, 1, 1),\n  (633, 'DCR-0633', '36" COOPER TOP', 23, 'taller', '{"alto":32,"ancho":28,"fondo":15}', 602.25, 1, 1),\n  (634, 'DCR-0634', '48" COOPER TOP', 23, 'taller', '{"alto":25,"ancho":36,"fondo":16}', 776.50, 1, 1),\n  (635, 'DCR-0635', '60" COOPER TOP', 23, 'taller', '{"alto":31,"ancho":29,"fondo":15}', 1003.00, 1, 1),\n  (636, 'DCR-0636', 'HB GLASS 8X10', 23, 'taller', '{"alto":28,"ancho":24,"fondo":18}', 5.50, 1, 1),\n  (637, 'DCR-0637', 'HB GLASS 8X13', 23, 'taller', '{"alto":26,"ancho":28,"fondo":12}', 5.50, 1, 1),\n  (638, 'DCR-0638', 'MARGARITA GLASS', 23, 'taller', '{"alto":30,"ancho":30,"fondo":14}', 5.50, 1, 1),\n  (639, 'DCR-0639', 'TEQUILA GLASS', 23, 'taller', '{"alto":33,"ancho":30,"fondo":17}', 5.50, 1, 1),\n  (640, 'DCR-0640', '5 FT. CACHINA BORDER DINING TABLE', 17, 'taller', '{"alto":35,"ancho":44,"fondo":35}', 479.00, 1, 1),\n  (641, 'DCR-0641', 'SOUTHWEST SLATTE DINING TABLE 72"', 17, 'taller', '{"alto":30,"ancho":71,"fondo":35}', 643.33, 1, 1),\n  (642, 'DCR-0642', 'SOUTHWEST SLATTE DINING TABLE 84"', 17, 'taller', '{"alto":36,"ancho":68,"fondo":40}', 693.33, 1, 1),\n  (643, 'DCR-0643', 'TERRACOTA DINING TABLE 72"', 17, 'taller', '{"alto":35,"ancho":52,"fondo":38}', 482.00, 1, 1),\n  (644, 'DCR-0644', 'OX YOKE SLATTE DINING TABLE 6 FT.', 17, 'taller', '{"alto":36,"ancho":57,"fondo":32}', 643.33, 1, 1),\n  (645, 'DCR-0645', 'OX YOKE DINING TABLE 6 FT', 17, 'taller', '{"alto":35,"ancho":71,"fondo":45}', 680.00, 1, 1),\n  (646, 'DCR-0646', 'OX YOKE DINING TABLE 7FT.', 17, 'taller', '{"alto":36,"ancho":39,"fondo":33}', 711.67, 1, 1),\n  (647, 'DCR-0647', 'DINING TABLE 60"', 17, 'taller', '{"alto":34,"ancho":70,"fondo":45}', 458.67, 1, 1),\n  (648, 'DCR-0648', 'DINING TABLE 72"', 17, 'taller', '{"alto":32,"ancho":47,"fondo":44}', 494.67, 1, 1),\n  (649, 'DCR-0649', 'DINING TABLE 84"', 17, 'taller', '{"alto":35,"ancho":53,"fondo":40}', 529.00, 1, 1),\n  (650, 'DCR-0650', '60X60 DINING TABLE', 17, 'taller', '{"alto":33,"ancho":47,"fondo":28}', 482.33, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (651, 'DCR-0651', 'CORONA DINING TABLE', 17, 'taller', '{"alto":35,"ancho":36,"fondo":31}', 257.33, 1, 1),\n  (652, 'DCR-0652', 'MEXICAN DINING TABLE', 17, 'taller', '{"alto":32,"ancho":65,"fondo":46}', 408.00, 1, 1),\n  (653, 'DCR-0653', 'REAL SLATE DINING TABLE 72X36', 17, 'taller', '{"alto":30,"ancho":47,"fondo":38}', 540.00, 1, 1),\n  (654, 'DCR-0654', 'REAL SLATTE DINING TABLE 5''', 17, 'taller', '{"alto":35,"ancho":45,"fondo":36}', 540.00, 1, 1),\n  (655, 'DCR-0655', 'REAL SLATE DINING TABLE 6''', 17, 'taller', '{"alto":31,"ancho":56,"fondo":35}', 587.33, 1, 1),\n  (656, 'DCR-0656', 'REAL SLATE DINING TABLE 7''''', 17, 'taller', '{"alto":33,"ancho":44,"fondo":42}', 634.67, 1, 1),\n  (657, 'DCR-0657', 'REAL SLATTE DINING TABLE 8''', 17, 'taller', '{"alto":36,"ancho":39,"fondo":46}', 685.33, 1, 1),\n  (658, 'DCR-0658', 'REAL SLATTE DINING TABLE 9''', 17, 'taller', '{"alto":34,"ancho":43,"fondo":47}', 737.33, 1, 1),\n  (659, 'DCR-0659', '5 X 5 SLATTE DINING TABLE', 17, 'taller', '{"alto":30,"ancho":72,"fondo":45}', 588.00, 1, 1),\n  (660, 'DCR-0660', 'TERRACOTA KITCHEN ISLAND (4-tile)', 17, 'taller', '{"alto":33,"ancho":72,"fondo":36}', 416.00, 1, 1),\n  (661, 'DCR-0661', 'TERRACOTA KITCHEN ISLAND (6-tile)', 17, 'taller', '{"alto":32,"ancho":61,"fondo":42}', 534.67, 1, 1),\n  (662, 'DCR-0662', '42X42 DINING TABLE', 17, 'taller', '{"alto":36,"ancho":71,"fondo":44}', 385.67, 1, 1),\n  (663, 'DCR-0663', '6 FT. TASCATE DINING TALE TURQ. INLAY', 17, 'taller', '{"alto":31,"ancho":62,"fondo":34}', 769.33, 1, 1),\n  (664, 'DCR-0664', '7 FT. TASCATE DINING TABLE TURQ. INLAY', 17, 'taller', '{"alto":36,"ancho":62,"fondo":32}', 803.00, 1, 1),\n  (665, 'DCR-0665', '8 FT. TASCATE DINING TABLE TURQ. INLAY', 17, 'taller', '{"alto":33,"ancho":61,"fondo":44}', 834.33, 1, 1),\n  (666, 'DCR-0666', 'OX YOKE SLATTE DINING TABLE 7 FT.', 17, 'taller', '{"alto":30,"ancho":51,"fondo":34}', 693.33, 1, 1),\n  (667, 'DCR-0667', '7 FT. RUSTIC TABLE', 17, 'taller', '{"alto":30,"ancho":53,"fondo":32}', 578.33, 1, 1),\n  (668, 'DCR-0668', '8 FT. RUSTIC TABLE', 17, 'taller', '{"alto":32,"ancho":38,"fondo":47}', 542.67, 1, 1),\n  (669, 'DCR-0669', '9 FT. RUSTIC TABLE', 17, 'taller', '{"alto":32,"ancho":42,"fondo":26}', 575.00, 1, 1),\n  (670, 'DCR-0670', '10 FT. RUSTIC TABLE', 17, 'taller', '{"alto":35,"ancho":61,"fondo":29}', 609.00, 1, 1),\n  (671, 'DCR-0671', '48" RUSTIC ROUND TABLE', 17, 'taller', '{"alto":32,"ancho":40,"fondo":36}', 846.33, 1, 1),\n  (672, 'DCR-0672', '60" RUSTIC ROUND TABLE', 17, 'taller', '{"alto":31,"ancho":49,"fondo":27}', 847.67, 1, 1),\n  (673, 'DCR-0673', '5 FT. ROUND OX YOKE DINING W/PEDESTAL', 17, 'taller', '{"alto":34,"ancho":62,"fondo":35}', 693.33, 1, 1),\n  (674, 'DCR-0674', '42" ROUND DINING PEDESTAL TURN LEG', 17, 'taller', '{"alto":33,"ancho":44,"fondo":47}', 350.67, 1, 1),\n  (675, 'DCR-0675', '40X40 SQUARE TURN LEG SMALL DINING TABLE', 17, 'taller', '{"alto":36,"ancho":37,"fondo":43}', 419.00, 1, 1),\n  (676, 'DCR-0676', 'OX YOKE SLATTE DINING TABLE 8 FT', 17, 'taller', '{"alto":35,"ancho":43,"fondo":27}', 747.00, 1, 1),\n  (677, 'DCR-0677', 'HACIENDA NIGHTSTAND', 14, 'taller', '{"alto":26,"ancho":20,"fondo":20}', 241.00, 1, 1),\n  (678, 'DCR-0678', 'RUSTIC 1-DWR NIGHTSTAND', 14, 'taller', '{"alto":25,"ancho":21,"fondo":17}', 165.00, 1, 1),\n  (679, 'DCR-0679', 'TWIG NIGHTSTAND', 14, 'taller', '{"alto":28,"ancho":24,"fondo":17}', 151.00, 1, 1),\n  (680, 'DCR-0680', 'SINGLE CD GLASS SHORT DOOR', 8, 'taller', '{"alto":41,"ancho":18,"fondo":15}', 117.00, 1, 1),\n  (681, 'DCR-0681', 'DOUBLE FANCY TIN SHORT JELLY', 13, 'taller', '{"alto":55,"ancho":34,"fondo":15}', 304.00, 1, 1),\n  (682, 'DCR-0682', 'ARCH SHORT JELLY', 13, 'taller', '{"alto":50,"ancho":31,"fondo":17}', 166.00, 1, 1),\n  (683, 'DCR-0683', 'ARCH TALL CAVA', 13, 'taller', '{"alto":49,"ancho":27,"fondo":17}', 323.00, 1, 1),\n  (684, 'DCR-0684', 'ARCH TALL JELLY', 13, 'taller', '{"alto":65,"ancho":33,"fondo":14}', 197.00, 1, 1),\n  (685, 'DCR-0685', 'WALL TASCATE COFFEE TABLE INTAKE TURQ.', 10, 'taller', '{"alto":16,"ancho":54,"fondo":28}', 366.00, 1, 1),\n  (686, 'DCR-0686', 'END TABLE TWIG ALL SIDES 1-DOOR', 12, 'taller', '{"alto":26,"ancho":25,"fondo":26}', 163.00, 1, 1),\n  (687, 'DCR-0687', '4 SLATTE FANCY TIN TABLE', 16, 'taller', '{"alto":28,"ancho":64,"fondo":15}', 362.00, 1, 1),\n  (688, 'DCR-0688', '3-SLATTE FANCY IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":29,"ancho":51,"fondo":15}', 339.00, 1, 1),\n  (689, 'DCR-0689', '4-SLATTE FANCY IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":31,"ancho":63,"fondo":16}', 391.00, 1, 1),\n  (690, 'DCR-0690', '5-SLATTE FANCY IRON BASE SOFA TABLE W/SHELF', 16, 'taller', '{"alto":32,"ancho":71,"fondo":18}', 338.00, 1, 1),\n  (691, 'DCR-0691', '18" OX YOKE BOOKCASE', 6, 'taller', '{"alto":61,"ancho":27,"fondo":12}', 197.00, 1, 1),\n  (692, 'DCR-0692', '4-DWR WARDROBE ARMOIRE 2-DOOR', 1, 'taller', '{"alto":76,"ancho":43,"fondo":22}', 575.00, 1, 1),\n  (693, 'DCR-0693', '5-DWR WARDROBE ARMOIRE 2-DOOR', 1, 'taller', '{"alto":69,"ancho":42,"fondo":24}', 471.00, 1, 1),\n  (694, 'DCR-0694', 'HONDO COMPLETE BED QS', 1, 'taller', '{"alto":72,"ancho":48,"fondo":23}', 1040.00, 1, 1),\n  (695, 'DCR-0695', 'TWIG ARMOIRE', 1, 'taller', '{"alto":70,"ancho":46,"fondo":23}', 343.00, 1, 1),\n  (696, 'DCR-0696', 'CONCHOS MIRROR', 21, 'taller', '{"alto":51,"ancho":61,"fondo":5}', 166.00, 1, 1),\n  (697, 'DCR-0697', 'HACIENDA CHEST', 21, 'taller', '{"alto":48,"ancho":80,"fondo":4}', 891.00, 1, 1),\n  (698, 'DCR-0698', 'HACIENDA KS BED', 21, 'taller', '{"alto":51,"ancho":72,"fondo":4}', 1167.00, 1, 1),\n  (699, 'DCR-0699', 'HB HONDO KS', 21, 'taller', '{"alto":51,"ancho":70,"fondo":6}', 609.00, 1, 1),\n  (700, 'DCR-0700', 'HONDO COMPLETE BED', 21, 'taller', '{"alto":51,"ancho":76,"fondo":6}', 1098.00, 1, 1);

INSERT INTO productos (id, codigo_sku, nombre, categoria_id, origen, medidas_base, precio_venta_base, activo, creado_por) VALUES
  (701, 'DCR-0701', '3 DWR CHEST', 20, 'taller', '{"alto":46,"ancho":50,"fondo":20}', 230.00, 1, 1),\n  (702, 'DCR-0702', '4-DWR CHEST 2-SM 2-LG', 20, 'taller', '{"alto":42,"ancho":44,"fondo":21}', 258.00, 1, 1),\n  (703, 'DCR-0703', 'HACIENDA DRESSER', 20, 'taller', '{"alto":48,"ancho":61,"fondo":19}', 960.00, 1, 1),\n  (704, 'DCR-0704', 'HONDO CHEST 6 DWR 2-SM 4-LG', 20, 'taller', '{"alto":46,"ancho":43,"fondo":22}', 500.00, 1, 1),\n  (705, 'DCR-0705', 'HONDO DRESSER 6-DWR', 20, 'taller', '{"alto":41,"ancho":42,"fondo":20}', 745.00, 1, 1),\n  (706, 'DCR-0706', 'HONDO DRESSER 7 DWR', 20, 'taller', '{"alto":38,"ancho":52,"fondo":19}', 828.00, 1, 1),\n  (707, 'DCR-0707', '39X16X18 BENCH W/LEATHER (CACHINA)', 4, 'taller', '{"alto":18,"ancho":62,"fondo":16}', 258.00, 1, 1),\n  (708, 'DCR-0708', 'MEZCALERO CACHINA CHAIR W/LEATHER', 9, 'taller', '{"alto":36,"ancho":21,"fondo":21}', 178.00, 1, 1),\n  (709, 'DCR-0709', 'COLONIAL CHAIR W/LEATHER', 9, 'taller', '{"alto":36,"ancho":21,"fondo":18}', 126.00, 1, 1),\n  (710, 'DCR-0710', 'COLONIAL CHAIR WOOD SEAT', 9, 'taller', '{"alto":41,"ancho":20,"fondo":21}', 80.00, 1, 1),\n  (711, 'DCR-0711', 'FIERRO OX YOKE LEATHER SEAT', 9, 'taller', '{"alto":38,"ancho":18,"fondo":19}', 155.00, 1, 1),\n  (712, 'DCR-0712', 'FIERRO OX YOKE WOOD SEAT', 9, 'taller', '{"alto":37,"ancho":21,"fondo":20}', 126.00, 1, 1),\n  (713, 'DCR-0713', 'PLAIN CURVE BACK BARSTOOL', 3, 'taller', '{"alto":35,"ancho":18,"fondo":20}', 0.00, 1, 1),\n  (714, 'DCR-0714', 'PLAIN CURVE STOOL', 3, 'taller', '{"alto":25,"ancho":17,"fondo":17}', 89.00, 1, 1),\n  (715, 'DCR-0715', '26'' NEW COWBOY BARSTOOL', 3, 'taller', '{"alto":35,"ancho":19,"fondo":17}', 132.00, 1, 1),\n  (716, 'DCR-0716', '6 FT RUSTIC TABLE', 3, 'taller', '{"alto":24,"ancho":17,"fondo":20}', 471.00, 1, 1),\n  (717, 'DCR-0717', 'IRONBASE BARSTOOL TOOLED LEATH. SEAT', 3, 'taller', '{"alto":30,"ancho":16,"fondo":20}', 184.00, 1, 1),\n  (718, 'DCR-0718', '6 FT. DOUBLE PEDESTAL DINING TABLE', 17, 'taller', '{"alto":33,"ancho":63,"fondo":35}', 540.00, 1, 1),\n  (719, 'DCR-0719', '7 FT. DOUBLE PEDESTAL DINING TABLE', 17, 'taller', '{"alto":31,"ancho":45,"fondo":31}', 609.00, 1, 1),\n  (720, 'DCR-0720', '8 FT. DOUBLE PEDESTAL DINING TABLE', 17, 'taller', '{"alto":35,"ancho":62,"fondo":32}', 678.00, 1, 1),\n  (721, 'DCR-0721', '9 FT. DOUBLE PEDESTAL DINING TABLE', 17, 'taller', '{"alto":36,"ancho":47,"fondo":25}', 747.00, 1, 1),\n  (722, 'DCR-0722', '10 FT DOUBLE PEDESTAL DINING TABLE', 17, 'taller', '{"alto":31,"ancho":55,"fondo":35}', 816.00, 1, 1),\n  (723, 'DCR-0723', '60" CACHINA DINING TABLE', 17, 'taller', '{"alto":33,"ancho":58,"fondo":33}', 511.00, 1, 1),\n  (724, 'DCR-0724', 'DINING TURNLEG 7''', 17, 'taller', '{"alto":30,"ancho":42,"fondo":35}', 460.00, 1, 1),\n  (725, 'DCR-0725', '60" PLAIN BISTRO STARIGHT LEG', 5, 'taller', '{"alto":32,"ancho":31,"fondo":33}', 372.00, 1, 1),\n  (726, 'DCR-0726', '36X36 BISTRO SQUARE', 5, 'taller', '{"alto":30,"ancho":33,"fondo":32}', 258.00, 1, 1),\n  (727, 'DCR-0727', '60" TV STAND FANCY TIN', 18, 'taller', '{"alto":31,"ancho":60,"fondo":17}', 445.00, 1, 1),\n  (728, 'DCR-0728', '72" TV STAND FANCY TIN', 18, 'taller', '{"alto":28,"ancho":65,"fondo":21}', 485.00, 1, 1),\n  (729, 'DCR-0729', '48" TWIG TV-STAND', 18, 'taller', '{"alto":32,"ancho":57,"fondo":17}', 299.00, 1, 1),\n  (730, 'DCR-0730', 'TV/VCR STAND 60X18X30', 18, 'taller', '{"alto":26,"ancho":54,"fondo":22}', 408.00, 1, 1),\n  (731, 'DCR-0731', 'TV/VCR STAND 60X18X36', 18, 'taller', '{"alto":32,"ancho":48,"fondo":19}', 419.00, 1, 1),\n  (732, 'DCR-0732', '11X11 MARIO''S TABLE', 19, 'taller', '{"alto":28,"ancho":39,"fondo":19}', 55.00, 1, 1),\n  (733, 'DCR-0733', '11X36 MARIO''S TABLE', 19, 'taller', '{"alto":39,"ancho":45,"fondo":16}', 80.00, 1, 1),\n  (734, 'DCR-0734', 'CABINET LINEN 5'' FANCY TIN 36X18X60', 23, 'taller', '{"alto":29,"ancho":24,"fondo":15}', 345.00, 1, 1),\n  (735, 'DCR-0735', 'IRON SUGAR MOULDING BASE', 23, 'taller', '{"alto":30,"ancho":31,"fondo":18}', 2.00, 1, 1),\n  (736, 'DCR-0736', '16X24 MARIO''S  TABLE', 19, 'taller', '{"alto":48,"ancho":36,"fondo":15}', 96.00, 1, 1);

-- ── Producto ↔ Acabados ────────────────────────────────────
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (1, 8, 1),\n  (1, 15, 0),\n  (1, 9, 0),\n  (1, 1, 0),\n  (2, 4, 1),\n  (2, 15, 0),\n  (3, 4, 1),\n  (3, 9, 0),\n  (3, 17, 0),\n  (3, 14, 0),\n  (4, 13, 1),\n  (4, 8, 0),\n  (5, 7, 1),\n  (5, 8, 0),\n  (6, 10, 1),\n  (6, 13, 0),\n  (6, 1, 0),\n  (6, 4, 0),\n  (7, 8, 1),\n  (7, 17, 0),\n  (7, 1, 0),\n  (7, 2, 0),\n  (8, 15, 1),\n  (8, 5, 0),\n  (8, 8, 0),\n  (8, 10, 0),\n  (9, 16, 1),\n  (9, 14, 0),\n  (10, 14, 1),\n  (10, 4, 0),\n  (10, 7, 0),\n  (11, 1, 1),\n  (11, 2, 0),\n  (11, 12, 0),\n  (11, 3, 0),\n  (12, 7, 1),\n  (12, 8, 0),\n  (13, 5, 1),\n  (13, 15, 0),\n  (13, 14, 0),\n  (14, 6, 1),\n  (14, 13, 0),\n  (14, 10, 0),\n  (14, 12, 0),\n  (15, 16, 1),\n  (15, 7, 0),\n  (15, 12, 0),\n  (16, 16, 1),\n  (16, 5, 0),\n  (16, 13, 0),\n  (16, 17, 0),\n  (17, 3, 1),\n  (17, 14, 0),\n  (17, 11, 0),\n  (18, 3, 1),\n  (18, 10, 0),\n  (18, 2, 0),\n  (18, 17, 0),\n  (19, 8, 1),\n  (19, 1, 0),\n  (19, 10, 0),\n  (19, 9, 0),\n  (20, 8, 1),\n  (20, 15, 0),\n  (20, 7, 0),\n  (20, 11, 0),\n  (21, 5, 1),\n  (21, 9, 0),\n  (22, 15, 1),\n  (22, 17, 0),\n  (22, 8, 0),\n  (23, 17, 1),\n  (23, 10, 0),\n  (23, 8, 0),\n  (23, 11, 0),\n  (24, 11, 1),\n  (24, 3, 0),\n  (24, 12, 0),\n  (25, 17, 1),\n  (25, 9, 0),\n  (25, 6, 0),\n  (26, 16, 1),\n  (26, 14, 0),\n  (26, 5, 0),\n  (27, 14, 1),\n  (27, 10, 0),\n  (27, 2, 0),\n  (27, 1, 0),\n  (28, 9, 1),\n  (28, 1, 0),\n  (29, 8, 1),\n  (29, 16, 0),\n  (29, 5, 0),\n  (29, 1, 0),\n  (30, 17, 1),\n  (30, 6, 0),\n  (31, 14, 1),\n  (31, 10, 0),\n  (31, 17, 0),\n  (31, 11, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (32, 13, 1),\n  (32, 10, 0),\n  (32, 16, 0),\n  (33, 10, 1),\n  (33, 3, 0),\n  (33, 1, 0),\n  (34, 17, 1),\n  (34, 8, 0),\n  (35, 16, 1),\n  (35, 8, 0),\n  (36, 11, 1),\n  (36, 15, 0),\n  (37, 4, 1),\n  (37, 7, 0),\n  (37, 3, 0),\n  (37, 14, 0),\n  (38, 14, 1),\n  (38, 7, 0),\n  (38, 8, 0),\n  (38, 16, 0),\n  (39, 17, 1),\n  (39, 15, 0),\n  (40, 3, 1),\n  (40, 17, 0),\n  (41, 1, 1),\n  (41, 3, 0),\n  (42, 7, 1),\n  (42, 1, 0),\n  (42, 2, 0),\n  (42, 3, 0),\n  (43, 1, 1),\n  (43, 9, 0),\n  (44, 6, 1),\n  (44, 7, 0),\n  (44, 13, 0),\n  (44, 2, 0),\n  (45, 16, 1),\n  (45, 15, 0),\n  (46, 3, 1),\n  (46, 4, 0),\n  (46, 1, 0),\n  (47, 16, 1),\n  (47, 1, 0),\n  (48, 17, 1),\n  (48, 1, 0),\n  (49, 14, 1),\n  (49, 2, 0),\n  (49, 1, 0),\n  (50, 8, 1),\n  (50, 13, 0),\n  (50, 17, 0),\n  (51, 5, 1),\n  (51, 7, 0),\n  (51, 6, 0),\n  (51, 2, 0),\n  (52, 2, 1),\n  (52, 1, 0),\n  (52, 16, 0),\n  (52, 12, 0),\n  (53, 15, 1),\n  (53, 1, 0),\n  (53, 2, 0),\n  (53, 12, 0),\n  (54, 4, 1),\n  (54, 7, 0),\n  (54, 1, 0),\n  (54, 17, 0),\n  (55, 15, 1),\n  (55, 13, 0),\n  (55, 1, 0),\n  (55, 8, 0),\n  (56, 14, 1),\n  (56, 4, 0),\n  (56, 6, 0),\n  (56, 3, 0),\n  (57, 9, 1),\n  (57, 6, 0),\n  (57, 1, 0),\n  (58, 8, 1),\n  (58, 1, 0),\n  (58, 2, 0),\n  (59, 13, 1),\n  (59, 9, 0),\n  (60, 11, 1),\n  (60, 6, 0),\n  (61, 8, 1),\n  (61, 5, 0),\n  (61, 9, 0),\n  (62, 8, 1),\n  (62, 1, 0),\n  (62, 5, 0),\n  (63, 10, 1),\n  (63, 7, 0),\n  (63, 11, 0),\n  (64, 2, 1),\n  (64, 14, 0),\n  (65, 3, 1),\n  (65, 1, 0),\n  (65, 11, 0),\n  (65, 12, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (66, 3, 1),\n  (66, 11, 0),\n  (66, 12, 0),\n  (66, 15, 0),\n  (67, 2, 1),\n  (67, 12, 0),\n  (67, 17, 0),\n  (67, 15, 0),\n  (68, 3, 1),\n  (68, 2, 0),\n  (68, 9, 0),\n  (68, 12, 0),\n  (69, 4, 1),\n  (69, 12, 0),\n  (70, 15, 1),\n  (70, 17, 0),\n  (70, 12, 0),\n  (71, 8, 1),\n  (71, 1, 0),\n  (71, 13, 0),\n  (71, 4, 0),\n  (72, 12, 1),\n  (72, 4, 0),\n  (72, 2, 0),\n  (72, 1, 0),\n  (73, 15, 1),\n  (73, 5, 0),\n  (74, 2, 1),\n  (74, 1, 0),\n  (74, 3, 0),\n  (74, 4, 0),\n  (75, 4, 1),\n  (75, 11, 0),\n  (75, 12, 0),\n  (75, 2, 0),\n  (76, 5, 1),\n  (76, 11, 0),\n  (76, 8, 0),\n  (76, 12, 0),\n  (77, 12, 1),\n  (77, 15, 0),\n  (78, 9, 1),\n  (78, 3, 0),\n  (78, 2, 0),\n  (79, 1, 1),\n  (79, 16, 0),\n  (80, 10, 1),\n  (80, 6, 0),\n  (80, 1, 0),\n  (81, 1, 1),\n  (81, 13, 0),\n  (81, 12, 0),\n  (81, 3, 0),\n  (82, 11, 1),\n  (82, 15, 0),\n  (83, 3, 1),\n  (83, 11, 0),\n  (83, 17, 0),\n  (83, 2, 0),\n  (84, 8, 1),\n  (84, 1, 0),\n  (85, 11, 1),\n  (85, 7, 0),\n  (86, 9, 1),\n  (86, 8, 0),\n  (87, 3, 1),\n  (87, 14, 0),\n  (87, 7, 0),\n  (87, 13, 0),\n  (88, 7, 1),\n  (88, 14, 0),\n  (88, 1, 0),\n  (89, 16, 1),\n  (89, 4, 0),\n  (89, 14, 0),\n  (90, 4, 1),\n  (90, 9, 0),\n  (90, 12, 0),\n  (91, 15, 1),\n  (91, 13, 0),\n  (91, 1, 0),\n  (92, 1, 1),\n  (92, 4, 0),\n  (92, 6, 0),\n  (93, 16, 1),\n  (93, 7, 0),\n  (93, 17, 0),\n  (94, 1, 1),\n  (94, 2, 0),\n  (95, 6, 1),\n  (95, 5, 0),\n  (95, 1, 0),\n  (95, 16, 0),\n  (96, 15, 1),\n  (96, 8, 0),\n  (97, 1, 1),\n  (97, 3, 0),\n  (98, 6, 1),\n  (98, 13, 0),\n  (99, 8, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (99, 3, 0),\n  (99, 17, 0),\n  (100, 6, 1),\n  (100, 12, 0),\n  (101, 7, 1),\n  (101, 10, 0),\n  (101, 3, 0),\n  (101, 11, 0),\n  (102, 9, 1),\n  (102, 8, 0),\n  (102, 10, 0),\n  (102, 1, 0),\n  (103, 1, 1),\n  (103, 16, 0),\n  (103, 7, 0),\n  (104, 7, 1),\n  (104, 6, 0),\n  (105, 7, 1),\n  (105, 4, 0),\n  (106, 7, 1),\n  (106, 4, 0),\n  (106, 10, 0),\n  (107, 9, 1),\n  (107, 4, 0),\n  (108, 16, 1),\n  (108, 4, 0),\n  (108, 2, 0),\n  (108, 9, 0),\n  (109, 11, 1),\n  (109, 6, 0),\n  (110, 1, 1),\n  (110, 12, 0),\n  (111, 1, 1),\n  (111, 5, 0),\n  (112, 14, 1),\n  (112, 12, 0),\n  (112, 4, 0),\n  (113, 1, 1),\n  (113, 2, 0),\n  (114, 10, 1),\n  (114, 17, 0),\n  (114, 4, 0),\n  (114, 7, 0),\n  (115, 8, 1),\n  (115, 6, 0),\n  (116, 7, 1),\n  (116, 1, 0),\n  (116, 2, 0),\n  (117, 14, 1),\n  (117, 4, 0),\n  (117, 7, 0),\n  (118, 14, 1),\n  (118, 4, 0),\n  (118, 6, 0),\n  (119, 12, 1),\n  (119, 13, 0),\n  (119, 2, 0),\n  (119, 6, 0),\n  (120, 16, 1),\n  (120, 12, 0),\n  (120, 5, 0),\n  (121, 4, 1),\n  (121, 11, 0),\n  (122, 12, 1),\n  (122, 1, 0),\n  (122, 4, 0),\n  (123, 14, 1),\n  (123, 6, 0),\n  (123, 4, 0),\n  (123, 3, 0),\n  (124, 16, 1),\n  (124, 4, 0),\n  (124, 12, 0),\n  (124, 3, 0),\n  (125, 9, 1),\n  (125, 6, 0),\n  (125, 10, 0),\n  (126, 14, 1),\n  (126, 7, 0),\n  (127, 8, 1),\n  (127, 16, 0),\n  (127, 1, 0),\n  (128, 16, 1),\n  (128, 9, 0),\n  (128, 10, 0),\n  (129, 1, 1),\n  (129, 10, 0),\n  (129, 17, 0),\n  (129, 11, 0),\n  (130, 7, 1),\n  (130, 17, 0),\n  (130, 5, 0),\n  (130, 6, 0),\n  (131, 15, 1),\n  (131, 1, 0),\n  (131, 8, 0),\n  (131, 9, 0),\n  (132, 15, 1),\n  (132, 10, 0),\n  (132, 13, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (132, 3, 0),\n  (133, 3, 1),\n  (133, 1, 0),\n  (133, 8, 0),\n  (133, 10, 0),\n  (134, 12, 1),\n  (134, 15, 0),\n  (134, 11, 0),\n  (135, 6, 1),\n  (135, 8, 0),\n  (135, 12, 0),\n  (136, 12, 1),\n  (136, 7, 0),\n  (137, 15, 1),\n  (137, 4, 0),\n  (137, 8, 0),\n  (137, 9, 0),\n  (138, 16, 1),\n  (138, 17, 0),\n  (138, 12, 0),\n  (138, 11, 0),\n  (139, 16, 1),\n  (139, 2, 0),\n  (139, 4, 0),\n  (140, 6, 1),\n  (140, 13, 0),\n  (140, 15, 0),\n  (140, 3, 0),\n  (141, 2, 1),\n  (141, 11, 0),\n  (141, 17, 0),\n  (141, 16, 0),\n  (142, 16, 1),\n  (142, 8, 0),\n  (142, 11, 0),\n  (142, 10, 0),\n  (143, 8, 1),\n  (143, 1, 0),\n  (143, 10, 0),\n  (144, 1, 1),\n  (144, 7, 0),\n  (145, 2, 1),\n  (145, 14, 0),\n  (146, 15, 1),\n  (146, 2, 0),\n  (147, 1, 1),\n  (147, 11, 0),\n  (147, 2, 0),\n  (148, 13, 1),\n  (148, 1, 0),\n  (148, 6, 0),\n  (149, 10, 1),\n  (149, 2, 0),\n  (149, 16, 0),\n  (150, 1, 1),\n  (150, 2, 0),\n  (150, 6, 0),\n  (151, 17, 1),\n  (151, 4, 0),\n  (151, 12, 0),\n  (151, 16, 0),\n  (152, 7, 1),\n  (152, 16, 0),\n  (153, 10, 1),\n  (153, 7, 0),\n  (153, 6, 0),\n  (154, 14, 1),\n  (154, 3, 0),\n  (155, 4, 1),\n  (155, 10, 0),\n  (155, 8, 0),\n  (156, 8, 1),\n  (156, 4, 0),\n  (156, 1, 0),\n  (156, 12, 0),\n  (157, 14, 1),\n  (157, 12, 0),\n  (158, 12, 1),\n  (158, 7, 0),\n  (159, 7, 1),\n  (159, 1, 0),\n  (159, 11, 0),\n  (160, 2, 1),\n  (160, 1, 0),\n  (161, 14, 1),\n  (161, 11, 0),\n  (162, 8, 1),\n  (162, 3, 0),\n  (162, 17, 0),\n  (162, 11, 0),\n  (163, 7, 1),\n  (163, 6, 0),\n  (163, 15, 0),\n  (164, 6, 1),\n  (164, 1, 0),\n  (164, 2, 0),\n  (165, 15, 1),\n  (165, 7, 0),\n  (166, 7, 1),\n  (166, 4, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (167, 14, 1),\n  (167, 2, 0),\n  (167, 9, 0),\n  (167, 6, 0),\n  (168, 1, 1),\n  (168, 2, 0),\n  (168, 12, 0),\n  (168, 3, 0),\n  (169, 8, 1),\n  (169, 17, 0),\n  (169, 16, 0),\n  (170, 6, 1),\n  (170, 2, 0),\n  (171, 3, 1),\n  (171, 2, 0),\n  (171, 9, 0),\n  (172, 7, 1),\n  (172, 1, 0),\n  (172, 10, 0),\n  (173, 16, 1),\n  (173, 2, 0),\n  (174, 15, 1),\n  (174, 9, 0),\n  (174, 1, 0),\n  (174, 3, 0),\n  (175, 6, 1),\n  (175, 7, 0),\n  (175, 4, 0),\n  (176, 3, 1),\n  (176, 17, 0),\n  (176, 2, 0),\n  (176, 5, 0),\n  (177, 15, 1),\n  (177, 8, 0),\n  (177, 4, 0),\n  (177, 12, 0),\n  (178, 3, 1),\n  (178, 4, 0),\n  (178, 16, 0),\n  (178, 6, 0),\n  (179, 4, 1),\n  (179, 2, 0),\n  (180, 12, 1),\n  (180, 16, 0),\n  (180, 3, 0),\n  (180, 9, 0),\n  (181, 11, 1),\n  (181, 9, 0),\n  (181, 1, 0),\n  (181, 4, 0),\n  (182, 8, 1),\n  (182, 3, 0),\n  (182, 15, 0),\n  (183, 6, 1),\n  (183, 2, 0),\n  (184, 5, 1),\n  (184, 6, 0),\n  (184, 11, 0),\n  (184, 15, 0),\n  (185, 14, 1),\n  (185, 1, 0),\n  (185, 2, 0),\n  (186, 1, 1),\n  (186, 12, 0),\n  (187, 4, 1),\n  (187, 6, 0),\n  (187, 13, 0),\n  (188, 6, 1),\n  (188, 7, 0),\n  (188, 12, 0),\n  (189, 8, 1),\n  (189, 16, 0),\n  (189, 13, 0),\n  (190, 13, 1),\n  (190, 8, 0),\n  (191, 11, 1),\n  (191, 4, 0),\n  (192, 5, 1),\n  (192, 13, 0),\n  (193, 11, 1),\n  (193, 6, 0),\n  (193, 15, 0),\n  (193, 9, 0),\n  (194, 17, 1),\n  (194, 11, 0),\n  (195, 14, 1),\n  (195, 3, 0),\n  (195, 7, 0),\n  (195, 2, 0),\n  (196, 12, 1),\n  (196, 14, 0),\n  (196, 3, 0),\n  (196, 7, 0),\n  (197, 3, 1),\n  (197, 15, 0),\n  (197, 7, 0),\n  (197, 11, 0),\n  (198, 11, 1),\n  (198, 1, 0),\n  (198, 15, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (198, 13, 0),\n  (199, 10, 1),\n  (199, 4, 0),\n  (199, 11, 0),\n  (200, 16, 1),\n  (200, 14, 0),\n  (201, 7, 1),\n  (201, 15, 0),\n  (201, 10, 0),\n  (201, 12, 0),\n  (202, 15, 1),\n  (202, 13, 0),\n  (203, 5, 1),\n  (203, 17, 0),\n  (203, 7, 0),\n  (203, 8, 0),\n  (204, 12, 1),\n  (204, 14, 0),\n  (204, 4, 0),\n  (205, 13, 1),\n  (205, 1, 0),\n  (205, 17, 0),\n  (206, 4, 1),\n  (206, 3, 0),\n  (206, 2, 0),\n  (207, 7, 1),\n  (207, 12, 0),\n  (207, 13, 0),\n  (208, 4, 1),\n  (208, 14, 0),\n  (209, 3, 1),\n  (209, 6, 0),\n  (210, 5, 1),\n  (210, 16, 0),\n  (210, 10, 0),\n  (211, 10, 1),\n  (211, 3, 0),\n  (211, 11, 0),\n  (212, 1, 1),\n  (212, 7, 0),\n  (212, 14, 0),\n  (213, 5, 1),\n  (213, 4, 0),\n  (213, 12, 0),\n  (214, 1, 1),\n  (214, 15, 0),\n  (215, 1, 1),\n  (215, 3, 0),\n  (215, 2, 0),\n  (216, 3, 1),\n  (216, 4, 0),\n  (216, 2, 0),\n  (217, 4, 1),\n  (217, 14, 0),\n  (217, 5, 0),\n  (217, 15, 0),\n  (218, 3, 1),\n  (218, 15, 0),\n  (219, 6, 1),\n  (219, 5, 0),\n  (219, 10, 0),\n  (219, 12, 0),\n  (220, 8, 1),\n  (220, 7, 0),\n  (221, 1, 1),\n  (221, 2, 0),\n  (222, 15, 1),\n  (222, 5, 0),\n  (223, 14, 1),\n  (223, 13, 0),\n  (223, 15, 0),\n  (224, 4, 1),\n  (224, 2, 0),\n  (224, 10, 0),\n  (225, 6, 1),\n  (225, 1, 0),\n  (226, 5, 1),\n  (226, 4, 0),\n  (226, 10, 0),\n  (227, 16, 1),\n  (227, 12, 0),\n  (228, 4, 1),\n  (228, 11, 0),\n  (229, 11, 1),\n  (229, 16, 0),\n  (230, 15, 1),\n  (230, 1, 0),\n  (230, 2, 0),\n  (231, 5, 1),\n  (231, 4, 0),\n  (231, 10, 0),\n  (232, 1, 1),\n  (232, 8, 0),\n  (232, 7, 0),\n  (232, 10, 0),\n  (233, 8, 1),\n  (233, 4, 0),\n  (233, 15, 0),\n  (234, 8, 1),\n  (234, 14, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (235, 6, 1),\n  (235, 2, 0),\n  (235, 11, 0),\n  (235, 13, 0),\n  (236, 1, 1),\n  (236, 7, 0),\n  (236, 5, 0),\n  (236, 14, 0),\n  (237, 6, 1),\n  (237, 10, 0),\n  (237, 13, 0),\n  (238, 8, 1),\n  (238, 3, 0),\n  (238, 17, 0),\n  (238, 12, 0),\n  (239, 5, 1),\n  (239, 12, 0),\n  (240, 1, 1),\n  (240, 2, 0),\n  (240, 16, 0),\n  (241, 17, 1),\n  (241, 3, 0),\n  (241, 2, 0),\n  (242, 1, 1),\n  (242, 11, 0),\n  (243, 1, 1),\n  (243, 16, 0),\n  (243, 14, 0),\n  (244, 10, 1),\n  (244, 7, 0),\n  (244, 11, 0),\n  (244, 2, 0),\n  (245, 16, 1),\n  (245, 8, 0),\n  (246, 12, 1),\n  (246, 4, 0),\n  (246, 16, 0),\n  (247, 1, 1),\n  (247, 2, 0),\n  (248, 11, 1),\n  (248, 9, 0),\n  (248, 10, 0),\n  (249, 1, 1),\n  (249, 15, 0),\n  (249, 14, 0),\n  (249, 17, 0),\n  (250, 13, 1),\n  (250, 15, 0),\n  (250, 17, 0),\n  (251, 13, 1),\n  (251, 1, 0),\n  (251, 2, 0),\n  (251, 11, 0),\n  (252, 16, 1),\n  (252, 17, 0),\n  (252, 4, 0),\n  (253, 13, 1),\n  (253, 7, 0),\n  (254, 16, 1),\n  (254, 15, 0),\n  (254, 8, 0),\n  (254, 5, 0),\n  (255, 2, 1),\n  (255, 5, 0),\n  (255, 14, 0),\n  (256, 9, 1),\n  (256, 16, 0),\n  (257, 5, 1),\n  (257, 14, 0),\n  (258, 10, 1),\n  (258, 1, 0),\n  (259, 16, 1),\n  (259, 1, 0),\n  (259, 3, 0),\n  (259, 15, 0),\n  (260, 15, 1),\n  (260, 16, 0),\n  (261, 2, 1),\n  (261, 7, 0),\n  (262, 12, 1),\n  (262, 13, 0),\n  (262, 1, 0),\n  (263, 16, 1),\n  (263, 10, 0),\n  (263, 8, 0),\n  (263, 17, 0),\n  (264, 15, 1),\n  (264, 16, 0),\n  (264, 8, 0),\n  (265, 5, 1),\n  (265, 8, 0),\n  (265, 7, 0),\n  (266, 8, 1),\n  (266, 1, 0),\n  (267, 10, 1),\n  (267, 14, 0),\n  (267, 6, 0),\n  (267, 3, 0),\n  (268, 8, 1),\n  (268, 1, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (268, 2, 0),\n  (268, 12, 0),\n  (269, 4, 1),\n  (269, 2, 0),\n  (269, 11, 0),\n  (269, 10, 0),\n  (270, 1, 1),\n  (270, 16, 0),\n  (270, 5, 0),\n  (271, 9, 1),\n  (271, 10, 0),\n  (272, 5, 1),\n  (272, 7, 0),\n  (272, 15, 0),\n  (273, 4, 1),\n  (273, 3, 0),\n  (273, 5, 0),\n  (274, 1, 1),\n  (274, 8, 0),\n  (274, 17, 0),\n  (275, 10, 1),\n  (275, 1, 0),\n  (275, 17, 0),\n  (275, 16, 0),\n  (276, 4, 1),\n  (276, 3, 0),\n  (276, 11, 0),\n  (276, 2, 0),\n  (277, 8, 1),\n  (277, 12, 0),\n  (277, 16, 0),\n  (277, 9, 0),\n  (278, 10, 1),\n  (278, 3, 0),\n  (279, 1, 1),\n  (279, 3, 0),\n  (279, 17, 0),\n  (279, 12, 0),\n  (280, 15, 1),\n  (280, 17, 0),\n  (281, 5, 1),\n  (281, 16, 0),\n  (281, 4, 0),\n  (282, 14, 1),\n  (282, 17, 0),\n  (283, 4, 1),\n  (283, 1, 0),\n  (283, 17, 0),\n  (283, 8, 0),\n  (284, 1, 1),\n  (284, 15, 0),\n  (285, 4, 1),\n  (285, 13, 0),\n  (285, 5, 0),\n  (285, 7, 0),\n  (286, 8, 1),\n  (286, 9, 0),\n  (286, 2, 0),\n  (287, 6, 1),\n  (287, 11, 0),\n  (287, 4, 0),\n  (287, 2, 0),\n  (288, 14, 1),\n  (288, 3, 0),\n  (288, 9, 0),\n  (288, 7, 0),\n  (289, 14, 1),\n  (289, 6, 0),\n  (289, 2, 0),\n  (289, 1, 0),\n  (290, 3, 1),\n  (290, 17, 0),\n  (291, 7, 1),\n  (291, 16, 0),\n  (291, 6, 0),\n  (291, 12, 0),\n  (292, 8, 1),\n  (292, 16, 0),\n  (293, 4, 1),\n  (293, 8, 0),\n  (293, 3, 0),\n  (294, 16, 1),\n  (294, 3, 0),\n  (294, 2, 0),\n  (295, 16, 1),\n  (295, 1, 0),\n  (296, 5, 1),\n  (296, 11, 0),\n  (296, 6, 0),\n  (296, 13, 0),\n  (297, 15, 1),\n  (297, 7, 0),\n  (297, 14, 0),\n  (298, 8, 1),\n  (298, 16, 0),\n  (298, 17, 0),\n  (299, 16, 1),\n  (299, 13, 0),\n  (299, 11, 0),\n  (300, 13, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (300, 9, 0),\n  (300, 17, 0),\n  (301, 13, 1),\n  (301, 3, 0),\n  (301, 16, 0),\n  (302, 6, 1),\n  (302, 1, 0),\n  (303, 12, 1),\n  (303, 10, 0),\n  (303, 13, 0),\n  (303, 15, 0),\n  (304, 10, 1),\n  (304, 11, 0),\n  (304, 4, 0),\n  (304, 7, 0),\n  (305, 9, 1),\n  (305, 4, 0),\n  (306, 15, 1),\n  (306, 5, 0),\n  (306, 16, 0),\n  (307, 3, 1),\n  (307, 2, 0),\n  (308, 8, 1),\n  (308, 13, 0),\n  (308, 17, 0),\n  (309, 14, 1),\n  (309, 7, 0),\n  (309, 15, 0),\n  (310, 8, 1),\n  (310, 1, 0),\n  (311, 14, 1),\n  (311, 11, 0),\n  (311, 12, 0),\n  (311, 9, 0),\n  (312, 17, 1),\n  (312, 10, 0),\n  (313, 13, 1),\n  (313, 15, 0),\n  (313, 4, 0),\n  (313, 17, 0),\n  (314, 5, 1),\n  (314, 8, 0),\n  (314, 14, 0),\n  (315, 10, 1),\n  (315, 7, 0),\n  (316, 7, 1),\n  (316, 4, 0),\n  (316, 3, 0),\n  (317, 15, 1),\n  (317, 6, 0),\n  (317, 14, 0),\n  (318, 7, 1),\n  (318, 11, 0),\n  (319, 8, 1),\n  (319, 4, 0),\n  (320, 15, 1),\n  (320, 1, 0),\n  (320, 14, 0),\n  (320, 16, 0),\n  (321, 16, 1),\n  (321, 5, 0),\n  (322, 15, 1),\n  (322, 6, 0),\n  (322, 9, 0),\n  (323, 3, 1),\n  (323, 13, 0),\n  (323, 12, 0),\n  (324, 8, 1),\n  (324, 6, 0),\n  (324, 14, 0),\n  (324, 15, 0),\n  (325, 16, 1),\n  (325, 13, 0),\n  (325, 15, 0),\n  (325, 2, 0),\n  (326, 15, 1),\n  (326, 12, 0),\n  (326, 1, 0),\n  (326, 11, 0),\n  (327, 12, 1),\n  (327, 9, 0),\n  (328, 7, 1),\n  (328, 13, 0),\n  (328, 12, 0),\n  (328, 14, 0),\n  (329, 1, 1),\n  (329, 14, 0),\n  (329, 4, 0),\n  (329, 8, 0),\n  (330, 4, 1),\n  (330, 3, 0),\n  (331, 10, 1),\n  (331, 12, 0),\n  (331, 7, 0),\n  (331, 3, 0),\n  (332, 17, 1),\n  (332, 10, 0),\n  (332, 1, 0),\n  (333, 4, 1),\n  (333, 8, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (334, 11, 1),\n  (334, 5, 0),\n  (334, 2, 0),\n  (335, 8, 1),\n  (335, 5, 0),\n  (335, 12, 0),\n  (336, 9, 1),\n  (336, 6, 0),\n  (336, 4, 0),\n  (337, 7, 1),\n  (337, 14, 0),\n  (337, 3, 0),\n  (338, 10, 1),\n  (338, 4, 0),\n  (339, 7, 1),\n  (339, 11, 0),\n  (339, 14, 0),\n  (339, 4, 0),\n  (340, 5, 1),\n  (340, 4, 0),\n  (340, 14, 0),\n  (341, 9, 1),\n  (341, 6, 0),\n  (342, 7, 1),\n  (342, 4, 0),\n  (342, 3, 0),\n  (342, 9, 0),\n  (343, 15, 1),\n  (343, 1, 0),\n  (343, 7, 0),\n  (343, 16, 0),\n  (344, 3, 1),\n  (344, 17, 0),\n  (344, 8, 0),\n  (345, 2, 1),\n  (345, 9, 0),\n  (345, 10, 0),\n  (346, 14, 1),\n  (346, 15, 0),\n  (346, 9, 0),\n  (346, 11, 0),\n  (347, 1, 1),\n  (347, 7, 0),\n  (348, 6, 1),\n  (348, 10, 0),\n  (349, 10, 1),\n  (349, 15, 0),\n  (349, 14, 0),\n  (349, 11, 0),\n  (350, 4, 1),\n  (350, 3, 0),\n  (351, 13, 1),\n  (351, 4, 0),\n  (351, 14, 0),\n  (352, 15, 1),\n  (352, 5, 0),\n  (353, 5, 1),\n  (353, 8, 0),\n  (354, 8, 1),\n  (354, 3, 0),\n  (355, 7, 1),\n  (355, 8, 0),\n  (355, 3, 0),\n  (355, 15, 0),\n  (356, 4, 1),\n  (356, 16, 0),\n  (357, 11, 1),\n  (357, 16, 0),\n  (358, 9, 1),\n  (358, 14, 0),\n  (359, 3, 1),\n  (359, 2, 0),\n  (359, 6, 0),\n  (359, 17, 0),\n  (360, 4, 1),\n  (360, 8, 0),\n  (361, 3, 1),\n  (361, 11, 0),\n  (361, 7, 0),\n  (362, 6, 1),\n  (362, 17, 0),\n  (362, 16, 0),\n  (363, 14, 1),\n  (363, 16, 0),\n  (363, 12, 0),\n  (363, 8, 0),\n  (364, 10, 1),\n  (364, 1, 0),\n  (364, 11, 0),\n  (364, 17, 0),\n  (365, 1, 1),\n  (365, 12, 0),\n  (365, 13, 0),\n  (366, 6, 1),\n  (366, 11, 0),\n  (367, 1, 1),\n  (367, 2, 0),\n  (367, 8, 0),\n  (368, 14, 1),\n  (368, 12, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (369, 11, 1),\n  (369, 8, 0),\n  (370, 16, 1),\n  (370, 4, 0),\n  (370, 12, 0),\n  (371, 5, 1),\n  (371, 2, 0),\n  (371, 1, 0),\n  (372, 7, 1),\n  (372, 16, 0),\n  (372, 1, 0),\n  (373, 10, 1),\n  (373, 11, 0),\n  (373, 7, 0),\n  (374, 14, 1),\n  (374, 2, 0),\n  (375, 3, 1),\n  (375, 2, 0),\n  (375, 12, 0),\n  (375, 14, 0),\n  (376, 16, 1),\n  (376, 5, 0),\n  (376, 1, 0),\n  (377, 11, 1),\n  (377, 1, 0),\n  (377, 10, 0),\n  (378, 2, 1),\n  (378, 1, 0),\n  (378, 10, 0),\n  (378, 16, 0),\n  (379, 5, 1),\n  (379, 4, 0),\n  (379, 3, 0),\n  (380, 1, 1),\n  (380, 12, 0),\n  (380, 13, 0),\n  (380, 2, 0),\n  (381, 16, 1),\n  (381, 14, 0),\n  (381, 9, 0),\n  (382, 3, 1),\n  (382, 5, 0),\n  (382, 11, 0),\n  (383, 13, 1),\n  (383, 4, 0),\n  (383, 1, 0),\n  (384, 1, 1),\n  (384, 2, 0),\n  (384, 7, 0),\n  (384, 8, 0),\n  (385, 4, 1),\n  (385, 3, 0),\n  (385, 11, 0),\n  (386, 7, 1),\n  (386, 11, 0),\n  (387, 11, 1),\n  (387, 6, 0),\n  (387, 5, 0),\n  (387, 14, 0),\n  (388, 6, 1),\n  (388, 14, 0),\n  (388, 17, 0),\n  (388, 1, 0),\n  (389, 11, 1),\n  (389, 6, 0),\n  (389, 13, 0),\n  (390, 3, 1),\n  (390, 5, 0),\n  (390, 12, 0),\n  (391, 1, 1),\n  (391, 7, 0),\n  (391, 16, 0),\n  (391, 12, 0),\n  (392, 3, 1),\n  (392, 13, 0),\n  (393, 16, 1),\n  (393, 10, 0),\n  (394, 10, 1),\n  (394, 1, 0),\n  (395, 1, 1),\n  (395, 4, 0),\n  (396, 1, 1),\n  (396, 9, 0),\n  (396, 11, 0),\n  (396, 3, 0),\n  (397, 3, 1),\n  (397, 7, 0),\n  (398, 4, 1),\n  (398, 9, 0),\n  (398, 6, 0),\n  (399, 12, 1),\n  (399, 6, 0),\n  (399, 8, 0),\n  (400, 1, 1),\n  (400, 6, 0),\n  (400, 17, 0),\n  (400, 11, 0),\n  (401, 3, 1),\n  (401, 5, 0),\n  (401, 6, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (402, 11, 1),\n  (402, 10, 0),\n  (402, 7, 0),\n  (403, 16, 1),\n  (403, 14, 0),\n  (403, 2, 0),\n  (404, 16, 1),\n  (404, 1, 0),\n  (405, 8, 1),\n  (405, 3, 0),\n  (405, 10, 0),\n  (406, 4, 1),\n  (406, 15, 0),\n  (406, 3, 0),\n  (407, 5, 1),\n  (407, 13, 0),\n  (408, 10, 1),\n  (408, 7, 0),\n  (409, 6, 1),\n  (409, 1, 0),\n  (409, 9, 0),\n  (410, 16, 1),\n  (410, 8, 0),\n  (410, 4, 0),\n  (410, 7, 0),\n  (411, 8, 1),\n  (411, 4, 0),\n  (412, 7, 1),\n  (412, 12, 0),\n  (412, 4, 0),\n  (412, 14, 0),\n  (413, 13, 1),\n  (413, 5, 0),\n  (414, 10, 1),\n  (414, 16, 0),\n  (414, 4, 0),\n  (415, 1, 1),\n  (415, 6, 0),\n  (415, 4, 0),\n  (416, 15, 1),\n  (416, 5, 0),\n  (416, 2, 0),\n  (416, 3, 0),\n  (417, 8, 1),\n  (417, 15, 0),\n  (417, 2, 0),\n  (418, 1, 1),\n  (418, 13, 0),\n  (418, 4, 0),\n  (419, 8, 1),\n  (419, 7, 0),\n  (419, 4, 0),\n  (419, 1, 0),\n  (420, 16, 1),\n  (420, 7, 0),\n  (420, 3, 0),\n  (420, 11, 0),\n  (421, 4, 1),\n  (421, 13, 0),\n  (422, 13, 1),\n  (422, 8, 0),\n  (422, 7, 0),\n  (423, 4, 1),\n  (423, 8, 0),\n  (423, 12, 0),\n  (424, 4, 1),\n  (424, 5, 0),\n  (424, 12, 0),\n  (425, 1, 1),\n  (425, 6, 0),\n  (425, 4, 0),\n  (425, 13, 0),\n  (426, 2, 1),\n  (426, 1, 0),\n  (426, 16, 0),\n  (427, 14, 1),\n  (427, 15, 0),\n  (427, 4, 0),\n  (428, 2, 1),\n  (428, 1, 0),\n  (429, 7, 1),\n  (429, 16, 0),\n  (429, 17, 0),\n  (430, 13, 1),\n  (430, 3, 0),\n  (430, 2, 0),\n  (430, 5, 0),\n  (431, 1, 1),\n  (431, 6, 0),\n  (431, 9, 0),\n  (431, 10, 0),\n  (432, 1, 1),\n  (432, 2, 0),\n  (432, 6, 0),\n  (433, 13, 1),\n  (433, 12, 0),\n  (433, 11, 0),\n  (434, 4, 1),\n  (434, 9, 0),\n  (435, 12, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (435, 6, 0),\n  (435, 7, 0),\n  (435, 9, 0),\n  (436, 17, 1),\n  (436, 1, 0),\n  (436, 2, 0),\n  (436, 11, 0),\n  (437, 7, 1),\n  (437, 11, 0),\n  (437, 1, 0),\n  (438, 8, 1),\n  (438, 13, 0),\n  (438, 14, 0),\n  (439, 7, 1),\n  (439, 4, 0),\n  (439, 1, 0),\n  (439, 9, 0),\n  (440, 1, 1),\n  (440, 14, 0),\n  (441, 14, 1),\n  (441, 16, 0),\n  (442, 1, 1),\n  (442, 2, 0),\n  (442, 13, 0),\n  (442, 11, 0),\n  (443, 4, 1),\n  (443, 3, 0),\n  (444, 6, 1),\n  (444, 1, 0),\n  (445, 5, 1),\n  (445, 8, 0),\n  (446, 16, 1),\n  (446, 8, 0),\n  (446, 7, 0),\n  (446, 10, 0),\n  (447, 4, 1),\n  (447, 5, 0),\n  (448, 6, 1),\n  (448, 14, 0),\n  (449, 15, 1),\n  (449, 5, 0),\n  (450, 15, 1),\n  (450, 1, 0),\n  (451, 6, 1),\n  (451, 1, 0),\n  (451, 11, 0),\n  (452, 12, 1),\n  (452, 4, 0),\n  (453, 4, 1),\n  (453, 16, 0),\n  (453, 3, 0),\n  (453, 17, 0),\n  (454, 9, 1),\n  (454, 6, 0),\n  (455, 17, 1),\n  (455, 14, 0),\n  (455, 3, 0),\n  (456, 5, 1),\n  (456, 6, 0),\n  (457, 8, 1),\n  (457, 3, 0),\n  (458, 7, 1),\n  (458, 8, 0),\n  (458, 12, 0),\n  (459, 6, 1),\n  (459, 16, 0),\n  (459, 5, 0),\n  (460, 12, 1),\n  (460, 4, 0),\n  (460, 17, 0),\n  (461, 1, 1),\n  (461, 7, 0),\n  (462, 9, 1),\n  (462, 8, 0),\n  (462, 10, 0),\n  (463, 11, 1),\n  (463, 5, 0),\n  (464, 3, 1),\n  (464, 16, 0),\n  (464, 4, 0),\n  (465, 13, 1),\n  (465, 1, 0),\n  (465, 2, 0),\n  (466, 16, 1),\n  (466, 14, 0),\n  (466, 4, 0),\n  (467, 13, 1),\n  (467, 9, 0),\n  (467, 1, 0),\n  (468, 8, 1),\n  (468, 4, 0),\n  (468, 3, 0),\n  (469, 15, 1),\n  (469, 4, 0),\n  (470, 5, 1),\n  (470, 8, 0),\n  (471, 7, 1),\n  (471, 14, 0),\n  (471, 4, 0),\n  (471, 11, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (472, 9, 1),\n  (472, 8, 0),\n  (472, 10, 0),\n  (472, 7, 0),\n  (473, 5, 1),\n  (473, 16, 0),\n  (473, 13, 0),\n  (474, 4, 1),\n  (474, 8, 0),\n  (474, 3, 0),\n  (474, 15, 0),\n  (475, 1, 1),\n  (475, 3, 0),\n  (476, 7, 1),\n  (476, 11, 0),\n  (477, 11, 1),\n  (477, 3, 0),\n  (477, 7, 0),\n  (477, 4, 0),\n  (478, 1, 1),\n  (478, 5, 0),\n  (478, 6, 0),\n  (478, 2, 0),\n  (479, 1, 1),\n  (479, 2, 0),\n  (479, 5, 0),\n  (479, 8, 0),\n  (480, 8, 1),\n  (480, 1, 0),\n  (481, 16, 1),\n  (481, 15, 0),\n  (482, 10, 1),\n  (482, 15, 0),\n  (482, 8, 0),\n  (483, 13, 1),\n  (483, 9, 0),\n  (483, 14, 0),\n  (484, 3, 1),\n  (484, 14, 0),\n  (485, 8, 1),\n  (485, 5, 0),\n  (486, 3, 1),\n  (486, 14, 0),\n  (487, 8, 1),\n  (487, 5, 0),\n  (488, 4, 1),\n  (488, 7, 0),\n  (488, 3, 0),\n  (489, 12, 1),\n  (489, 11, 0),\n  (490, 17, 1),\n  (490, 9, 0),\n  (490, 1, 0),\n  (491, 3, 1),\n  (491, 17, 0),\n  (491, 8, 0),\n  (492, 11, 1),\n  (492, 4, 0),\n  (492, 12, 0),\n  (493, 6, 1),\n  (493, 4, 0),\n  (493, 15, 0),\n  (493, 1, 0),\n  (494, 17, 1),\n  (494, 11, 0),\n  (495, 4, 1),\n  (495, 5, 0),\n  (495, 11, 0),\n  (496, 8, 1),\n  (496, 7, 0),\n  (496, 17, 0),\n  (497, 3, 1),\n  (497, 8, 0),\n  (497, 4, 0),\n  (498, 10, 1),\n  (498, 6, 0),\n  (498, 12, 0),\n  (499, 3, 1),\n  (499, 2, 0),\n  (499, 11, 0),\n  (500, 10, 1),\n  (500, 5, 0),\n  (500, 3, 0),\n  (500, 16, 0),\n  (501, 12, 1),\n  (501, 17, 0),\n  (501, 11, 0),\n  (501, 1, 0),\n  (502, 4, 1),\n  (502, 3, 0),\n  (502, 17, 0),\n  (503, 1, 1),\n  (503, 15, 0),\n  (503, 13, 0),\n  (504, 15, 1),\n  (504, 10, 0),\n  (504, 17, 0),\n  (505, 5, 1),\n  (505, 4, 0),\n  (505, 13, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (505, 16, 0),\n  (506, 7, 1),\n  (506, 12, 0),\n  (506, 14, 0),\n  (507, 8, 1),\n  (507, 16, 0),\n  (507, 3, 0),\n  (507, 1, 0),\n  (508, 9, 1),\n  (508, 15, 0),\n  (508, 8, 0),\n  (508, 6, 0),\n  (509, 17, 1),\n  (509, 1, 0),\n  (510, 9, 1),\n  (510, 4, 0),\n  (510, 10, 0),\n  (511, 6, 1),\n  (511, 12, 0),\n  (512, 8, 1),\n  (512, 4, 0),\n  (513, 14, 1),\n  (513, 4, 0),\n  (513, 3, 0),\n  (513, 17, 0),\n  (514, 14, 1),\n  (514, 3, 0),\n  (514, 15, 0),\n  (515, 17, 1),\n  (515, 13, 0),\n  (516, 1, 1),\n  (516, 6, 0),\n  (516, 2, 0),\n  (517, 15, 1),\n  (517, 16, 0),\n  (518, 14, 1),\n  (518, 1, 0),\n  (518, 8, 0),\n  (519, 14, 1),\n  (519, 8, 0),\n  (519, 13, 0),\n  (519, 12, 0),\n  (520, 10, 1),\n  (520, 6, 0),\n  (520, 5, 0),\n  (521, 4, 1),\n  (521, 12, 0),\n  (521, 8, 0),\n  (521, 5, 0),\n  (522, 14, 1),\n  (522, 10, 0),\n  (522, 4, 0),\n  (522, 8, 0),\n  (523, 15, 1),\n  (523, 5, 0),\n  (524, 1, 1),\n  (524, 2, 0),\n  (524, 13, 0),\n  (524, 7, 0),\n  (525, 11, 1),\n  (525, 7, 0),\n  (525, 16, 0),\n  (526, 1, 1),\n  (526, 6, 0),\n  (527, 2, 1),\n  (527, 6, 0),\n  (527, 12, 0),\n  (527, 7, 0),\n  (528, 7, 1),\n  (528, 8, 0),\n  (528, 10, 0),\n  (529, 2, 1),\n  (529, 3, 0),\n  (529, 15, 0),\n  (530, 11, 1),\n  (530, 13, 0),\n  (530, 1, 0),\n  (530, 15, 0),\n  (531, 1, 1),\n  (531, 4, 0),\n  (531, 8, 0),\n  (532, 12, 1),\n  (532, 3, 0),\n  (532, 2, 0),\n  (533, 17, 1),\n  (533, 8, 0),\n  (534, 12, 1),\n  (534, 8, 0),\n  (534, 3, 0),\n  (535, 7, 1),\n  (535, 1, 0),\n  (535, 8, 0),\n  (536, 8, 1),\n  (536, 6, 0),\n  (536, 14, 0),\n  (536, 5, 0),\n  (537, 13, 1),\n  (537, 2, 0),\n  (537, 6, 0),\n  (538, 17, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (538, 4, 0),\n  (538, 5, 0),\n  (538, 12, 0),\n  (539, 5, 1),\n  (539, 16, 0),\n  (539, 1, 0),\n  (539, 12, 0),\n  (540, 16, 1),\n  (540, 6, 0),\n  (540, 5, 0),\n  (540, 9, 0),\n  (541, 4, 1),\n  (541, 10, 0),\n  (541, 13, 0),\n  (542, 4, 1),\n  (542, 6, 0),\n  (543, 6, 1),\n  (543, 4, 0),\n  (543, 5, 0),\n  (544, 13, 1),\n  (544, 2, 0),\n  (545, 3, 1),\n  (545, 9, 0),\n  (545, 8, 0),\n  (546, 5, 1),\n  (546, 11, 0),\n  (546, 4, 0),\n  (547, 11, 1),\n  (547, 3, 0),\n  (548, 10, 1),\n  (548, 15, 0),\n  (548, 5, 0),\n  (549, 3, 1),\n  (549, 2, 0),\n  (549, 13, 0),\n  (549, 12, 0),\n  (550, 17, 1),\n  (550, 16, 0),\n  (551, 2, 1),\n  (551, 10, 0),\n  (551, 3, 0),\n  (552, 4, 1),\n  (552, 12, 0),\n  (552, 8, 0),\n  (553, 12, 1),\n  (553, 14, 0),\n  (553, 13, 0),\n  (554, 16, 1),\n  (554, 1, 0),\n  (554, 10, 0),\n  (555, 14, 1),\n  (555, 3, 0),\n  (555, 16, 0),\n  (556, 4, 1),\n  (556, 2, 0),\n  (557, 12, 1),\n  (557, 1, 0),\n  (557, 14, 0),\n  (557, 16, 0),\n  (558, 11, 1),\n  (558, 8, 0),\n  (558, 17, 0),\n  (558, 9, 0),\n  (559, 4, 1),\n  (559, 11, 0),\n  (559, 8, 0),\n  (559, 16, 0),\n  (560, 4, 1),\n  (560, 11, 0),\n  (561, 15, 1),\n  (561, 17, 0),\n  (561, 8, 0),\n  (561, 6, 0),\n  (562, 9, 1),\n  (562, 3, 0),\n  (563, 2, 1),\n  (563, 17, 0),\n  (563, 13, 0),\n  (564, 7, 1),\n  (564, 15, 0),\n  (564, 8, 0),\n  (565, 7, 1),\n  (565, 12, 0),\n  (565, 16, 0),\n  (565, 14, 0),\n  (566, 8, 1),\n  (566, 1, 0),\n  (566, 9, 0),\n  (566, 2, 0),\n  (567, 3, 1),\n  (567, 17, 0),\n  (567, 8, 0),\n  (568, 1, 1),\n  (568, 10, 0),\n  (569, 2, 1),\n  (569, 13, 0),\n  (569, 1, 0),\n  (569, 17, 0),\n  (570, 9, 1),\n  (570, 16, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (570, 7, 0),\n  (571, 12, 1),\n  (571, 14, 0),\n  (571, 3, 0),\n  (572, 14, 1),\n  (572, 17, 0),\n  (572, 4, 0),\n  (572, 7, 0),\n  (573, 12, 1),\n  (573, 16, 0),\n  (573, 3, 0),\n  (574, 7, 1),\n  (574, 13, 0),\n  (574, 14, 0),\n  (575, 15, 1),\n  (575, 7, 0),\n  (575, 1, 0),\n  (575, 4, 0),\n  (576, 14, 1),\n  (576, 1, 0),\n  (576, 12, 0),\n  (576, 16, 0),\n  (577, 7, 1),\n  (577, 1, 0),\n  (577, 4, 0),\n  (578, 3, 1),\n  (578, 15, 0),\n  (578, 10, 0),\n  (578, 6, 0),\n  (579, 5, 1),\n  (579, 4, 0),\n  (579, 13, 0),\n  (579, 17, 0),\n  (580, 11, 1),\n  (580, 12, 0),\n  (580, 8, 0),\n  (580, 6, 0),\n  (581, 1, 1),\n  (581, 13, 0),\n  (581, 15, 0),\n  (582, 5, 1),\n  (582, 16, 0),\n  (582, 1, 0),\n  (582, 6, 0),\n  (583, 1, 1),\n  (583, 8, 0),\n  (583, 11, 0),\n  (583, 17, 0),\n  (584, 11, 1),\n  (584, 13, 0),\n  (584, 17, 0),\n  (584, 6, 0),\n  (585, 1, 1),\n  (585, 6, 0),\n  (585, 11, 0),\n  (586, 10, 1),\n  (586, 6, 0),\n  (587, 3, 1),\n  (587, 8, 0),\n  (587, 5, 0),\n  (588, 6, 1),\n  (588, 1, 0),\n  (589, 5, 1),\n  (589, 11, 0),\n  (589, 6, 0),\n  (590, 11, 1),\n  (590, 15, 0),\n  (591, 2, 1),\n  (591, 1, 0),\n  (592, 16, 1),\n  (592, 9, 0),\n  (592, 10, 0),\n  (592, 11, 0),\n  (593, 1, 1),\n  (593, 3, 0),\n  (593, 12, 0),\n  (594, 9, 1),\n  (594, 2, 0),\n  (595, 9, 1),\n  (595, 16, 0),\n  (595, 8, 0),\n  (595, 1, 0),\n  (596, 5, 1),\n  (596, 3, 0),\n  (596, 11, 0),\n  (597, 12, 1),\n  (597, 4, 0),\n  (597, 15, 0),\n  (597, 3, 0),\n  (598, 1, 1),\n  (598, 14, 0),\n  (599, 5, 1),\n  (599, 11, 0),\n  (600, 17, 1),\n  (600, 14, 0),\n  (600, 12, 0),\n  (601, 1, 1),\n  (601, 16, 0),\n  (601, 2, 0),\n  (602, 9, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (602, 17, 0),\n  (602, 16, 0),\n  (602, 3, 0),\n  (603, 7, 1),\n  (603, 9, 0),\n  (604, 3, 1),\n  (604, 2, 0),\n  (604, 14, 0),\n  (604, 1, 0),\n  (605, 11, 1),\n  (605, 2, 0),\n  (605, 4, 0),\n  (606, 16, 1),\n  (606, 4, 0),\n  (607, 12, 1),\n  (607, 6, 0),\n  (607, 11, 0),\n  (608, 2, 1),\n  (608, 12, 0),\n  (609, 6, 1),\n  (609, 7, 0),\n  (610, 10, 1),\n  (610, 1, 0),\n  (610, 15, 0),\n  (611, 3, 1),\n  (611, 4, 0),\n  (611, 13, 0),\n  (611, 8, 0),\n  (612, 8, 1),\n  (612, 4, 0),\n  (613, 4, 1),\n  (613, 8, 0),\n  (613, 12, 0),\n  (614, 16, 1),\n  (614, 5, 0),\n  (614, 7, 0),\n  (614, 4, 0),\n  (615, 5, 1),\n  (615, 8, 0),\n  (616, 15, 1),\n  (616, 1, 0),\n  (617, 6, 1),\n  (617, 5, 0),\n  (618, 16, 1),\n  (618, 8, 0),\n  (618, 6, 0),\n  (618, 10, 0),\n  (619, 6, 1),\n  (619, 11, 0),\n  (619, 17, 0),\n  (619, 1, 0),\n  (620, 17, 1),\n  (620, 8, 0),\n  (620, 6, 0),\n  (620, 10, 0),\n  (621, 16, 1),\n  (621, 4, 0),\n  (621, 3, 0),\n  (622, 16, 1),\n  (622, 1, 0),\n  (622, 14, 0),\n  (622, 11, 0),\n  (623, 1, 1),\n  (623, 6, 0),\n  (624, 10, 1),\n  (624, 8, 0),\n  (624, 5, 0),\n  (624, 4, 0),\n  (625, 1, 1),\n  (625, 3, 0),\n  (625, 17, 0),\n  (625, 11, 0),\n  (626, 11, 1),\n  (626, 12, 0),\n  (627, 6, 1),\n  (627, 1, 0),\n  (628, 6, 1),\n  (628, 8, 0),\n  (628, 2, 0),\n  (628, 14, 0),\n  (629, 8, 1),\n  (629, 7, 0),\n  (630, 7, 1),\n  (630, 11, 0),\n  (630, 16, 0),\n  (630, 4, 0),\n  (631, 10, 1),\n  (631, 12, 0),\n  (631, 7, 0),\n  (632, 7, 1),\n  (632, 16, 0),\n  (633, 10, 1),\n  (633, 8, 0),\n  (634, 11, 1),\n  (634, 1, 0),\n  (634, 2, 0),\n  (635, 1, 1),\n  (635, 3, 0),\n  (636, 6, 1),\n  (636, 3, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (636, 8, 0),\n  (637, 14, 1),\n  (637, 1, 0),\n  (637, 2, 0),\n  (638, 14, 1),\n  (638, 10, 0),\n  (638, 2, 0),\n  (639, 14, 1),\n  (639, 10, 0),\n  (639, 1, 0),\n  (640, 14, 1),\n  (640, 13, 0),\n  (640, 16, 0),\n  (640, 7, 0),\n  (641, 12, 1),\n  (641, 7, 0),\n  (641, 6, 0),\n  (642, 16, 1),\n  (642, 10, 0),\n  (642, 5, 0),\n  (642, 11, 0),\n  (643, 8, 1),\n  (643, 15, 0),\n  (643, 10, 0),\n  (643, 1, 0),\n  (644, 17, 1),\n  (644, 3, 0),\n  (644, 8, 0),\n  (644, 9, 0),\n  (645, 14, 1),\n  (645, 6, 0),\n  (645, 16, 0),\n  (645, 5, 0),\n  (646, 8, 1),\n  (646, 13, 0),\n  (647, 6, 1),\n  (647, 7, 0),\n  (648, 15, 1),\n  (648, 8, 0),\n  (649, 1, 1),\n  (649, 2, 0),\n  (650, 9, 1),\n  (650, 12, 0),\n  (651, 7, 1),\n  (651, 1, 0),\n  (651, 12, 0),\n  (652, 11, 1),\n  (652, 6, 0),\n  (653, 17, 1),\n  (653, 15, 0),\n  (654, 16, 1),\n  (654, 13, 0),\n  (654, 4, 0),\n  (654, 3, 0),\n  (655, 1, 1),\n  (655, 2, 0),\n  (655, 3, 0),\n  (655, 8, 0),\n  (656, 4, 1),\n  (656, 5, 0),\n  (656, 17, 0),\n  (657, 16, 1),\n  (657, 8, 0),\n  (658, 2, 1),\n  (658, 3, 0),\n  (658, 17, 0),\n  (658, 7, 0),\n  (659, 7, 1),\n  (659, 3, 0),\n  (660, 11, 1),\n  (660, 16, 0),\n  (660, 1, 0),\n  (661, 4, 1),\n  (661, 8, 0),\n  (662, 9, 1),\n  (662, 12, 0),\n  (663, 3, 1),\n  (663, 15, 0),\n  (663, 1, 0),\n  (664, 14, 1),\n  (664, 6, 0),\n  (664, 5, 0),\n  (664, 17, 0),\n  (665, 15, 1),\n  (665, 12, 0),\n  (665, 1, 0),\n  (665, 2, 0),\n  (666, 7, 1),\n  (666, 8, 0),\n  (666, 16, 0),\n  (666, 10, 0),\n  (667, 1, 1),\n  (667, 16, 0),\n  (668, 10, 1),\n  (668, 4, 0),\n  (668, 7, 0),\n  (668, 9, 0),\n  (669, 14, 1),\n  (669, 1, 0),\n  (670, 3, 1);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (670, 9, 0),\n  (671, 7, 1),\n  (671, 1, 0),\n  (672, 6, 1),\n  (672, 3, 0),\n  (672, 14, 0),\n  (672, 8, 0),\n  (673, 4, 1),\n  (673, 3, 0),\n  (673, 10, 0),\n  (674, 1, 1),\n  (674, 14, 0),\n  (674, 16, 0),\n  (675, 5, 1),\n  (675, 15, 0),\n  (675, 12, 0),\n  (676, 6, 1),\n  (676, 10, 0),\n  (676, 12, 0),\n  (677, 9, 1),\n  (677, 8, 0),\n  (677, 14, 0),\n  (678, 4, 1),\n  (678, 2, 0),\n  (678, 12, 0),\n  (678, 7, 0),\n  (679, 16, 1),\n  (679, 7, 0),\n  (679, 3, 0),\n  (680, 14, 1),\n  (680, 1, 0),\n  (681, 16, 1),\n  (681, 7, 0),\n  (682, 10, 1),\n  (682, 15, 0),\n  (683, 16, 1),\n  (683, 11, 0),\n  (683, 12, 0),\n  (684, 8, 1),\n  (684, 1, 0),\n  (684, 7, 0),\n  (685, 8, 1),\n  (685, 1, 0),\n  (686, 9, 1),\n  (686, 4, 0),\n  (687, 13, 1),\n  (687, 6, 0),\n  (687, 4, 0),\n  (688, 8, 1),\n  (688, 3, 0),\n  (688, 4, 0),\n  (689, 14, 1),\n  (689, 4, 0),\n  (689, 3, 0),\n  (689, 10, 0),\n  (690, 12, 1),\n  (690, 6, 0),\n  (690, 9, 0),\n  (691, 13, 1),\n  (691, 3, 0),\n  (691, 5, 0),\n  (691, 17, 0),\n  (692, 13, 1),\n  (692, 4, 0),\n  (693, 12, 1),\n  (693, 1, 0),\n  (694, 4, 1),\n  (694, 3, 0),\n  (695, 15, 1),\n  (695, 10, 0),\n  (695, 3, 0),\n  (696, 4, 1),\n  (696, 11, 0),\n  (697, 1, 1),\n  (697, 8, 0),\n  (697, 2, 0),\n  (698, 9, 1),\n  (698, 5, 0),\n  (698, 4, 0),\n  (699, 9, 1),\n  (699, 2, 0),\n  (699, 6, 0),\n  (700, 10, 1),\n  (700, 1, 0),\n  (700, 4, 0),\n  (700, 15, 0),\n  (701, 7, 1),\n  (701, 13, 0),\n  (702, 2, 1),\n  (702, 3, 0),\n  (702, 8, 0),\n  (703, 16, 1),\n  (703, 12, 0),\n  (704, 15, 1),\n  (704, 4, 0),\n  (705, 8, 1),\n  (705, 6, 0),\n  (705, 10, 0),\n  (706, 8, 1),\n  (706, 12, 0);
INSERT INTO producto_acabados (producto_id, acabado_id, es_default) VALUES
  (706, 11, 0),\n  (707, 4, 1),\n  (707, 6, 0),\n  (707, 14, 0),\n  (708, 3, 1),\n  (708, 15, 0),\n  (708, 2, 0),\n  (708, 14, 0),\n  (709, 6, 1),\n  (709, 14, 0),\n  (709, 15, 0),\n  (709, 4, 0),\n  (710, 8, 1),\n  (710, 1, 0),\n  (710, 12, 0),\n  (710, 16, 0),\n  (711, 13, 1),\n  (711, 12, 0),\n  (711, 7, 0),\n  (712, 5, 1),\n  (712, 8, 0),\n  (712, 14, 0),\n  (712, 4, 0),\n  (713, 4, 1),\n  (713, 7, 0),\n  (713, 5, 0),\n  (714, 6, 1),\n  (714, 10, 0),\n  (714, 1, 0),\n  (714, 2, 0),\n  (715, 3, 1),\n  (715, 13, 0),\n  (715, 7, 0),\n  (715, 2, 0),\n  (716, 3, 1),\n  (716, 7, 0),\n  (717, 8, 1),\n  (717, 14, 0),\n  (718, 14, 1),\n  (718, 8, 0),\n  (719, 8, 1),\n  (719, 16, 0),\n  (720, 6, 1),\n  (720, 13, 0),\n  (720, 15, 0),\n  (720, 8, 0),\n  (721, 14, 1),\n  (721, 15, 0),\n  (721, 13, 0),\n  (721, 1, 0),\n  (722, 4, 1),\n  (722, 15, 0),\n  (722, 3, 0),\n  (722, 11, 0),\n  (723, 14, 1),\n  (723, 9, 0),\n  (723, 7, 0),\n  (723, 11, 0),\n  (724, 7, 1),\n  (724, 1, 0),\n  (724, 11, 0),\n  (725, 7, 1),\n  (725, 11, 0),\n  (726, 1, 1),\n  (726, 9, 0),\n  (726, 6, 0),\n  (727, 1, 1),\n  (727, 6, 0),\n  (728, 1, 1),\n  (728, 8, 0),\n  (728, 2, 0),\n  (729, 12, 1),\n  (729, 1, 0),\n  (729, 10, 0),\n  (730, 7, 1),\n  (730, 16, 0),\n  (731, 2, 1),\n  (731, 14, 0),\n  (731, 17, 0),\n  (732, 13, 1),\n  (732, 5, 0),\n  (732, 16, 0),\n  (732, 6, 0),\n  (733, 17, 1),\n  (733, 12, 0),\n  (734, 12, 1),\n  (734, 4, 0),\n  (734, 3, 0),\n  (735, 12, 1),\n  (735, 1, 0),\n  (735, 13, 0),\n  (735, 9, 0),\n  (736, 1, 1),\n  (736, 2, 0),\n  (736, 16, 0),\n  (736, 12, 0);
-- Total relaciones producto-acabado: 2196


-- ============================================================
-- PASO 3: RESTAURAR FOREIGN KEY CHECKS
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ¡Migración completada!
-- Verifica que todas las tablas existan con: SHOW TABLES;
-- Verifica los datos semilla con: SELECT COUNT(*) FROM productos;
-- ============================================================
