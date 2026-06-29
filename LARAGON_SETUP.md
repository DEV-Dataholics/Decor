# 🚀 Guía: Montar sistema_decor en Laragon

Laragon ya está instalado en tu equipo (`C:\laragon`). Solo necesitas seguir estos pasos.

---

## PASO 1 — Crear el Virtual Host (Symlink)

> ⚠️ Abre **PowerShell como Administrador** (click derecho en el menú inicio → "Terminal como administrador")

Pega y ejecuta este comando:

```powershell
New-Item -ItemType SymbolicLink `
  -Path "C:\laragon\www\sistema_decor" `
  -Target "C:\Users\gruiz\OneDrive\Documentos\sistema_decor\front"
```

Esto crea un enlace simbólico para que Laragon sirva directamente la carpeta **front** como raíz del sitio.

---

## PASO 2 — Iniciar Laragon

1. Abre **Laragon** (`C:\laragon\laragon.exe`)
2. Click en el botón verde **"Start All"**
3. Verifica que aparezcan:
   - ✅ Apache corriendo (puerto 80)
   - ✅ MySQL corriendo (puerto 3306)

---

## PASO 3 — Verificar el Virtual Host

Laragon auto-detecta las carpetas dentro de `www/` y crea dominios `.test` automáticamente.

Abre tu navegador y visita:
```
http://sistema-decor.test
```

Deberías ser redirigido a la pantalla de **Login** de Decor Mueblería.

> Si no funciona `sistema-decor.test`, prueba con:
> `http://localhost/sistema_decor`

---

## PASO 4 — Crear la Base de Datos

1. Con Laragon corriendo, abre **phpMyAdmin**:
   - Desde el menú de Laragon: **"Database" → "phpMyAdmin"**
   - O en el navegador: `http://localhost/phpmyadmin`

2. En phpMyAdmin, ve a la pestaña **"SQL"** y ejecuta los scripts **en este orden exacto**:

| Orden | Archivo | Cómo abrirlo |
|---|---|---|
| 1 | `C:\laragon\www\sistema_decor\db\00_base.sql` | Abre el archivo, copia el contenido y pégalo en la pestaña SQL |
| 2 | `db\01_catalogo.sql` | Ídem |
| 3 | `db\02_ordenes.sql` | Ídem |
| 4 | `db\03_produccion.sql` | Ídem |
| 5 | `db\04_inventario_taller.sql` | Ídem |
| 6 | `db\05_tienda_pos.sql` | Ídem |
| 7 | `db\06_logistica.sql` | Ídem |
| 8 | `db\07_semilla.sql` | Ídem |

> 💡 **Tip rápido:** En phpMyAdmin, también puedes usar la pestaña **"Importar"** y seleccionar cada archivo `.sql` directamente desde el explorador de archivos.

---

## PASO 5 — Configurar la conexión en el código

Abre el archivo `back/config/db.php` y verifica que los datos coincidan con Laragon:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'decor_muebleria');
define('DB_USER', 'root');
define('DB_PASS', '');  // Laragon por defecto tiene contraseña vacía
```

---

## PASO 6 — Verificación final

Visita `http://sistema-decor.test` (o `http://localhost/sistema_decor`) y:

- [ ] ¿Carga la pantalla de Login? ✅
- [ ] ¿Puedes iniciar sesión con `admin@decor.mx` / `password`? ✅
- [ ] ¿phpMyAdmin muestra la BD `decor_muebleria` con sus tablas? ✅

---

## Solución de problemas comunes

| Problema | Solución |
|---|---|
| `sistema-decor.test` no carga | En Laragon: Menu → Preferences → tick "Auto virtual hosts" → Reload |
| Error 403 Forbidden | El symlink no tiene permisos — recrear con PowerShell Admin |
| Error de conexión MySQL | Verificar que MySQL esté corriendo en el panel de Laragon |
| Error en SQL al importar | Importar script por script en orden; hay dependencias entre tablas |
| `password_verify` falla al hacer login | La contraseña del usuario admin en `00_base.sql` es `password` (hash bcrypt) |
