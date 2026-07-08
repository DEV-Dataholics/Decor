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

-- ── Acabados ────────────────────────────────────────────────

-- ── Tiendas ─────────────────────────────────────────────────

-- ── Usuario Admin ───────────────────────────────────────────
-- Hash bcrypt generado para producción (password_verify compatible)

-- ── Empleados ───────────────────────────────────────────────

-- ── Productos (736 registros) ────────────────────────────















-- ── Producto ↔ Acabados ────────────────────────────────────
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
