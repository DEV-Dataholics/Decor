# ✅ Decor Mueblería — Checklist de Desarrollo MVP

> Generado por: Planning Architect Agent  
> Basado en: Entrevistas con Norma (Tienda) y Víctor Manuel (Taller)  
> Revisión: 2026-04-06 — v2 (Incorpora POS, inventario externo y revisión de esquema completo)  
> Estado: 🔴 Pendiente

---

## 🗃️ BASE DE DATOS (Supabase / PostgreSQL)

> **Nota de diseño:** El inventario de la tienda puede tener DOS orígenes:
> 1. **Taller propio** → llega vía embarque desde producción
> 2. **Compra externa / oportunidad** → artesanías, piezas únicas, muebles de proveedores externos
>
> El modelo de datos debe soportar ambos flujos sin ambigüedad.

---

### 📦 Catálogo y Productos

- [ ] Crear tabla `productos` con campos:
  - `id`, `codigo_sku`, `nombre`, `descripcion`
  - `categoria_id` → FK a `categorias_mueble`
  - `origen` ENUM: `taller` | `compra_externa` | `artesania` | `pieza_unica`
  - `es_pieza_unica` BOOL — si es TRUE, el stock máximo es 1 y no puede reordenarse igual
  - `tipo_orden_taller` ENUM: `linea` | `linea_especial` | `especial` | `n/a` (para externos)
  - `medidas_base` JSON — `{alto, ancho, fondo}` en pulgadas
  - `habilitaciones` JSON — lista de especificaciones estándar (cajones, molduras, etc.)
  - `foto_url` ARRAY — soporte para múltiples fotos
  - `precio_venta_base` DECIMAL — precio de lista sugerido
  - `precio_costo_base` DECIMAL — costo estimado de producción o compra
  - `proveedor_externo_id` FK nullable → `proveedores` (solo para origen externo)
  - `activo` BOOL

- [ ] Crear tabla `categorias_mueble` con valores semilla:
  Sillas, Mesas, Bancos, Camas, Cómodas, Escritorios, Libreros, Gabinetes, Cabeceras, Barras, Artesanías, Decoración, Otros

- [ ] Crear tabla `acabados` con campos:
  - `id`, `nombre`, `tipo` ENUM: `mancha` | `laca` | `cera` | `pintura` | `distres` | `cardeado` | `natural` | `fashion`
  - `codigo_color` — código de referencia para pintura/mancha (ej. "Alder #2", "Santa Fe")
  - `descripcion`

- [ ] Crear tabla `producto_acabados` — relación N:N entre `productos` y `acabados` disponibles
  - `producto_id`, `acabado_id`, `es_default` BOOL

---

### 👥 Clientes

- [ ] Crear tabla `clientes` con campos:
  - `id`, `nombre`, `razon_social`, `rfc`
  - `tipo` ENUM: `mayorista` | `tienda_propia` | `disenador` | `publico_general`
  - `email`, `telefono`, `ciudad`, `pais`
  - `tipo_pago_preferido` ENUM: `efectivo` | `transferencia` | `cheque` | `credito`
  - `credito_activo` BOOL
  - `limite_credito` DECIMAL
  - `saldo_pendiente` DECIMAL — calculado, para control de crédito
  - `notas`

- [ ] Crear tabla `listas_precios_clientes` con campos:
  - `id`, `cliente_id` FK → `clientes`
  - `producto_id` FK → `productos`
  - `precio_acordado` DECIMAL
  - `ultima_actualizacion` TIMESTAMP

---

### 🧾 Cotizaciones y Órdenes de Producción

- [ ] Crear tabla `cotizaciones` con campos:
  - `id`, `cliente_id`, `tienda_id`, `fecha`, `vigencia_hasta`
  - `estatus` ENUM: `borrador` | `enviada` | `aprobada` | `rechazada` | `convertida`
  - `notas`, `total_estimado`
  - *(Al aprobar una cotización, se convierte en `orden`)*

