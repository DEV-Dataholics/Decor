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

USE decor_muebleria;

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
