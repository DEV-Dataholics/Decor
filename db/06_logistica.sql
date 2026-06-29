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

USE decor_muebleria;

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