- [ ] Crear tabla `cotizacion_items` con campos:
  - `id`, `cotizacion_id`, `producto_id`, `cantidad`
  - `acabado_id`, `especificaciones_custom` JSON
  - `precio_unitario_estimado`

- [ ] Crear tabla `ordenes` (Órdenes de producción al taller) con campos:
  - `id`, `cotizacion_id` FK nullable, `cliente_id`, `tienda_origen_id` FK → `tiendas`
  - `tipo_orden` ENUM: `linea` | `linea_especial` | `especial`
  - `fecha_creacion`, `fecha_entrega_estimada`, `fecha_entrega_real`
  - `estatus` ENUM: `borrador` | `confirmada` | `en_produccion` | `lista` | `embarcada` | `entregada` | `cancelada`
  - `idioma_orden` ENUM: `es` | `en` — el sistema SIEMPRE genera work orders en `es`
  - `notas`, `descuento_global` DECIMAL, `total` DECIMAL

- [ ] Crear tabla `orden_items` con campos:
  - `id`, `orden_id`, `producto_id`, `cantidad`
  - `acabado_id`, `especificaciones_custom` JSON — `{alto, ancho, fondo, ajustes_especiales}`
  - `precio_unitario`, `descuento_item` DECIMAL, `subtotal` DECIMAL
  - `estatus_item` ENUM: `pendiente` | `en_produccion` | `terminado` | `embarcado`

---

### 🔨 Producción y Nómina

- [ ] Crear tabla `empleados` con campos:
  - `id`, `nombre`, `rol` ENUM: `carpintero` | `pintor` | `tapicero` | `tallador` | `embalaje` | `encargado`
  - `especialidades` ARRAY — `['sillas', 'camas', 'talla', 'acabados', 'mesas']`
  - `tarifa_base` DECIMAL — tarifa por pieza (base para cálculo de nómina)
  - `activo` BOOL, `fecha_ingreso`

- [ ] Crear tabla `work_orders` con campos:
  - `id`, `orden_item_id` FK → `orden_items`
  - `empleado_id` FK → `empleados`, `asignado_por` FK → `empleados`
  - `fecha_asignacion`, `fecha_inicio_real`, `fecha_terminado`
  - `semana_nomina_id` FK → `semanas_nomina`
  - `estatus` ENUM: `pendiente` | `en_progreso` | `en_revision` | `terminado` | `pagado`
  - `monto_pago` DECIMAL — calculado al cerrar semana
  - `notas_calidad`, `rechazos` INT DEFAULT 0 — cuenta cuántas veces se regresó al carpintero

- [ ] Crear tabla `semanas_nomina` con campos:
  - `id`, `fecha_inicio`, `fecha_corte` TIMESTAMP, `estatus` ENUM: `abierta` | `cerrada`
  - `total_pagado` DECIMAL — calculado al cerrar

- [ ] Crear tabla `lista_precios_mano_obra` con campos:
  - `id`, `rol`, `categoria_id` FK → `categorias_mueble`
  - `precio_por_pieza` DECIMAL, `vigente_desde`

- [ ] **Regla de negocio:** Implementar lógica de cierre de semana: work_orders terminadas DESPUÉS del `fecha_corte` → se asignan a la siguiente `semana_nomina`

---

### 🏭 Inventario de Materiales del Taller

- [ ] Crear tabla `materiales` con campos:
  - `id`, `nombre`, `tipo` ENUM: `madera` | `quimico` | `insumo` | `herramienta`
  - `subtipo` — ej. "pino", "alder", "laca", "clavo decorativo"
  - `unidad_medida` — "paca", "cubeta", "caja", "litro", "pieza"
  - `proveedor_id` FK → `proveedores`
  - `stock_actual` DECIMAL, `stock_minimo` DECIMAL, `stock_maximo` DECIMAL
  - `costo_unitario` DECIMAL
  - `codigo_referencia` — código del proveedor o interno
  - `notas`

