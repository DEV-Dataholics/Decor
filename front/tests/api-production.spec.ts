import { test, expect } from '@playwright/test';

test.describe('Auditoría Completa de Sesión en Producción (Login -> Me)', () => {
  const loginUrl = 'https://decor.dataholics.com.mx/api/auth/login.php';
  const meUrl = 'https://decor.dataholics.com.mx/api/auth/me.php';

  test('El servidor debe establecer la cookie PHPSESSID y mantener la sesión', async ({ request }) => {
    // 1. Hacemos login con el usuario admin por defecto
    const loginResponse = await request.fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: 'admin@decor.mx',
        password: 'password'
      }
    });

    const loginBody = await loginResponse.json().catch(() => null);
    console.log('Login Status:', loginResponse.status());
    console.log('Login Body:', loginBody);

    // Verificamos que el login fue exitoso (o al menos llegó al backend)
    // Si devuelve 401 en login, significa que la contraseña cambió o el usuario no existe.
    // Si devuelve 200, debería devolver Set-Cookie.
    
    const headers = loginResponse.headers();
    console.log('Login Headers:', headers);
    
    // Playwright maneja las cookies automáticamente en el contexto de "request".
    // 2. Inmediatamente pedimos /me.php usando el MISMO contexto (que ya debería tener la cookie)
    const meResponse = await request.fetch(meUrl, {
      method: 'GET'
    });

    console.log('Me Status:', meResponse.status());
    const meBody = await meResponse.json().catch(() => null);
    console.log('Me Body:', meBody);

    expect(meResponse.status(), 'El servidor perdió la sesión inmediatamente después del login').toBe(200);
  });
});
