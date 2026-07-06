import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useDecor } from '../../store/StoreContext';
import type { Rol } from '../../store/useStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Punto de Venta',
  '/pedidos': 'Pedidos Mayoristas',
  '/produccion': 'Producción — Taller',
  '/inventario': 'Inventario General',
  '/catalogo': 'Catálogo de Productos',
  '/embarques': 'Embarques y Logística',
  '/configuracion': 'Configuración',
  '/reparto': 'Rutas de Entrega',
  '/personal': 'Personal (RH)',
};

const ALLOWED_ROUTES: Record<Rol, string[]> = {
  admin: ['/dashboard', '/pos', '/pedidos', '/produccion', '/inventario', '/catalogo', '/embarques', '/personal', '/configuracion', '/reparto'],
  gerente_tienda: ['/pos', '/inventario'],
  encargado_taller: ['/dashboard', '/produccion', '/inventario', '/catalogo', '/embarques'],
  repartidor: ['/reparto'],
};

export default function AppShell() {
  const { currentUser } = useDecor();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const allowed = ALLOWED_ROUTES[currentUser.rol] || [];
  
  // Si intenta acceder a una ruta que no tiene permitida, redirigir a su pantalla de inicio por defecto
  if (location.pathname !== '/' && !allowed.includes(location.pathname)) {
    return <Navigate to={allowed[0]} replace />;
  }

  // Redirección para la raíz '/'
  if (location.pathname === '/') {
    return <Navigate to={allowed[0]} replace />;
  }

  const pageTitle = PAGE_TITLES[location.pathname] || 'Decor Mueblería';

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 shrink-0 border-b border-zinc-800/60 flex items-center justify-between px-4 md:px-6 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="md:hidden text-xl">🪑</span>
            <h2 className="text-base font-sans font-bold text-zinc-100 tracking-wide">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{currentUser.avatar}</span>
              <span className="text-xs text-zinc-400 hidden sm:block">{currentUser.nombre}</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
