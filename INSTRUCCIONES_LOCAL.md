# 🚀 Guía Rápida: Ver el Proyecto en Local (Laragon)

Como ya tienes el botón **"Start All"** presionado en Laragon, sigue estos **3 pasos directos** para ver la página:

---

### Paso 1: "Conectar" tu carpeta a Laragon
Laragon solo "ve" lo que está en `C:\laragon\www`. Como tus archivos están en `OneDrive`, debemos crear un acceso directo inteligente (Symlink).

1. Abre **PowerShell** como **Administrador** (Busca "PowerShell" en el menú inicio, click derecho -> Ejecutar como administrador).
2. Copia y pega este comando exactamente:
   ```powershell
   New-Item -ItemType SymbolicLink -Path "C:\laragon\www\sistema_decor" -Target "$HOME\OneDrive\Documentos\sistema_decor"
   ```

---

### Paso 2: Abrir la página
1. Regresa a la ventana de **Laragon**.
2. Haz click en el botón **"Web"** o simplemente abre tu navegador y escribe:
   `http://localhost/sistema_decor`
   *(O intenta `http://sistema-decor.test` si Laragon te pidió permisos anteriormente).*

---

### Paso 3: Configurar la Base de Datos
Para que el login y los productos funcionen, necesitas la base de datos:

1. En Laragon, haz click en el botón **"Database"** (abre phpMyAdmin).
2. Crea una base de datos nueva llamada: `decor_muebleria`.
3. Haz click en la pestaña **"Importar"** arriba.
4. Selecciona el archivo: `C:\Users\gruiz\OneDrive\Documentos\sistema_decor\db\00_base.sql`.
5. Dale click al botón **"Continuar"** (al final de la página).
   *Repite esto con los demás archivos en la carpeta `db/` si quieres tener datos de prueba.*

---

---

### Paso 4: Desarrollo del Frontend (React)
Si deseas realizar cambios en la interfaz o ver las actualizaciones en tiempo real:

1. Abre una terminal en la carpeta `front/`.
2. Ejecuta `npm install` (solo la primera vez).
3. Ejecuta `npm run dev`.
4. Abre `http://localhost:5173` (o el puerto que te indique la terminal).

> [!IMPORTANT]
> Para que el Frontend se comunique con la API de Laragon, asegúrate de que Laragon esté encendido y que la URL en `front/src/api/index.ts` (o el archivo de configuración de API) apunte correctamente a `http://localhost/sistema_decor/api`.

---
 
### Paso 5: Pruebas End-to-End (E2E) con Playwright
El proyecto cuenta con un set completo de pruebas automatizadas que validan la lógica de negocio, pruebas de estrés, QRs y flujos de UI.

Para ejecutar las pruebas:
1. Asegúrate de tener el servidor de desarrollo corriendo (`npm run dev` en `front/`).
2. Abre otra terminal en la carpeta `front/`.
3. Instala los navegadores de Playwright (solo la primera vez):
   ```bash
   npx playwright install
   ```
4. Ejecuta las pruebas:
   ```bash
   npx playwright test
   ```
5. Para ver las pruebas en modo interactivo (UI):
   ```bash
   npx playwright test --ui
   ```

---

### ✅ Listo
Ya deberías poder ver y probar el sistema. 
- **URL Producción Local:** `http://localhost/sistema_decor` (requiere `npm run build`)
- **URL Desarrollo:** `http://localhost:5173/decor/`
- **Usuario:** `admin@decor.mx`
- **Password:** `demo` (o `password` en la base de datos SQL real)
