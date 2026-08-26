# TICKET-002: Corrección de Hashes de Contraseña para Autenticación Local

- **ID:** `DEC-002`
- **Fecha de Creación:** 2026-08-25
- **Módulo:** Auth & Base de Datos
- **Prioridad:** Alta
- **Estado:** Resuelto
- **Rama Git:** `feature/ajustes-pdv-reporte-ventas`

---

## 1. Contexto de Negocio & Oportunidad

### 🎯 El Problema / Necesidad
Al intentar iniciar sesión desde el frontend en desarrollo local ([`http://localhost:5173/`](http://localhost:5173/)) hacia la API backend (`/api/auth/login.php`), el servidor respondía con error `401 (Unauthorized)`. La causa raíz fue que los hashes bcrypt precargados en la tabla `usuarios` del script inicial [`db/00_base.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/00_base.sql) no coincidían con la contraseña por defecto documentada (`password`).

### 💡 La Solución Propuesta / Implementada
- Se generó el hash bcrypt válido para el string `password` mediante `password_hash('password', PASSWORD_BCRYPT)`.
- Se actualizaron los registros de la tabla `usuarios` en la base de datos MySQL local (`decor_muebleria`).
- Se corrigió el archivo semilla [`db/00_base.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/00_base.sql) para asegurar que cualquier instalación futura o despliegue limpio mantenga consistencia con las credenciales por defecto.
- Se verificó la autenticación mediante petición POST a [`api/auth/login.php`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/api/auth/login.php) obteniendo respuesta `200 OK` con sesión iniciada para `admin@decor.mx`.

---

## 2. Archivos Involucrados

### 🖥️ Frontend (`front/src/`)
- `front/src/store/useStore.ts` (consumo de `/api/auth/login.php` y `/api/auth/me.php`)

### ⚙️ Backend & Base de Datos (`api/`, `db/`)
- `api/auth/login.php`
- `api/auth/me.php`
- `db/00_base.sql`

---

## 3. Criterios de Aceptación (DoD - Definition of Done)

- [x] **DoD 1:** Generación de hash bcrypt compatible con `password_verify('password', $hash)`.
- [x] **DoD 2:** Actualización de la tabla `usuarios` en la BD local `decor_muebleria`.
- [x] **DoD 3:** Actualización del script [`db/00_base.sql`](file:///c:/Users/gruiz/.gemini/antigravity-ide/scratch/Decor/db/00_base.sql).
- [x] **DoD 4:** Endpoint `/api/auth/login.php` responde con `{ ok: true, user: ... }` para `admin@decor.mx` con contraseña `password`.
- [x] **DoD 5:** Documentación en ticket `DEC-002` y registro en `CHANGELOG.md`.