- [ ] Crear tabla `proveedores` con campos:
  - `id`, `nombre`, `razon_social`, `rfc`
  - `tipo` ENUM: `materia_prima` | `quimicos` | `herramienta` | `muebles_externos` | `artesanias` | `servicios`
  - `ciudad`, `pais`, `telefono`, `email`, `contacto_nombre`
  - `lead_time_dias` INT — tiempo promedio de entrega
  - `metodo_pago_preferido`, `notas`

- [ ] Crear tabla `movimientos_inventario_taller` con campos:
  - `id`, `material_id` FK, `tipo_movimiento` ENUM: `entrada` | `salida` | `ajuste`
  - `cantidad`, `costo_unitario_mov` DECIMAL
  - `referencia_tipo` ENUM: `compra` | `consumo_produccion` | `ajuste_manual`
  - `referencia_id` — ID de la orden/compra relacionada
  - `fecha`, `usuario_id`, `notas`

- [ ] Crear tabla `alertas_stock_material` con campos:
  - `id`, `material_id` FK, `tipo_alerta` ENUM: `minimo` | `agotado`
  - `fecha_generacion`, `atendida` BOOL, `fecha_atencion`

---

### 🛒 Inventario de Tienda (Multi-origen)

> **Este es el inventario visible en el Punto de Venta (POS).**
> Agrupa productos de taller propio + compras externas + artesanías en una sola vista unificada.

- [ ] Crear tabla `tiendas` con campos:
  - `id`, `nombre`, `ciudad`, `direccion`, `telefono`
  - `encargado_id` FK → `empleados_tienda`
  - `activa` BOOL

- [ ] Crear tabla `inventario_tienda` con campos:
  - `id`, `tienda_id` FK, `producto_id` FK
  - `cantidad_disponible` DECIMAL
  - `cantidad_reservada` DECIMAL — reservada por ventas pendientes de cobro
  - `origen_stock` ENUM: `embarque_taller` | `compra_externa` | `artesania` | `pieza_unica`
  - `costo_unitario` DECIMAL — costo real de ingreso al inventario de tienda
  - `precio_venta` DECIMAL — puede diferir del `precio_venta_base` del producto
  - `lote_referencia_id` — apunta a `embarques.id` o `compras_externas.id` según origen
  - `ultima_actualizacion` TIMESTAMP

- [ ] Crear tabla `movimientos_inventario_tienda` con campos:
  - `id`, `inventario_tienda_id` FK, `tipo` ENUM: `entrada` | `venta` | `devolucion` | `ajuste` | `traspaso`
  - `cantidad`, `referencia_tipo` — `embarque` | `compra_externa` | `venta` | `traspaso`
  - `referencia_id`, `fecha`, `usuario_id`, `notas`

---

### 🛍️ Compras Externas (Inventario de Oportunidad)

> Para muebles comprados de remate, artesanías de proveedores externos y piezas únicas que no se fabrican en taller.

- [ ] Crear tabla `compras_externas` con campos:
  - `id`, `proveedor_id` FK → `proveedores`, `tienda_destino_id` FK → `tiendas`
  - `fecha_compra`, `folio_factura`, `total_compra` DECIMAL
  - `estatus` ENUM: `registrada` | `recibida` | `en_inventario`
  - `notas` — contexto de la oportunidad (ej. "feria artesanal", "lote de liquidación")
  - `usuario_id`

- [ ] Crear tabla `compra_externa_items` con campos:
  - `id`, `compra_externa_id` FK
  - `producto_id` FK nullable — si ya existe en catálogo
  - `descripcion_libre` TEXT — para piezas únicas sin SKU previo
  - `cantidad` DECIMAL, `costo_unitario` DECIMAL
  - `precio_venta_sugerido` DECIMAL
  - `es_pieza_unica` BOOL
  - `foto_url` ARRAY — fotos tomadas en el momento de la compra

