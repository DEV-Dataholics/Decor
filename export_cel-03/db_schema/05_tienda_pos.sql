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

USE decor_muebleria;

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
