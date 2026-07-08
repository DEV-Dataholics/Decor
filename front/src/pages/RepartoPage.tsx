import { useState, useMemo } from 'react';
import { useDecor } from '../store/StoreContext';
import { Truck, PackageCheck, AlertTriangle, ChevronRight, X, CheckCircle } from 'lucide-react';
import type { Embarque } from '../store/useStore';

export default function RepartoPage() {
  const { embarques, updateEmbarqueStatus } = useDecor();
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);

  // Filtrar rutas activas (en tránsito o listas en taller para embarcar)
  const rutasActivas = useMemo(() => 
    [...embarques]
      .filter(e => e.estatus === 'en_transito' || e.estatus === 'embarcado')
      .sort((a, b) => b.id - a.id), 
    [embarques]
  );

  const activeRoute = useMemo(() => 
    embarques.find(e => e.id === activeRouteId), 
    [embarques, activeRouteId]
  );

  const handleStartRoute = (emb: Embarque) => {
    setActiveRouteId(emb.id);
  };

  const handleIniciarViaje = (id: number) => {
    updateEmbarqueStatus(id, 'en_transito');
  };

  const handleFinalizarEntrega = (emb: Embarque) => {
    // Si va a una tienda física, pasa a 'en_sucursal' para que la tienda haga el recibo.
    // Si es cliente directo (tienda_destino_id es 0 o null), pasa directamente a 'entregado'.
    const nextStatus = (emb.tienda_destino_id && emb.tienda_destino_id > 0) ? 'en_sucursal' : 'entregado';
    updateEmbarqueStatus(emb.id, nextStatus);
    setActiveRouteId(null);
  };

  // Vista de detalle de ruta activa
  if (activeRoute) {
    const isEmbarcado = activeRoute.estatus === 'embarcado';
    const isEnTransito = activeRoute.estatus === 'en_transito';

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-full bg-zinc-950 pb-20">
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Truck size={16} className="text-amber-500" /> Viaje #{activeRoute.id}
            </h2>
            <p className="text-[10px] text-zinc-400 max-w-[200px] truncate">{activeRoute.ruta_viaje || activeRoute.cliente_nombre}</p>
          </div>
          <button onClick={() => setActiveRouteId(null)} className="text-zinc-500 hover:text-zinc-300 p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6 max-w-md mx-auto w-full py-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
              isEnTransito ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400 animate-pulse'
            }`}>
              <Truck size={40} />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-zinc-100">
                {isEmbarcado ? 'Listo para Salir' : 'En Ruta'}
              </h3>
              <p className="text-xs text-zinc-550">
                {isEmbarcado 
                  ? 'Confirma los datos de carga antes de salir del taller de producción.' 
                  : 'Navegando a la sucursal de destino. La sucursal validará la recepción al llegar.'}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs space-y-3.5 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Destino:</span>
                <span className="text-zinc-200 font-bold text-right">{activeRoute.ruta_viaje || activeRoute.cliente_nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Transportista:</span>
                <span className="text-zinc-200 font-semibold">{activeRoute.transportista || 'Asignado'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Placas del tráiler:</span>
                <span className="text-zinc-200 font-mono font-semibold">{activeRoute.placas_trailer || 'No registradas'}</span>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-800/85 pt-3">
                <span className="text-zinc-500">Carga total:</span>
                <span className="text-amber-400 font-black">{activeRoute.items.length} piezas listas</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md mx-auto w-full space-y-3">
            {isEmbarcado && (
              <button 
                onClick={() => handleIniciarViaje(activeRoute.id)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition-all animate-bounce"
              >
                🚚 Iniciar Viaje (Marcar En Tránsito)
              </button>
            )}

            {isEnTransito && (
              <button 
                onClick={() => handleFinalizarEntrega(activeRoute)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl shadow-emerald-500/20 active:scale-98 transition-all"
              >
                🏁 Finalizar Entrega (Llegada a Sucursal)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista de rutas
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Mis Rutas de Entrega</h1>
        <p className="text-xs text-zinc-500 font-medium">Lista de embarques en taller o en ruta</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {rutasActivas.map(emb => (
          <div 
            key={emb.id} 
            className="glass-card p-4 hover:border-amber-500/30 transition-all cursor-pointer" 
            onClick={() => handleStartRoute(emb)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Truck size={16} className="text-amber-500" /> Viaje #{emb.id}
                </h3>
                <p className="text-[10px] text-zinc-500 font-medium">{emb.fecha_embarque}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                emb.estatus === 'en_transito' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {emb.estatus === 'en_transito' ? 'En ruta' : 'Listo en Taller'}
              </span>
            </div>
            
            <div className="bg-zinc-800/40 rounded-lg p-3 text-xs space-y-1 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Destino:</span>
                <span className="text-zinc-200 font-bold max-w-[200px] truncate">{emb.ruta_viaje || emb.cliente_nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-medium">Carga:</span>
                <span className="text-zinc-200 font-mono font-bold">{emb.items.length} piezas</span>
              </div>
            </div>

            <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-350 font-semibold py-2 rounded-lg flex justify-center items-center gap-1 text-xs transition-colors">
              Ver Detalles de Ruta <ChevronRight size={14} />
            </button>
          </div>
        ))}
        {rutasActivas.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/50">
              <Truck size={24} className="text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-550 font-semibold">No tienes rutas de entrega activas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
