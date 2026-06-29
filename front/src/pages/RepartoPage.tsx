import { useState, useMemo } from 'react';
import { useDecor } from '../store/StoreContext';
import { Truck, PackageCheck, AlertTriangle, ScanLine, X, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Embarque, EmbarqueItem } from '../store/useStore';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function RepartoPage() {
  const { embarques, confirmarRecepcion, updateEmbarqueStatus } = useDecor();
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [activeStop, setActiveStop] = useState<string | null>(null);
  
  // Scanner state
  const [scannedItems, setScannedItems] = useState<EmbarqueItem[]>([]);
  const [scanMessage, setScanMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Computed data
  const rutasActivas = useMemo(() => embarques.filter(e => e.estatus === 'en_transito' || e.estatus === 'embarcado'), [embarques]);
  const activeRoute = useMemo(() => embarques.find(e => e.id === activeRouteId), [embarques, activeRouteId]);

  const handleStartRoute = (emb: Embarque) => {
    setActiveRouteId(emb.id);
    setScannedItems(emb.items.map(i => ({ ...i, estado_recepcion: 'pendiente' as const })));
  };

  const handleScan = (codes: { rawValue: string }[]) => {
    if (codes && codes.length > 0 && codes[0].rawValue) {
      const qr = codes[0].rawValue.trim();
      processScan(qr);
    }
  };

  const processScan = (qr: string) => {
    if (!activeRoute || !activeStop) return;
    
    setScannedItems(prev => {
      const idx = prev.findIndex(i => i.qr_code === qr);
      if (idx === -1) {
        setScanMessage({ text: 'Pieza no pertenece a este viaje.', type: 'error' });
        return prev;
      }
      
      const item = prev[idx];
      const itemStop = item.cliente_nombre || 'Destino Desconocido';
      
      if (itemStop !== activeStop) {
        setScanMessage({ text: `Esta pieza es para otra parada: ${itemStop}`, type: 'error' });
        return prev;
      }

      if (item.estado_recepcion !== 'pendiente') {
        setScanMessage({ text: 'Pieza ya fue escaneada o reportada.', type: 'warning' });
        return prev;
      }

      setScanMessage({ text: `Pieza validada: ${item.producto_nombre}`, type: 'success' });
      const next = [...prev];
      next[idx] = { ...item, estado_recepcion: 'ok' as const };
      return next;
    });
    
    // Hide success message after a bit
    setTimeout(() => setScanMessage(null), 2500);
  };

  const reportarEstado = (qr: string, estado: 'dañado' | 'faltante' | 'ok') => {
    setScannedItems(prev => prev.map(i => i.qr_code === qr ? { ...i, estado_recepcion: estado } : i));
  };

  const handleTerminarRuta = () => {
    if (!activeRoute) return;
    
    // Check if any items are still pending
    const pendingCount = scannedItems.filter(i => i.estado_recepcion === 'pendiente').length;
    if (pendingCount > 0) {
      if (!window.confirm(`Faltan ${pendingCount} piezas por procesar. ¿Deseas marcarlas como faltantes y cerrar el viaje?`)) {
        return;
      }
      // Mark pendings as missing
      const finalItems = scannedItems.map(i => i.estado_recepcion === 'pendiente' ? { ...i, estado_recepcion: 'faltante' as const } : i);
      confirmarRecepcion(activeRoute.id, finalItems);
    } else {
      confirmarRecepcion(activeRoute.id, scannedItems);
    }
    
    setActiveRouteId(null);
    setScannedItems([]);
  };

  const stops = useMemo(() => {
    if (!activeRoute) return [];
    const map = new Map<string, EmbarqueItem[]>();
    for (const item of scannedItems) {
      const key = item.cliente_nombre || 'Destino Desconocido';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [activeRoute, scannedItems]);

  if (activeRoute && activeStop) {
    const stopItems = scannedItems.filter(i => (i.cliente_nombre || 'Destino Desconocido') === activeStop);
    const okCount = stopItems.filter(i => i.estado_recepcion === 'ok').length;
    const excCount = stopItems.filter(i => i.estado_recepcion === 'dañado' || i.estado_recepcion === 'faltante').length;
    const pendingCount = stopItems.filter(i => i.estado_recepcion === 'pendiente').length;
    const total = stopItems.length;

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-full bg-zinc-950 pb-20">
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Truck size={16} className="text-amber-500" /> Parada: {activeStop}</h2>
            <p className="text-[10px] text-zinc-400">Ruta #{activeRoute.id}</p>
          </div>
          <button onClick={() => setActiveStop(null)} className="text-zinc-500 hover:text-zinc-300 p-2"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Progress */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-emerald-400">{okCount} OK</span>
              <span className="text-red-400">{excCount} Exc</span>
              <span className="text-amber-400">{pendingCount} Pend</span>
              <span className="text-zinc-400">{total} Tot</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
              <div style={{ width: `${(okCount/total)*100}%` }} className="bg-emerald-500 h-full transition-all" />
              <div style={{ width: `${(excCount/total)*100}%` }} className="bg-red-500 h-full transition-all" />
              <div style={{ width: `${(pendingCount/total)*100}%` }} className="bg-amber-500 h-full transition-all" />
            </div>
          </div>

          {/* Scanner toggle */}
          {showScanner ? (
            <div className="relative max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-amber-500/50 shadow-2xl aspect-[4/3] bg-zinc-900">
              <Scanner
                onScan={handleScan}
                formats={['qr_code']}
                components={{ finder: false }}
              />
              <button 
                onClick={() => setShowScanner(false)}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-2 rounded-full text-white backdrop-blur-md transition-colors z-10"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white bg-black/60 p-1.5 backdrop-blur-md tracking-wide uppercase font-bold z-10">
                Escaneando código de entrega
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 text-lg font-bold"
            >
              <ScanLine size={24} /> Escanear Entregas
            </button>
          )}

          {scanMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-semibold animate-scale-in ${
              scanMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              scanMessage.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {scanMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              {scanMessage.text}
            </div>
          )}

          {/* List of items */}
          <div className="space-y-2 pb-10">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Piezas para {activeStop}</h3>
            {stopItems.map(item => (
              <div key={item.qr_code} className={`glass-card p-3 flex flex-col gap-2 border-l-4 ${
                item.estado_recepcion === 'ok' ? 'border-l-emerald-500 bg-emerald-500/5' :
                item.estado_recepcion === 'dañado' ? 'border-l-red-500 bg-red-500/5' :
                item.estado_recepcion === 'faltante' ? 'border-l-orange-500 bg-orange-500/5' :
                'border-l-amber-500 bg-amber-500/5'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{item.producto_nombre}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">{item.qr_code}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.estado_recepcion === 'ok' ? 'bg-emerald-500/20 text-emerald-400' :
                    item.estado_recepcion === 'dañado' ? 'bg-red-500/20 text-red-400' :
                    item.estado_recepcion === 'faltante' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.estado_recepcion}
                  </span>
                </div>
                
                {/* Actions for exceptions */}
                {item.estado_recepcion !== 'ok' && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => reportarEstado(item.qr_code, 'dañado')} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md py-1 text-[10px] font-semibold transition-colors">Dañado</button>
                    <button onClick={() => reportarEstado(item.qr_code, 'faltante')} className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-md py-1 text-[10px] font-semibold transition-colors">Faltante</button>
                    <button onClick={() => reportarEstado(item.qr_code, 'ok')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md py-1 text-[10px] font-semibold transition-colors">Escanear (OK)</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-10 shrink-0">
          <button 
            onClick={() => setActiveStop(null)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            Volver a Paradas
          </button>
        </div>
      </div>
    );
  }

  // Stops overview view
  if (activeRoute && !activeStop) {
    const isEmbarcado = activeRoute.estatus === 'embarcado';

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] md:h-full bg-zinc-950 pb-20">
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Truck size={16} className="text-amber-500" /> Ruta #{activeRoute.id}</h2>
            <p className="text-[10px] text-zinc-400 max-w-[200px] truncate">{activeRoute.ruta_viaje}</p>
          </div>
          <button onClick={() => setActiveRouteId(null)} className="text-zinc-500 hover:text-zinc-300 p-2"><X size={20} /></button>
        </div>

        {isEmbarcado ? (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6 max-w-md mx-auto w-full py-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Truck size={40} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-zinc-100">Ruta lista para iniciar</h3>
                <p className="text-xs text-zinc-500">Confirma los datos de carga del tráiler antes de salir del taller de producción.</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs space-y-3.5 shadow-inner">
                <div className="flex justify-between items-center"><span className="text-zinc-500">Itinerario:</span><span className="text-zinc-200 font-bold text-right">{activeRoute.ruta_viaje}</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-500">Transportista:</span><span className="text-zinc-200 font-semibold">{activeRoute.transportista || 'Asignado'}</span></div>
                <div className="flex justify-between items-center"><span className="text-zinc-500">Placas del tráiler:</span><span className="text-zinc-200 font-mono font-semibold">{activeRoute.placas_trailer || 'No registradas'}</span></div>
                <div className="flex justify-between items-center border-t border-zinc-800/80 pt-3"><span className="text-zinc-500">Carga total:</span><span className="text-amber-400 font-black">{activeRoute.items.length} piezas listas</span></div>
              </div>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md mx-auto w-full">
              <button 
                onClick={() => updateEmbarqueStatus(activeRoute.id, 'en_transito')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xl shadow-amber-500/20 active:scale-98 transition-all animate-bounce"
              >
                🚚 Iniciar Viaje (Marcar En Tránsito)
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <h3 className="text-sm font-bold text-zinc-100 mb-2">Paradas de esta ruta</h3>
              <div className="grid grid-cols-1 gap-3">
                {stops.map(stop => {
                  const pending = stop.items.filter(i => i.estado_recepcion === 'pendiente').length;
                  const isDone = pending === 0;

                  return (
                    <div key={stop.name} className={`glass-card p-4 transition-all cursor-pointer border-l-4 ${isDone ? 'border-l-emerald-500 hover:border-emerald-400/30' : 'border-l-amber-500 hover:border-amber-500/30'}`} onClick={() => setActiveStop(stop.name)}>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-sm font-bold text-zinc-100">{stop.name}</h4>
                        {isDone ? <CheckCircle2 size={16} className="text-emerald-500" /> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{pending} pdtes</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{stop.items.length} piezas en total</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-10 shrink-0">
              <button 
                onClick={handleTerminarRuta}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
              >
                <PackageCheck size={18} /> Finalizar Ruta Completa
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // List routes view
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Mis Rutas de Entrega</h1>
        <p className="text-xs text-zinc-500">Selecciona una ruta para comenzar el escaneo</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {rutasActivas.map(emb => (
          <div key={emb.id} className="glass-card p-4 hover:border-amber-500/30 transition-all cursor-pointer" onClick={() => handleStartRoute(emb)}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Truck size={16} className="text-amber-500" /> Viaje #{emb.id}</h3>
                <p className="text-[10px] text-zinc-500">{emb.fecha_embarque}</p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                {emb.estatus}
              </span>
            </div>
            
            <div className="bg-zinc-800/40 rounded-lg p-3 text-xs space-y-1 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Destino:</span>
                <span className="text-zinc-200 font-bold max-w-[200px] truncate">{emb.ruta_viaje || emb.cliente_nombre}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Carga:</span>
                <span className="text-zinc-200 font-mono">{emb.items.length} piezas</span>
              </div>
            </div>

            <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 rounded-lg flex justify-center items-center gap-1 text-xs transition-colors">
              Abrir Ruta <ChevronRight size={14} />
            </button>
          </div>
        ))}
        {rutasActivas.length === 0 && (
          <div className="text-center py-10 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/50">
              <Truck size={24} className="text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500 font-medium">No tienes rutas asignadas en tránsito</p>
          </div>
        )}
      </div>
    </div>
  );
}
