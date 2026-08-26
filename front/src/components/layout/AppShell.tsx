import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useDecor } from '../../store/StoreContext';
import type { Rol } from '../../store/useStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Financiero',
  '/pos': 'Punto de Venta (POS)',
  '/pedidos': 'Pedidos y Órdenes',
  '/produccion': 'Producción — Taller',
  '/inventario': 'Inventario de Sucursal',
  '/catalogo': 'Catálogo de Productos',
  '/embarques': 'Embarques y Logística',
  '/configuracion': 'Configuración & Manuales',
  '/reparto': 'Rutas de Entrega',
  '/personal': 'Personal & Nómina (RH)',
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
    <div className="flex h-screen overflow-hidden bg-[#FAF6EE]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-16 shrink-0 border-b border-stone-200 flex items-center justify-between px-4 md:px-8 bg-white/95 backdrop-blur-md shadow-xs z-10">
          <div className="flex items-center gap-3">
            <span className="md:hidden text-xl">🪵</span>
            <h2 className="text-base font-black text-stone-900 tracking-tight">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
              <span className="text-sm">{currentUser.avatar}</span>
              <span className="text-xs font-bold text-stone-800 hidden sm:block">{currentUser.nombre}</span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                {currentUser.rol.replace('_', ' ')}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
