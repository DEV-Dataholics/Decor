# Plan de Implementación: Decor Mueblería MVP

> **Estado:** ✅ Decisiones técnicas confirmadas — Listo para ejecución
> **Stack:** PHP Vanilla + MySQL (Laragon) + HTML/JS/CSS Vanilla (Multi-página)
> **Arquitectura:** Mobile-First — Repositorio local, montaje en Laragon manual por el usuario

---

## Decisiones Técnicas Confirmadas

| Decisión | Elección |
|---|---|
| **Lenguaje API Backend** | PHP Vanilla (sin frameworks) |
| **Servidor / BD** | Laragon → Apache + MySQL/MariaDB |
| **Frontend** | HTML/CSS/JS Vanilla — Múltiples archivos `.html` |
| **Entorno Local** | Repositorio en `sistema_decor/`, el usuario lo monta en `laragon/www` manualmente |
| **Autenticación** | Sistema de sesiones PHP clásico |

---

## Estructura de Carpetas Propuesta

```
sistema_decor/
├── api/                    # Endpoints PHP (API REST)
│   ├── config/
│   │   ├── db.php          # Conexión MySQL
│   │   └── auth.php        # Validación de sesión/roles
│   ├── auth/
│   │   └── login.php
│   ├── productos/
│   ├── ordenes/
│   ├── produccion/
│   ├── inventario/
│   ├── pos/
│   └── embarques/
├── assets/
│   ├── css/
│   │   └── styles.css      # Sistema de diseño global
│   ├── js/
│   │   └── api.js          # Helper global fetch() → api/
│   └── img/
├── views/                  # Archivos HTML por módulo/rol
│   ├── login.html
│   ├── dashboard.html
│   ├── pedidos.html
│   ├── produccion.html
│   ├── kanban.html
│   ├── inventario_taller.html
│   ├── inventario_tienda.html
│   ├── compras_externas.html
│   ├── embarques.html
│   ├── pos.html
│   ├── reportes.html
│   └── config.html
├── db/
│   └── schema.sql          # DDL completo para importar en Laragon
├── plan_decor.md
├── tasks/
│   └── todo.md
└── index.html              # Punto de entrada → redirige a login
```

---

## FASE 1: Andamiaje y Setup Local ← *Actual*

- [x] Decisiones técnicas confirmadas
- [ ] Crear estructura de carpetas del proyecto
- [ ] Crear `assets/css/styles.css` con Design System (paleta tierra/madera, tipografía, componentes)
- [ ] Crear `assets/js/api.js` helper global para llamadas fetch
- [ ] Crear `api/config/db.php` conexión MySQL configurable
- [ ] Crear `api/config/auth.php` middleware de sesión y roles
- [ ] Crear `index.html` y `views/login.html`

## FASE 2: Esquema de Base de Datos (MySQL DDL)

- [ ] **Grupo 1:** `db/schema.sql` — Tablas de Catálogo y Clientes
  - `categorias_mueble`, `acabados`, `productos`, `producto_acabados`, `clientes`, `listas_precios_clientes`, `proveedores`
- [ ] **Grupo 2:** — Tablas de Órdenes y Producción
  - `cotizaciones`, `cotizacion_items`, `ordenes`, `orden_items`, `empleados`, `semanas_nomina`, `work_orders`, `lista_precios_mano_obra`
- [ ] **Grupo 3:** — Tablas de Inventario Taller
  - `materiales`, `movimientos_inventario_taller`, `alertas_stock_material`
- [ ] **Grupo 4:** — Tablas de Tienda, POS y Logística
  - `tiendas`, `inventario_tienda`, `movimientos_inventario_tienda`, `compras_externas`, `compra_externa_items`, `ventas_tienda`, `venta_items`, `pagos_venta`, `cajas_tienda`, `embarques`, `embarque_items`, `devoluciones`
- [ ] Insertar datos semilla: desarrollar script para parsear catálogos CSV y listas de precios por cliente. Insertar roles, categorías, una tienda y una caja de ejemplo.

## FASE 3: API PHP y Seguridad

- [ ] `api/auth/login.php` — autenticación + inicio de sesión
- [ ] `api/auth/logout.php`
- [ ] Endpoints por módulo (CRUD) con validación de Roles
- [ ] Lógica de negocio clave:
  - `api/ordenes/confirmar.php` — genera work_orders automáticamente
  - `api/nomina/cerrar_semana.php`
  - `api/pos/registrar_venta.php` — valida stock y descuenta inventario
  - `api/embarques/confirmar_recepcion.php`

## FASE 4: Frontend (React + Vite + Tailwind)

**Enfoque Actualizado:** El proyecto usará una arquitectura de Single Page Application con 5 vistas maestras consolidadas para optimizar la experiencia de usuario.

- [ ] **1. Dashboard:** Métricas generales, resumen de ventas y alertas del negocio.
- [x] **2. Punto de Venta (POS):** 
  - Soporte para múltiples sucursales.
  - Conexión directa para descontar del *Inventario General* al confirmar venta.
- [x] **3. Pedidos (Mayoristas y Embarques):** 
  - Gestión de Órdenes de Compra para clientes mayoristas utilizando **Listas de Precios por Cliente**.
  - Salida de embarques conectada al inventario general.
  - **Emisión de PDF:** Generador de remisión/invoice formateada (plantilla image.png), conectada a los precios del cliente.
- [x] **4. Producción:** 
  - Creación de órdenes de trabajo (Work Orders) para el taller.
  - Su objetivo final es nutrir el *Inventario General* con muebles de fabricación propia.
- [ ] **5. Inventario General:** Dividido lógicamente en 3 secciones:
  - a) **Producción de Taller:** Muebles propios fabricados internamente.
  - b) **Proveedores Externos:** Artículos de reventa en sucursales.
  - c) **Colecciones Especiales:** Colaboraciones con terceros y piezas únicas.

---

## Notas importantes

- Los archivos PHP de la API **nunca deben ser accesibles directamente** desde el navegador. Se recomienda configurar `.htaccess` para bloquear acceso directo a `api/` y solo permitir peticiones desde el mismo servidor.
- El archivo `api/config/db.php` deberá ser actualizado por el usuario con las credenciales de su instalación de Laragon (`localhost`, `root`, y la contraseña vacía por defecto).
- La carpeta `db/` contendrá el `schema.sql` completo para importarlo directo en phpMyAdmin de Laragon.
