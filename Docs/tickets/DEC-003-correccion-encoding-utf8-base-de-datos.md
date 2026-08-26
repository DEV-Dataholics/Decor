# TICKET-003: Corrección de Codificación de Caracteres (UTF-8 / Acentos) en Base de Datos

- **ID:** `DEC-003`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Base de Datos & API
- **Prioridad:** Media
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
En la interfaz de usuario se mostraban nombres con signos de interrogación en lugar de caracteres acentuados (ej. `Carlos Mart?nez Ruiz`, `Jos? Garc?a Ram?rez`, `V?ctor Manuel L?pez`). La causa raíz ocurrió durante la importación inicial mediante PowerShell, donde el pipeline de consola convirtió la salida estándar a ASCII antes de enviarla al cliente de MySQL, corrompiendo los bytes multibyte UTF-8 e insertando caracteres `?` (0x3F) literales en la base de datos.

### 💡 La Solución Propuesta / Implementada
- Se reimportaron todas las tablas y datos maestros de la base de datos [`db/`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db) utilizando conexión directa nativa MySQL con `--default-character-set=utf8mb4` sin intermediación del pipeline de consola de PowerShell.
- Se verificó a nivel de bytes (hexadecimal) y mediante pruebas de endpoints HTTP (`/api/empleados/list.php`, `/api/productos/list.php`, `/api/auth/me.php`) que las cadenas se almacenen y transmitan en UTF-8 válido (`í` -> `0xC3AD`, `ó` -> `0xC3B3`, `á` -> `0xC3A1`, `é` -> `0xC3A9`).

---

## 2. Archivos Involucrados

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- `db/00_base.sql` a `db/08_semilla_pos.sql`
- `db/seed_completo.sql`
- `api/empleados/list.php`
- `api/productos/list.php`

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Los caracteres acentuados y especiales (`á, é, í, ó, ú, ñ`) se almacenan como secuencias válidas UTF-8 en MySQL (`utf8mb4`).
- [x] **DoD 2:** Las respuestas JSON de la API envían encabezado `Content-Type: application/json; charset=utf-8` con texto decodificado correctamente.
- [x] **DoD 3:** Los nombres en el frontend (ej. `Carlos Martínez Ruiz`) se renderizan sin signos `?` ni artefactos de encoding.
- [x] **DoD 4:** Documentación del ticket `DEC-003` y actualización de `CHANGELOG.md`.
