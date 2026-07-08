import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Fetch Global Interceptor / Configuración (CORS & Auth)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // 1. Guardamos el fetch original y creamos un mock
    originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, user: { id: 1, nombre: 'Test' } })
      } as Response)
    );
  });

  afterEach(() => {
    // 2. Restauramos fetch original
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('debe enviar credenciales (cookies) en peticiones cross-subdomain al backend', async () => {
    // 3. Simulamos la llamada que hace tu frontend (decor.dataholics.com.mx)
    // hacia el backend en el dominio raíz (dataholics.com.mx)
    const backendUrl = 'https://dataholics.com.mx/api/auth/me.php';
    
    // Aquí invocarías a tu función real de la API (ej: api.getMe())
    // Por ahora simulamos la petición directa con fetch
    await global.fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      // ESTO ES CRÍTICO: Para que las cookies (PHP_SESSID) se envíen
      // entre decor.dataholics.com.mx y dataholics.com.mx
      credentials: 'include' 
    });

    // 4. Afirmaciones
    expect(global.fetch).toHaveBeenCalledOnce();
    
    const requestArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = requestArgs[0];
    const options = requestArgs[1];

    expect(url).toBe(backendUrl);
    
    // Verificamos que el flag credentials esté presente y en 'include'
    expect(options?.credentials).toBe('include');
    
    // Si llegaras a usar tokens (aunque PHP usa cookies por sesión), verificaríamos el header aquí:
    // expect(options?.headers).toHaveProperty('Authorization', 'Bearer mock-token');
  });
});
