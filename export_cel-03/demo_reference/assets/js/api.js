// assets/js/api.js
// Helper global para todas las llamadas fetch() a la API PHP

// Detecta si estamos en localhost:3000 (frontend separado) para apuntar al backend en el 8000
const API_BASE = window.location.port === '3000' 
    ? 'http://localhost:8000/back' 
    : (window.location.pathname.includes('/sistema_decor/') ? '/sistema_decor/back' : '/back');

/**
 * Realiza una petición a la API.
 * @param {string} endpoint - ej. '/auth/login'
 * @param {string} method   - GET | POST | PUT | DELETE
 * @param {object} [body]   - Payload JSON (opcional)
 * @returns {Promise<any>}
 */
async function api(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        credentials: 'include', // Permite enviar cookies de sesión PHP entre puertos (CORS)
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);

    if (res.status === 401) {
        // Solo redirigir si NO estamos ya en el login (evita bucle infinito)
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = `${basePath}/views/login.html`;
        }
        return null;
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
}

/**
 * Carga los datos del usuario en sesión y los almacena globalmente.
 * Redirige al login si no hay sesión activa.
 */
async function loadCurrentUser() {
    try {
        const user = await api('/auth/me.php');
        if (!user) {
            // Sin sesión y no estamos en login → redirigir
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = `${basePath}/views/login.html`;
            }
            return null;
        }
        window.__user = user;
        return user;
    } catch {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = `${basePath}/views/login.html`;
        }
    }
}

/**
 * Aplica visibilidad a elementos con atributo data-roles="rol1,rol2"
 * según el rol del usuario actual.
 */
function applyRoleVisibility() {
    const rol = window.__user?.rol;
    document.querySelectorAll('[data-roles]').forEach(el => {
        const allowed = el.dataset.roles.split(',').map(r => r.trim());
        el.style.display = allowed.includes(rol) ? '' : 'none';
    });
}
