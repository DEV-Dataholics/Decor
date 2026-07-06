import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const inventarioPath = fileURLToPath(new URL('../src/data/inventario-inicial.json', import.meta.url));
const inventarioData = JSON.parse(fs.readFileSync(inventarioPath, 'utf8'));

test.describe('Flujo de QRs de Reposición y POS', () => {

  test.beforeEach(async ({ page }) => {
    // Limpiar localStorage antes de la prueba para evitar estados sucios y sembrar inventario
    await page.addInitScript((invData) => {
      Object.keys(localStorage).forEach(k => k.startsWith('decor_prod_') && localStorage.removeItem(k));
      localStorage.removeItem('decor_pos_tienda_id');
      localStorage.setItem('decor_prod_inventario', JSON.stringify(invData));
    }, inventarioData);
    await page.goto('login');
    
    // Login manual de administrador
    await page.getByPlaceholder('Correo electrónico').fill('admin@decor.mx');
    await page.getByPlaceholder('Contraseña').fill('demo');
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
    await expect(page.locator('text="Órdenes Activas"')).toBeVisible();
  });

  test('Generación de QR en Inventario -> Validación de tienda cruzada en POS -> Cobro Exitoso', async ({ page }) => {
    // 1. Ir a Inventario
    await page.getByRole('link', { name: 'Inventario' }).click();
    await expect(page.locator('h2', { hasText: 'Inventario' })).toBeVisible();

    // 2. Ir a Tienda
    await page.getByRole('button', { name: /Tienda/i }).click();

    // 3. Entrar a Sucursal Norte (tienda_id = 2)
    await page.locator('.glass-card', { hasText: 'Sucursal Norte' }).first().click();

    // 4. Hacer clic en la primera categoría disponible (ej. Recámaras, Salas, etc.)
    await page.locator('.glass-card').first().click();

    // 5. Deberíamos ver productos en stock. Hacemos clic en el botón de Imprimir QRs (el del icono de código QR)
    const qrBtn = page.locator('button[title="Imprimir QRs"]').first();
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    // 6. Esperar al modal de impresión y capturar el primer código QR autodescriptivo
    const qrLabelTextElement = page.locator('p.font-mono', { hasText: 'DCR-REC-2-' }).first();
    await expect(qrLabelTextElement).toBeVisible();
    const qrValue = await qrLabelTextElement.textContent();
    expect(qrValue).not.toBeNull();
    const trimmedQr = qrValue!.trim();
    console.log('Código QR de prueba capturado:', trimmedQr);

    // 7. Cerrar modal presionando 'Cancelar'
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // 8. Navegar al Punto de Venta (POS)
    await page.getByRole('link', { name: 'POS (QR)' }).click();
    await expect(page.locator('h2', { hasText: 'Punto de Venta' })).toBeVisible();

    // 9. Configuración de Caja: Seleccionar tienda incorrecta: Sucursal Sur (tienda_id = 3)
    const storeSelect = page.locator('select').first();
    await storeSelect.selectOption({ label: 'Sucursal Sur (Chihuahua)' });

    // 10. Intentar escanear (introducir manual) el QR que pertenece a Sucursal Norte
    const manualInput = page.getByPlaceholder('Escanea con pistola o escribe QR');
    await manualInput.fill(trimmedQr);
    await manualInput.press('Enter');

    // 11. Verificar que muestre error y que el carrito esté vacío
    await expect(page.locator('text=Este producto pertenece a otra sucursal')).toBeVisible();
    await expect(page.locator('text=El carrito está vacío')).toBeVisible();

    // 12. Cambiar de tienda activa a Sucursal Norte
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Cambiar Sucursal' }).click();
    await expect(storeSelect).toBeVisible();
    await storeSelect.selectOption({ label: 'Sucursal Norte (Chihuahua)' });

    // 13. Volver a ingresar el QR en la tienda correcta
    await manualInput.fill(trimmedQr);
    await manualInput.press('Enter');

    // 14. Verificar que se agregue al carrito y no haya error
    await expect(page.locator('text=Error')).not.toBeVisible();
    await expect(page.locator('text=El carrito está vacío')).not.toBeVisible();
    
    // 15. Avanzar a Pago (Paso 2)
    await page.getByRole('button', { name: 'Proceder al Pago' }).click();
    await expect(page.locator('text=Selecciona Método de Pago')).toBeVisible();

    // 16. Seleccionar Efectivo
    await page.getByRole('button', { name: 'Efectivo' }).click();
    await expect(page.getByRole('button', { name: '$500.00' })).toBeVisible();

    // 17. Presionar el billete rápido de $500 para cubrir el cobro
    await page.getByRole('button', { name: '$500.00' }).click();

    // 18. Cobrar y registrar venta (Paso 3)
    await page.getByRole('button', { name: 'Cobrar y Generar Ticket' }).click();

    // 19. Verificar éxito, ticket y dar click a Nueva Venta para reiniciar
    await expect(page.locator('text=¡Venta Procesada con Éxito!')).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar Nueva Venta' }).click();

    // 20. Confirmar que regresó al paso 1 del asistente con el carrito vacío
    await expect(page.locator('text=El carrito está vacío')).toBeVisible();
  });

});
