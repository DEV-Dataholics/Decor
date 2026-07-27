import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, ClipboardList, Hammer,
  PackageSearch, Grid3X3, Truck
} from 'lucide-react';
import { useDecor } from '../../store/StoreContext';
import type { Rol } from '../../store/useStore';

type MobileNavItem = {
  path: string; label: string; icon: React.ReactNode; roles: Rol[];
};

const MOBILE_NAV: MobileNavItem[] = [

  { path: '/dashboard', label: 'Inicio', icon: <LayoutDashboard size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/pos', label: 'POS', icon: <ScanLine size={20} />, roles: ['admin', 'gerente_tienda'] },
  { path: '/pedidos', label: 'Pedidos', icon: <ClipboardList size={20} />, roles: ['admin'] },
  { path: '/produccion', label: 'Taller', icon: <Hammer size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/inventario', label: 'Stock', icon: <PackageSearch size={20} />, roles: ['admin', 'encargado_taller', 'gerente_tienda'] },
  { path: '/catalogo', label: 'Catálogo', icon: <Grid3X3 size={20} />, roles: ['admin', 'encargado_taller'] },
  { path: '/embarques', label: 'Envíos', icon: <Truck size={20} />, roles: ['admin', 'encargado_taller'] },
];

export default function MobileNav() {
  const { currentUser } = useDecor();

  const filtered = MOBILE_NAV.filter(item =>
    currentUser ? item.roles.includes(currentUser.rol) : false
  ).slice(0, 5); // Max 5 items in mobile nav

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#f4eedf] border-t border-[#eddcc4] select-none">
      <div className="flex justify-around items-center h-16 px-1">
        {filtered.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] relative ${
                isActive
                  ? 'text-[#5a6b5c]'
                  : 'text-[#4a2818]/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#5a6b5c]' : 'text-[#4a2818]/70'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#5a6b5c] rounded-b-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
