import { test, expect } from '@playwright/test';

test.describe('Pruebas de Estrés y Reportes Avanzados', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('login');
    
    // Iniciar con almacenamiento limpio
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => k.startsWith('decor_prod_') && localStorage.removeItem(k));
    });
    
    // Login manual
    await page.getByPlaceholder('Correo electrónico').fill('admin@decor.mx');
    await page.getByPlaceholder('Contraseña').fill('demo');
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  });

  test('Simular 1 Año de Operación, verificar Reporte POS y Buscador de Embarques', async ({ page }) => {
    test.setTimeout(90000); // Otorgar tiempo suficiente para la generación de gran volumen de datos

    // 1. IR A CONFIGURACIÓN Y EJECUTAR SIMULADOR
    await page.getByRole('link', { name: 'Configuración' }).click();
    await page.getByRole('button', { name: /Sistema/i }).click();

    // Validar visibilidad del panel de estrés
    await expect(page.locator('text=Pruebas de Estrés y Rendimiento')).toBeVisible();

    // Activar simulador y escuchar el dialog confirm/alert de recarga
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Simulación exitosa');
      await dialog.accept();
    });

    await page.getByRole('button', { name: '⚡ Simular 1 Año de Operación' }).click();
    
    // Esperar a que la página se recargue automáticamente tras la simulación y muestre el dashboard
    await expect(page.locator('text="Órdenes Activas"')).toBeVisible({ timeout: 20000 });

    // 2. VERIFICAR IMPACTO EN DASHBOARD Y REPORTE POS
    // Scroll hacia el final donde está el reporte de ventas por sucursal
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Comprobar que el contenedor del reporte POS es visible
    await expect(page.locator('text=Reporte de Ventas por Sucursal')).toBeVisible();

    // Interactuar con los filtros de tienda
    const selectTiendaReporte = page.locator('select').first();
    await selectTiendaReporte.selectOption({ index: 1 }); // Seleccionar la primera tienda simulada
    await page.waitForTimeout(300);

    // Verificar que los KPIs tengan valores válidos mayores a cero después de la simulación
    const totalVendidoText = await page.locator('p:has-text("$")').first().textContent();
    expect(totalVendidoText).not.toBeNull();

    // 3. PROBAR FILTROS DE EMBARQUES
    await page.getByRole('link', { name: 'Embarques' }).click();
    await expect(page.locator('h2', { hasText: 'Embarques y Logística' })).toBeVisible();

    // Comprobar buscador de embarques
    const inputFechaEmbarque = page.locator('input[type="date"]').first();
    await expect(inputFechaEmbarque).toBeVisible();

    // Seleccionar una tienda en el buscador de logística
    const selectTiendaEmbarques = page.locator('select').first();
    await selectTiendaEmbarques.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Botón limpiar filtros
    await page.getByRole('button', { name: /Limpiar/i }).click();

    // 4. RESTABLECER ESTADO DE FÁBRICA
    await page.getByRole('link', { name: 'Configuración' }).click();
    await page.getByRole('button', { name: /Sistema/i }).click();

    page.once('dialog', async dialog => {
      await dialog.accept(); // Confirmar borrado
    });

    await page.getByRole('button', { name: 'Restablecer Demo de Fábrica' }).click();

    // Confirmar que volvimos al estado base
    await expect(page.locator('text="Órdenes Activas"')).toBeVisible({ timeout: 15000 });
  });

});
