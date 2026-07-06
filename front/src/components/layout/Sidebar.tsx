import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, ClipboardList, Hammer,
  PackageSearch, Grid3X3, Truck, Settings, ChevronLeft,
  ChevronRight, LogOut, Users
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
  { path: '/inventario', label: 'Inventario', icon: <PackageSearch size={20} />, roles: ['admin', 'encargado_taller', 'gerente_tienda'] },
  { path: '/catalogo', label: 'Catálogo', icon: <Grid3X3 size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/embarques', label: 'Embarques', icon: <Truck size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/personal', label: 'Personal (RH)', icon: <Users size={20} />, roles: ['admin'] },
  { path: '/configuracion', label: 'Configuración', icon: <Settings size={20} />, roles: ['admin'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, logout } = useDecor();
  const location = useLocation();

  const filteredNav = NAV_ITEMS.filter(item =>
    currentUser ? item.roles.includes(currentUser.rol) : false
  );

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#f4eedf] border-r border-[#eddcc4] transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo con Símbolo Zia */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#eddcc4] shrink-0">
        <svg viewBox="0 0 100 100" className="w-8 h-8 text-[#4a2818] shrink-0" fill="currentColor">
          <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="3.5" fill="none" />
          <line x1="45" y1="35" x2="45" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="48" y1="37" x2="48" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="37" x2="52" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="55" y1="35" x2="55" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="65" x2="45" y2="85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="48" y1="63" x2="48" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="63" x2="52" y2="90" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="55" y1="65" x2="55" y2="85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="65" y1="45" x2="85" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="63" y1="48" x2="90" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="63" y1="52" x2="90" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="65" y1="55" x2="85" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="35" y1="45" x2="15" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="37" y1="48" x2="10" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="37" y1="52" x2="10" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="35" y1="55" x2="15" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-xs font-sans font-black tracking-widest text-[#4a2818] uppercase whitespace-nowrap">Decor Mueblería</h1>
            <p className="text-[9px] text-[#4a2818]/75 uppercase tracking-wider font-semibold">Sistema de Gestión</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredNav.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-[#5a6b5c] text-[#fbfaf7] shadow-md shadow-[#5a6b5c]/10'
                  : 'text-[#4a2818]/75 hover:text-[#4a2818] hover:bg-[#5a6b5c]/10'
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="animate-fade-in truncate">{item.label}</span>
            )}
            {collapsed && location.pathname === item.path && (
              <span className="absolute left-0 w-[4px] h-5 bg-[#5a6b5c] rounded-r-full" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-[#eddcc4] p-2 space-y-2">
        {/* User info */}
        {currentUser && (
          <div className={`flex transition-all duration-200 rounded-xl ${
            collapsed 
              ? 'flex-col items-center gap-2 py-3 px-1' 
              : 'flex-row items-center gap-3 px-3 py-2.5'
          }`}>
            <span className="text-xl shrink-0" title={collapsed ? currentUser.nombre : undefined}>
              {currentUser.avatar}
            </span>
            {!collapsed ? (
              <div className="animate-fade-in flex-1 min-w-0">
                <p className="text-xs font-bold text-[#4a2818] truncate">{currentUser.nombre}</p>
                <p className="text-[10px] text-[#4a2818]/70 truncate">{currentUser.email}</p>
              </div>
            ) : null}
            <button
              onClick={logout}
              className="text-[#4a2818]/60 hover:text-red-700 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-[#5a6b5c]/10"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Cenefa en el pie */}
        {!collapsed && (
          <div className="px-2 py-1 flex justify-center opacity-40">
            <svg viewBox="0 0 120 12" className="w-full max-w-[160px] text-[#4a2818]" fill="currentColor">
              <rect x="0" y="0" width="120" height="0.8" />
              <path d="
                M0,6 L4,2 L4,10 Z
                M10,2 L6,6 L10,10 L14,6 Z
                M20,6 L16,2 L16,10 Z
                M20,6 L24,2 L24,10 Z
                M30,2 L26,6 L30,10 L34,6 Z
                M40,6 L36,2 L36,10 Z
                M40,6 L44,2 L44,10 Z
                M50,2 L46,6 L50,10 L54,6 Z
                M60,6 L56,2 L56,10 Z
                M60,6 L64,2 L64,10 Z
                M70,2 L66,6 L70,10 L74,6 Z
                M80,6 L76,2 L76,10 Z
                M80,6 L84,2 L84,10 Z
                M90,2 L86,6 L90,10 L94,6 Z
                M100,6 L96,2 L96,10 Z
                M100,6 L104,2 L104,10 Z
                M110,2 L106,6 L110,10 L114,6 Z
                M120,6 L116,2 L116,10 Z
              " />
              <rect x="0" y="11" width="120" height="0.8" />
            </svg>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-[#4a2818]/70 hover:text-[#4a2818] transition-colors rounded-lg hover:bg-[#5a6b5c]/10"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
