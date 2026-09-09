-- ============================================================
-- db/09_logs_sistema.sql
-- Tabla central de Auditoría y Logs del Sistema
-- Restringido para consulta exclusiva del perfil Administrador.
-- ============================================================

CREATE TABLE IF NOT EXISTS logs_sistema (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nivel          ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'INFO',
  modulo         VARCHAR(50) NOT NULL,
  accion         VARCHAR(100) NOT NULL,
  descripcion    TEXT NULL,
  detalles       JSON NULL,
  usuario_id     INT UNSIGNED NULL,
  usuario_nombre VARCHAR(120) NULL,
  usuario_email  VARCHAR(180) NULL,
  usuario_rol    VARCHAR(50) NULL,
  ip_origen      VARCHAR(45) NULL,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_creado_en (creado_en DESC),
  INDEX idx_nivel (nivel),
  INDEX idx_modulo (modulo),
  INDEX idx_usuario (usuario_id),
  INDEX idx_accion (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
