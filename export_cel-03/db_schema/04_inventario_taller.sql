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

USE decor_muebleria;

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
