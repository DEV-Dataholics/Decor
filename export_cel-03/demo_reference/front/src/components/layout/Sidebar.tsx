import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, ClipboardList, Hammer,
  PackageSearch, Grid3X3, Truck, Settings, ChevronLeft,
  ChevronRight, LogOut, RotateCcw, Users
} from 'lucide-react';
import { useDecor } from '../../store/StoreContext';
import type { Rol } from '../../store/useStore';

type NavItem = {
  path: string; label: string; icon: React.ReactNode; roles: Rol[];
};

const NAV_ITEMS: NavItem[] = [
  { path: '/reparto', label: 'Reparto', icon: <Truck size={20} />, roles: ['repartidor', 'admin'] },
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/pos', label: 'POS (QR)', icon: <ScanLine size={20} />, roles: ['admin', 'gerente_tienda'] },
  { path: '/pedidos', label: 'Pedidos', icon: <ClipboardList size={20} />, roles: ['admin'] },
  { path: '/produccion', label: 'Producción', icon: <Hammer size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/inventario', label: 'Inventario', icon: <PackageSearch size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/catalogo', label: 'Catálogo', icon: <Grid3X3 size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/embarques', label: 'Embarques', icon: <Truck size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/personal', label: 'Personal (RH)', icon: <Users size={20} />, roles: ['admin'] },
  { path: '/configuracion', label: 'Configuración', icon: <Settings size={20} />, roles: ['admin'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, logout, resetDemo } = useDecor();
  const location = useLocation();

  const filteredNav = NAV_ITEMS.filter(item =>
    currentUser ? item.roles.includes(currentUser.rol) : false
  );

  const handleReset = () => {
    if (confirm('¿Restaurar todos los datos de la demo al estado inicial?')) {
      resetDemo();
      window.location.href = '/login';
    }
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-800/80 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800/80 shrink-0">
        <span className="text-2xl shrink-0">🪑</span>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-sm font-bold text-zinc-100 whitespace-nowrap">Decor Mueblería</h1>
            <p className="text-[10px] text-zinc-500 font-medium">Sistema de Gestión</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {filteredNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="animate-fade-in truncate">{item.label}</span>
            )}
            {collapsed && location.pathname === item.path && (
              <span className="absolute left-0 w-[3px] h-5 bg-amber-500 rounded-r-full" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-zinc-800/80 p-2 space-y-1">
        {/* Reset Demo */}
        <button
          onClick={handleReset}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/60 w-full transition-all"
        >
          <RotateCcw size={16} className="shrink-0" />
          {!collapsed && <span className="animate-fade-in">Reset Demo</span>}
        </button>

        {/* User info */}
        {currentUser && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <span className="text-xl shrink-0">{currentUser.avatar}</span>
            {!collapsed && (
              <div className="animate-fade-in flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{currentUser.nombre}</p>
                <p className="text-[10px] text-zinc-500 truncate">{currentUser.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-zinc-600 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-800/60"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