---

### 🏦 Punto de Venta — POS (Ventas en Tienda)

- [ ] Crear tabla `ventas_tienda` con campos:
  - `id`, `tienda_id` FK, `cliente_id` FK nullable — puede ser público general sin registro
  - `cliente_nombre_libre` TEXT — para ventas sin cliente registrado
  - `fecha_venta` TIMESTAMP
  - `estatus` ENUM: `borrador` | `confirmada` | `cancelada`
  - `subtotal`, `descuento_total`, `impuestos` DECIMAL, `total` DECIMAL
  - `notas`, `usuario_cajero_id` FK
  - `caja_id` FK → `cajas_tienda`

- [ ] Crear tabla `venta_items` con campos:
  - `id`, `venta_id` FK, `inventario_tienda_id` FK
  - `producto_id` FK, `cantidad`, `precio_unitario`, `descuento_item` DECIMAL, `subtotal` DECIMAL

- [ ] Crear tabla `pagos_venta` con campos:
  - `id`, `venta_id` FK
  - `metodo` ENUM: `efectivo` | `transferencia` | `tarjeta` | `cheque` | `credito_cliente`
  - `monto` DECIMAL, `referencia` TEXT — folio de transferencia o número de cheque
  - `fecha`
  - *(Soporte para pago mixto: múltiples registros por venta)*

- [ ] Crear tabla `cajas_tienda` con campos:
  - `id`, `tienda_id` FK, `nombre` — "Caja 1"
  - `fondo_inicial` DECIMAL
  - `fecha_apertura`, `fecha_cierre` TIMESTAMP
  - `total_efectivo_esperado`, `total_efectivo_contado` DECIMAL
  - `diferencia` DECIMAL — calculado al cierre
  - `estatus` ENUM: `abierta` | `cerrada`
  - `usuario_apertura_id`, `usuario_cierre_id`

- [ ] **Regla de negocio:** Al confirmar una venta, descontar automáticamente de `inventario_tienda.cantidad_disponible`
- [ ] **Regla de negocio:** Si `es_pieza_unica = TRUE`, marcar el producto como `activo = FALSE` al venderse

---

### 📦 Embarques y Logística

- [ ] Crear tabla `embarques` con campos:
  - `id`, `orden_id` FK nullable — puede haber embarques de reposición sin orden formal
  - `tienda_destino_id` FK → `tiendas`
  - `fecha_embarque`, `placas_trailer`, `transportista`
  - `carta_porte_url`, `folio_carta_porte`
  - `estatus` ENUM: `preparando` | `embarcado` | `en_transito` | `entregado`
  - `usuario_embarque_id`

- [ ] Crear tabla `embarque_items` con campos:
  - `id`, `embarque_id` FK, `orden_item_id` FK nullable
  - `producto_id` FK, `cantidad_embarcada`
  - `etiqueta_generada` BOOL, `embarcado` BOOL
  - `recibido_en_tienda` BOOL, `cantidad_recibida` DECIMAL
  - `diferencia` DECIMAL — detecta faltantes al recibir

- [ ] Implementar lógica: Al confirmar recepción en tienda, crear entradas en `inventario_tienda` y `movimientos_inventario_tienda`

---

### ↩️ Devoluciones

- [ ] Crear tabla `devoluciones` con campos:
  - `id`
  - `origen` ENUM: `venta_tienda` | `orden_produccion`
  - `referencia_id` — `venta_id` o `orden_item_id` según origen
  - `producto_id` FK, `cantidad`
  - `motivo` TEXT
  - `estatus` ENUM: `recibida` | `en_reparacion` | `reintegrada_inventario` | `descartada_merma`
  - `tienda_id` FK, `fecha`
  - `usuario_id`, `notas`

---

## 🔙 BACKEND (Supabase Edge Functions / RLS)

