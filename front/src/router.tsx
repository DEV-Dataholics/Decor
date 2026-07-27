import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';

// Lazy loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PuntoDeVentaPage = lazy(() => import('./pages/PuntoDeVentaPage'));
const PedidosPage = lazy(() => import('./pages/PedidosPage'));
const ProduccionPage = lazy(() => import('./pages/ProduccionPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const CatalogoPage = lazy(() => import('./pages/CatalogoPage'));
const EmbarquesPage = lazy(() => import('./pages/EmbarquesPage'));
const RepartoPage = lazy(() => import('./pages/RepartoPage'));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'));
const PersonalPage = lazy(() => import('./pages/PersonalPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Cargando...</span>
      </div>
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: withSuspense(DashboardPage) },
      { path: 'pos', element: withSuspense(PuntoDeVentaPage) },
      { path: 'pedidos', element: withSuspense(PedidosPage) },
      { path: 'produccion', element: withSuspense(ProduccionPage) },
      { path: 'inventario', element: withSuspense(InventarioPage) },
      { path: 'catalogo', element: withSuspense(CatalogoPage) },
      { path: 'embarques', element: withSuspense(EmbarquesPage) },
      { path: 'personal', element: withSuspense(PersonalPage) },
      { path: 'configuracion', element: withSuspense(ConfiguracionPage) },
    ],
  },
]);
