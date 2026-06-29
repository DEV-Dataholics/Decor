import { test, expect } from '@playwright/test';

test.describe('UI/UX Pruebas', () => {

  test.beforeEach(async ({ page }) => {
    // Limpiar localStorage antes de cada prueba para tener un estado limpio.
    await page.addInitScript(() => {
      Object.keys(localStorage).forEach(k => k.startsWith('decor_demo_') && localStorage.removeItem(k));
    });
    await page.goto('login');
  });

  test('Validación de inicio de sesión y navegación del menú lateral', async ({ page }) => {
    // Login usando acceso rápido
    await page.locator('button', { hasText: 'Sergio / Norma' }).click();

    // Esperar a que cargue el Dashboard
    await expect(page.locator('text=Órdenes Activas')).toBeVisible();

    // Navegar a Pedidos
    await page.getByRole('link', { name: 'Pedidos' }).click();
    await expect(page.locator('h2', { hasText: 'Pedidos' })).toBeVisible();

    // Navegar a Producción
    await page.getByRole('link', { name: 'Producción' }).click();
    await expect(page.locator('h2', { hasText: 'Producción' })).toBeVisible();
    
    // Navegar a Inventario
    await page.getByRole('link', { name: 'Inventario' }).click();
    await expect(page.locator('h2', { hasText: 'Inventario' })).toBeVisible();
  });

  test('Validación de Botón de Nueva Orden (Formulario)', async ({ page }) => {
    // Login usando acceso rápido
    await page.locator('button', { hasText: 'Sergio / Norma' }).click();

    // Ir a Pedidos
    await page.getByRole('link', { name: 'Pedidos' }).click();

    // Clic en Nueva Orden
    await page.getByRole('button', { name: /Nueva Orden/i }).click();

    // Verificamos que el modal se abre (vemos el campo de Destino)
    await expect(page.locator('text=Destino (Cliente o Sucursal)')).toBeVisible();

    // El botón de Guardar/Crear debe estar deshabilitado inicialmente porque no hay ítems
    const createBtn = page.getByRole('button', { name: /Crear Orden \(0 artículos\)/i });
    await expect(createBtn).toBeDisabled();

    // Cancelar
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('text=Destino (Cliente o Sucursal)')).not.toBeVisible();
  });

});