### Autenticación y Roles

- [ ] Configurar roles en Supabase Auth:
  - `admin` — Sergio/Norma: acceso total
  - `gerente_tienda` — Norma: pedidos, POS, inventario tienda, reportes
  - `encargado_taller` — Víctor: producción, materiales, embarques
  - `cajero` — operador POS tienda: solo ventas y consulta de inventario tienda
  - `carpintero` — solo sus work_orders asignadas
  - `bodega` — entradas/salidas de materiales del taller

- [ ] Implementar RLS en TODAS las tablas (filas visibles según rol y `tienda_id`)
- [ ] RLS `cajero`: solo puede ver `inventario_tienda` y crear `ventas_tienda` de su tienda
- [ ] RLS `carpintero`: solo puede ver y actualizar sus propias `work_orders`

### Lógica de Negocio (Edge Functions)

- [ ] `generar-work-orders` — al confirmar una orden, genera work_orders por item según especialidades
- [ ] `cerrar-semana-nomina` — calcula total de work_orders del período y genera resumen por empleado
- [ ] `validar-medidas-orden` — valida consistencia de medidas (suma partes = total declarado)
- [ ] `alerta-stock-material` — escaneo periódico; crea alertas cuando `stock_actual <= stock_minimo`
- [ ] `generar-carta-porte` — compila relación de embarque por cliente, con muebles e identificación
- [ ] `confirmar-recepcion-embarque` — crea movimientos de entrada en `inventario_tienda`
- [ ] `registrar-venta-pos` — valida stock, descuenta `inventario_tienda`, crea `movimientos_inventario_tienda`
- [ ] `ingresar-compra-externa` — crea o reutiliza `productos`, genera entradas en `inventario_tienda`
- [ ] `reintegrar-devolucion` — según estatus, actualiza `inventario_tienda` o registra merma
- [ ] `generar-etiquetas-embarque` — genera PDF con stickers por cliente (nombre, teléfono, # orden)
- [ ] `cierre-caja` — totaliza ventas del día por caja, calcula diferencia de efectivo

### Notificaciones In-App

- [ ] Alerta de stock mínimo de material → encargado_taller y admin
- [ ] Work order terminada pendiente de revisión → encargado_taller
- [ ] Semana de nómina próxima a cerrar (día anterior) → admin y encargado_taller
- [ ] Embarque marcado como entregado → gerente_tienda
- [ ] Pieza única vendida → admin (para awareness de inventario especial)

---

## 🖥️ FRONTEND (HTML / CSS / JS Vanilla)

### Layout General

- [ ] Layout mobile-first con navegación por rol (bottom-nav en móvil, sidebar en desktop)
- [ ] Tema visual: colores tierra/madera (`#8B5E3C`, `#F5EFE6`), tipografía robusta, alto contraste
- [ ] Navegación principal por rol:
  - **Admin**: Dashboard, Pedidos, Producción, Inventario, POS, Embarques, Reportes, Config
  - **Cajero**: POS, Inventario Tienda (solo consulta)
  - **Encargado Taller**: Producción, Materiales, Embarques
  - **Carpintero**: Mis Work Orders

---

### Módulo: Catálogo de Productos

- [ ] Vista grid con foto, SKU, nombre, origen (`🔨 Taller` / `🛒 Externo` / `🎨 Artesanía` / `⭐ Pieza Única`)
- [ ] Filtro por: categoría, origen, tipo de orden, acabado disponible
- [ ] Formulario de alta/edición con subida de múltiples fotos
- [ ] Visualizador de habilitaciones y medidas base
- [ ] Badge visual para piezas únicas y artesanías

---

### Módulo: Gestión de Pedidos al Taller (Norma)

- [ ] Formulario de cotización previa → conversión a orden confirmada
- [ ] Selector de productos del catálogo con cantidad y acabados por item
- [ ] Campo de especificaciones custom (medidas, ajustes) con validación de consistencia
- [ ] Indicador visual de tipo: 🟢 Línea / 🟡 Línea Especial / 🔴 Especial
- [ ] Todas las vistas y documentos exportables en **español**
- [ ] Generación de etiquetas PDF por cliente (con nombre, teléfono, número de orden)
- [ ] Historial de órdenes con filtro por cliente, estatus y rango de fechas

---

### Módulo: Producción (Encargado — Víctor)

- [ ] Dashboard de work_orders activas con filtros por estatus, semana y empleado
- [ ] Asignación de work_order: selector de empleado filtrado por especialidad requerida
- [ ] Vista tipo Kanban: Pendiente → En Progreso → En Revisión → Terminado
- [ ] Botón "Marcar Terminado" + contador de rechazos por pieza
- [ ] Vista de cierre semanal: resumen de piezas terminadas y monto a pagar por empleado
- [ ] Alerta visual cuando una pieza termina fuera del corte de nómina

---

### Módulo: Inventario de Materiales del Taller

- [ ] Lista de materiales con stock actual / mínimo / máximo + proveedor
- [ ] Indicadores de nivel: 🟢 OK / 🟡 Por agotarse / 🔴 Alerta crítica
- [ ] Formulario de entrada de material (lote, proveedor, costo, fecha)
- [ ] Formulario de salida manual (consumo no vinculado a work order)
- [ ] Vista de alertas activas con acción "Marcar como atendida"
- [ ] Historial de movimientos filtrado por material y período

---

### Módulo: Compras Externas / Inventario de Oportunidad

- [ ] Formulario de registro de compra externa:
  - Selección de proveedor (o alta rápida de proveedor)
  - Alta de ítems: busca producto existente en catálogo o crea nuevo en el momento
  - Campo `es_pieza_unica` con badge destacado
  - Subida de foto desde móvil (cámara directa)
  - Precio de costo y precio de venta sugerido por ítem
- [ ] Listado de compras externas con historial por proveedor
- [ ] Al guardar compra, genera automáticamente entradas en `inventario_tienda`

---

### Módulo: Embarque y Logística

- [ ] Lista de órdenes listas para embarque
- [ ] Formulario de creación de embarque: selección de ítems, placas, transportista
- [ ] Checklist digital de cotejo (tick por ítem antes de cargar el trailer)
- [ ] Generación de Remisión/Invoice en PDF con layout basado en plantilla (ej. image.png), cruzando cantidades embarcadas con precios de `listas_precios_clientes`.
- [ ] Generación de relación de embarque exportable en **español** (reemplaza nota a mano)
- [ ] Vista de recepción en tienda: confirmación ítem por ítem con campo de diferencias
- [ ] Al confirmar recepción, actualiza `inventario_tienda` automáticamente

---

### 🛒 Módulo: Punto de Venta (POS — Tienda)

> Diseño optimizado para tablet o pantalla touch en mostrador. **Flujo rápido.**

- [ ] **Pantalla principal POS:**
  - Buscador de producto por nombre, SKU o código de barras (scan futuro)
  - Grid de productos del inventario activo de la tienda (con foto, nombre, precio y stock)
  - Filtro rápido por categoría (tabs horizontales)
  - Badge visual para piezas únicas: `⭐ ÚNICA` en rojo — al agregarse al carrito muestra advertencia

- [ ] **Carrito de venta:**
  - Lista de ítems seleccionados con cantidad y precio unitario
  - Edición de cantidad directamente en carrito
  - Campo de descuento por ítem y descuento global
  - Subtotal, impuestos (configurable) y total visible en tiempo real
  - Botón "Cancelar Venta" con confirmación

- [ ] **Panel de cobro:**
  - Selector de cliente registrado (búsqueda rápida) o campo "Venta General"
  - Registro de método de pago: Efectivo / Transferencia / Tarjeta / Crédito / Mixto
  - Si es efectivo: campo "monto recibido" con cálculo automático de cambio
  - Si es mixto: múltiples métodos con montos parciales
  - Botón "Confirmar Venta" — genera ticket y descuenta inventario

- [ ] **Ticket de venta:**
  - Impresión o PDF de ticket con: folio, fecha, productos, precios, método de pago, total, cambio
  - Opción de envío por WhatsApp/correo (Fase 2)

- [ ] **Apertura y cierre de caja:**
  - Pantalla de apertura con captura de fondo inicial
  - Cierre de caja: resumen de ventas del día por método de pago, conteo de efectivo, diferencia
  - Exportación del corte diario en PDF

- [ ] **Historial de ventas:**
  - Lista de ventas del día con buscador
  - Detalle de venta individual con opción de reimpresión de ticket
  - Cancelación de venta con motivo (ajusta inventario automáticamente)

---

### Módulo: Reportes y Dashboard (Admin — Norma / Sergio)

- [ ] KPI Cards: ventas hoy, órdenes activas, muebles en producción, próximos embarques, alertas de stock
- [ ] Gráfica de productos más vendidos por tienda (volumen y monto)
- [ ] Reporte de gastos por proveedor (período seleccionable)
- [ ] Análisis de tendencia estacional por categoría (ej. barras en verano)
- [ ] Reporte de nómina semanal por empleado
- [ ] Comparativo de inventario externo vs. taller propio (origen del stock vendido)
- [ ] Exportación de todos los reportes a CSV / PDF

---

### Módulo: Configuración

- [ ] Gestión de empleados (taller) y personal de tienda con roles
- [ ] Configuración de día/hora de corte de nómina (por semana)
- [ ] Configuración de stocks mínimos/máximos por material
- [ ] Alta y edición de tiendas
- [ ] Alta y edición de proveedores (taller y externos)
- [ ] Gestión de categorías de mueble y acabados
- [ ] Configuración de impuestos para POS (activar/desactivar IVA)
- [ ] Gestión de usuarios y roles

---

## 📋 DATOS SEMILLA Y MIGRACIÓN

- [ ] Desarrollar script PHP de importación para parsear los archivos CSV (`Full Furniture...csv` y `Listas de productos...csv`).
- [ ] Importar catálogo de productos (taller) desde CSV, incluyendo `precio_costo_base` y categoría.
- [ ] Importar listas de precios por cliente desde CSV, poblando `clientes` ("CASA CRISTAL", "MONTERREY", etc.) y `listas_precios_clientes`.
- [ ] Cargar fotos actuales desde carpetas de producción y tablet de Víctor
- [ ] Registrar empleados con especialidades y tarifas base
- [ ] Registrar proveedores activos: Cerlac, Proveedores de madera, Proveedor Monterrey (resane)
- [ ] Configurar stocks iniciales de materiales con Víctor
- [ ] Definir lista de precios de mano de obra por categoría de mueble
- [ ] Registrar inventario inicial de tiendas (taller + compras externas existentes)
- [ ] Capturar artesanías y piezas únicas actuales con foto tomada en tienda

---

## 🔄 FASE 2 (Post-MVP — Sprints Futuros)

- [ ] Cálculo de costo de producción por mueble (material consumido + mano de obra real)
- [ ] Análisis de margen de utilidad por SKU (costo real vs. precio de venta)
- [ ] Alerta de productos con alto volumen pero bajo margen
- [ ] Control de herramienta: registro de activos, asignación por empleado, vida útil
- [ ] Módulo de mantenimiento preventivo de maquinaria (programado por uso/tiempo)
- [ ] Integración de lector de código de barras en POS
- [ ] Envío de ticket de venta por WhatsApp (API de WhatsApp Business)
- [ ] App móvil o PWA para carpinteros (notificaciones de asignación offline-first)
- [ ] Módulo de crédito a clientes con amortizaciones y estados de cuenta
