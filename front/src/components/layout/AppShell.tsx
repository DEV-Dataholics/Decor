import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useDecor } from '../../store/StoreContext';

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
};

export default function AppShell() {
  const { currentUser } = useDecor();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.rol === 'gerente_tienda' && location.pathname !== '/pos') {
    return <Navigate to="/pos" replace />;
  }

  if (location.pathname === '/' || location.pathname === '/dashboard') {
    if (currentUser.rol === 'repartidor') {
      return <Navigate to="/reparto" replace />;
    }
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
            <h2 className="text-sm font-semibold text-zinc-200">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/60 px-2 py-1 rounded-md border border-zinc-700/40 hidden sm:block">
              DEMO
            </span>
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
