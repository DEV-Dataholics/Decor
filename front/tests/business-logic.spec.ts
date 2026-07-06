import { test, expect } from '@playwright/test';

test.describe('Lógica de Negocio (Ciclo Completo)', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.keys(localStorage).forEach(k => k.startsWith('decor_prod_') && localStorage.removeItem(k));
    });
    await page.goto('login');
    
    // Login manual
    await page.getByPlaceholder('Correo electrónico').fill('admin@decor.mx');
    await page.getByPlaceholder('Contraseña').fill('demo');
    await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  });

  test('Flujo de Creación de Orden -> Producción -> Embarque -> POS', async ({ page }) => {
    test.setTimeout(60000); // Dar más tiempo a esta prueba

    // 1. CREACIÓN (Pedidos)
    await page.getByRole('link', { name: 'Pedidos' }).click();
    await page.getByRole('button', { name: /Nueva Orden/i }).click();
    
    // Cambiar a Sucursal
    const destinoSelect = page.locator('select').first();
    await destinoSelect.selectOption({ label: 'Sucursal Matriz (Centro)' }); // Asumimos que esta es la primera tienda

    // Agregar Artículo
    await page.getByRole('button', { name: /Agregar Artículo/i }).click();
    
    // Seleccionar Orden Especial y poner nombre
    await page.getByRole('button', { name: 'Orden Especial' }).click();
    await page.getByPlaceholder('Nombre del mueble especial').fill('Mesa de Centro Custom');
    
    // Llenar medidas
    const anchoInput = page.locator('input[type="number"]').nth(0);
    const altoInput = page.locator('input[type="number"]').nth(1);
    await anchoInput.fill('20');
    await altoInput.fill('30');
    
    // Confirmar agregar
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    
    // Crear Orden
    await page.getByRole('button', { name: /Crear Orden \(1 artículos\)/i }).click();

    // 2. FABRICACIÓN (Taller)
    await page.getByRole('link', { name: 'Producción' }).click();
    
    // Mover la orden a través de producción
    const primeraOrden = page.locator('.glass-card', { hasText: 'Orden #' }).first();
    const titulo = await primeraOrden.locator('h3').textContent();
    const match = titulo?.match(/Orden #(\d+)/);
    const ordenId = match ? match[1] : '';
    const miOrden = page.locator('.glass-card', { hasText: `Orden #${ordenId}` });

    await miOrden.getByRole('button', { name: /Expandir/i }).click();
    
    // Hacer avanzar la pieza por los estados (abre modal de asignación)
    await miOrden.getByRole('button', { name: '▶ Iniciar' }).first().click();
    await page.waitForTimeout(500);

    // Seleccionar empleado y confirmar
    const selectTrabajador = page.locator('select');
    await selectTrabajador.selectOption({ index: 1 }); // Selecciona un carpintero activo
    
    // Rellenar la tarifa de mano de obra
    const tarifaInput = page.locator('input[placeholder="0.00"]').first();
    await tarifaInput.fill('150');
    
    await page.getByRole('button', { name: /Asignar/i }).click();
    await page.waitForTimeout(500);

    await miOrden.getByRole('button', { name: '🎨 A Acabados' }).first().click();
    await page.waitForTimeout(500);

    // Seleccionar pintor y confirmar tarifa de acabados
    await selectTrabajador.selectOption({ index: 2 }); // Selecciona un pintor activo
    await tarifaInput.fill('320');
    await page.getByRole('button', { name: /Asignar/i }).click();
    await page.waitForTimeout(500);

    await miOrden.getByRole('button', { name: '✓ Listo' }).first().click();
    
    // Esperamos un momento para que se cree el producto terminado
    await page.waitForTimeout(1000);

    // 3. DISTRIBUCIÓN (Embarques)
    await page.getByRole('link', { name: 'Embarques' }).click();
    await page.getByRole('button', { name: /Nuevo Embarque/i }).click();
    
    // Elegir ruta/destino
    await page.locator('input[placeholder*="Calculada"]').fill('Monterrey - San Pedro');
    
    // Buscar un botón de escanear o seleccionar producto.
    // Seleccionamos el primer producto en la lista de terminados
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    // Crear embarque
    await page.getByRole('button', { name: /Crear Embarque/i }).click();
    
    // Verificamos que se listó en la tabla de embarques
    await expect(page.locator('text=Monterrey - San Pedro').first()).toBeVisible();

    // El Administrador cambia el estatus de la nueva ruta a "Embarcado"
    const primerEmbarqueCard = page.locator('.glass-card', { hasText: 'Monterrey - San Pedro' }).first();
    await primerEmbarqueCard.getByRole('button', { name: 'Embarcado' }).click();
    await page.waitForTimeout(500);

    // 4. RECEPCIÓN (Reparto / Entrega por el Chofer)
    await page.getByRole('link', { name: 'Reparto', exact: true }).click();
    
    // Abrir detalles de ruta
    await page.getByRole('button', { name: /Ver Detalles/i }).first().click();

    // El Chofer inicia la ruta (cambia a En Tránsito)
    await page.getByRole('button', { name: /Iniciar Viaje/i }).click({ force: true });
    await page.waitForTimeout(500);
    
    // El Chofer finaliza la entrega al llegar a la sucursal
    await page.getByRole('button', { name: /Finalizar Entrega/i }).click();
    await page.waitForTimeout(500);
    
    // 5. RECEPCIÓN EN TIENDA (Confirmar recibo de stock)
    await page.getByRole('link', { name: 'Inventario' }).click();
    await page.getByRole('button', { name: /Tienda/i }).click();
    
    // Entrar a la sucursal para que se muestren los embarques destinados a ella
    await page.locator('.glass-card', { hasText: 'Sucursal Matriz (Centro)' }).first().click();
    await page.waitForTimeout(500);
    
    // Clic en recibir pedido
    await page.getByRole('button', { name: /Recibir Pedido/i }).first().click();
    await page.waitForTimeout(500);
    
    // Marcar pieza como OK
    await page.getByRole('button', { name: /✓ OK/i }).first().click();
    
    // Confirmar recepción
    await page.getByRole('button', { name: /Confirmar Recepción/i }).click();
    await page.waitForTimeout(500);
    
    // Entrar a la categoría Otros (donde caen los custom)
    await page.locator('.glass-card', { hasText: 'Otros' }).first().click();
    
    // Si la recepción funcionó, debemos ver la mesa ahí.
    const itemEnPos = page.locator('.glass-card', { hasText: 'Mesa de Centro Custom' }).first();
    await expect(itemEnPos).toBeVisible();

    // FIN: Comprobamos que logramos navegar el flujo completo sin errores ni crasheos
  });

});
