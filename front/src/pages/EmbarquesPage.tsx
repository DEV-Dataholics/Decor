import { useState, useMemo } from 'react';
import { Truck, Package, CheckCircle2, X, Plus, MapPin, Check, Download } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import type { EmbarqueItem } from '../store/useStore';

const STATUS_TIMELINE = ['preparando', 'embarcado', 'en_transito', 'entregado'];
const STATUS_LABEL: Record<string, string> = { preparando: 'Preparando', embarcado: 'Embarcado', en_transito: 'En Tránsito', entregado: 'Entregado' };

export default function EmbarquesPage() {
  const { embarques, terminados, tiendas, pedidos, crearEmbarque, updateEmbarqueStatus, cancelarEmbarque } = useDecor();
  const [showNew, setShowNew] = useState(false);
  const [showReporte, setShowReporte] = useState<number | null>(null);
  const [selectedTerminados, setSelectedTerminados] = useState<Set<number>>(new Set());
  const [rutaPersonalizada, setRutaPersonalizada] = useState('');
  const [newTransportista, setNewTransportista] = useState('');
  const [newPlacas, setNewPlacas] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroTiendaId, setFiltroTiendaId] = useState<string | number>('todas');

  const embarquesFiltrados = useMemo(() => {
    return embarques.filter(emb => {
      if (filtroFecha && emb.fecha_embarque !== filtroFecha) {
        return false;
      }
      if (filtroTiendaId !== 'todas') {
        const destId = Number(filtroTiendaId);
        const matchesTienda = emb.tienda_destino_id === destId || emb.items.some(item => item.tienda_destino_id === destId);
        if (!matchesTienda) return false;
      }
      return true;
    });
  }, [embarques, filtroFecha, filtroTiendaId]);

  const rutaCalculada = useMemo(() => {
    const clientesSet = new Set<string>();
    terminados.forEach(t => {
      if (selectedTerminados.has(t.id)) clientesSet.add(t.cliente_nombre);
    });
    return Array.from(clientesSet).join(' → ');
  }, [selectedTerminados, terminados]);

  const rutaFinal = rutaPersonalizada || rutaCalculada;

  const handleCrearEmbarque = () => {
    if (selectedTerminados.size === 0) return;
    const items: EmbarqueItem[] = terminados
      .filter(t => selectedTerminados.has(t.id))
      .map(t => {
        const pedido = pedidos.find(p => p.id === t.orden_id);
        const isTiendaOrder = pedido?.tipo_orden === 'resurtido_tienda' || tiendas.some(ti => ti.id === pedido?.cliente_id && ti.nombre === pedido?.cliente_nombre);
        const tiendaDestinoId = isTiendaOrder ? (pedido?.cliente_id || 0) : 0;
        
        return {
          id: Date.now() + Math.random(),
          producto_id: t.producto_id,
          producto_nombre: t.producto_nombre,
          codigo_sku: t.codigo_sku,
          qr_code: t.qr_code,
          precio_unitario: t.precio_estimado,
          embarcado: true,
          recibido_en_tienda: false,
          original_terminado: t,
          tienda_destino_id: tiendaDestinoId,
          cliente_nombre: t.cliente_nombre,
        };
      });

    crearEmbarque({
      orden_id: 0,
      ruta_viaje: rutaFinal,
      fecha_embarque: new Date().toISOString().split('T')[0],
      placas_trailer: newPlacas,
      transportista: newTransportista,
      estatus: 'preparando',
      items,
      cliente_nombre: '',
      tienda_destino_id: items.find(i => i.tienda_destino_id > 0)?.tienda_destino_id || 0,
    });
    setShowNew(false);
    setSelectedTerminados(new Set());
    setNewTransportista('');
    setNewPlacas('');
    setRutaPersonalizada('');
  };

  const handleStartReporte = (embarqueId: number) => {
    setShowReporte(embarqueId);
  };

  const nextStatus = (current: string) => {
    const idx = STATUS_TIMELINE.indexOf(current);
    return idx >= 0 && idx < STATUS_TIMELINE.length - 1 ? STATUS_TIMELINE[idx + 1] : null;
  };

  const exportCSV = () => {
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    
    const rows = [
      ['ID Embarque', 'Fecha', 'Cliente/Destino', 'Estatus Embarque', 'Transportista', 'Placas', 'ID Pieza (QR)', 'SKU', 'Producto', 'Estado Entrega', 'Precio Unitario']
    ];
    
    embarques.forEach(emb => {
      const destino = emb.ruta_viaje || emb.cliente_nombre || '';
      
      if (emb.items.length === 0) {
        rows.push([
          `="${emb.id}"`, emb.fecha_embarque, escapeCsv(destino), emb.estatus,
          escapeCsv(emb.transportista || ''), escapeCsv(emb.placas_trailer || ''),
          '-', '-', '-', '-', '0'
        ]);
        return;
      }

      emb.items.forEach(item => {
        rows.push([
          `="${emb.id}"`,
          emb.fecha_embarque,
          escapeCsv(destino),
          emb.estatus,
          escapeCsv(emb.transportista || ''),
          escapeCsv(emb.placas_trailer || ''),
          escapeCsv(item.qr_code),
          escapeCsv(item.codigo_sku),
          escapeCsv(item.producto_nombre),
          emb.estatus === 'entregado' ? (item.estado_recepcion || 'Sin Reporte').toUpperCase() : '-',
          item.precio_unitario.toString()
        ]);
      });
    });

    const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `embarques_historico_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Listos para Embarcar', value: terminados.length, color: 'text-amber-400 bg-amber-500/15' },
          { label: 'Embarques Activos', value: embarques.filter(e => e.estatus !== 'entregado').length, color: 'text-blue-400 bg-blue-500/15' },
          { label: 'En Tránsito', value: embarques.filter(e => e.estatus === 'en_transito').length, color: 'text-purple-400 bg-purple-500/15' },
          { label: 'Entregados', value: embarques.filter(e => e.estatus === 'entregado').length, color: 'text-emerald-400 bg-emerald-500/15' },
        ].map((k, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${k.color}`}><Truck size={18} /></div>
            <div><p className="text-[10px] font-semibold text-zinc-500 uppercase">{k.label}</p><p className="text-xl font-bold text-zinc-100">{k.value}</p></div>
          </div>
        ))}
      </div>

      {/* Buscador de Embarques */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-zinc-400" />
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Filtrar Embarques</h4>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">Fecha:</span>
            <input 
              type="date" 
              value={filtroFecha} 
              onChange={e => setFiltroFecha(e.target.value)} 
              className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">Sucursal Destino:</span>
            <select
              value={filtroTiendaId}
              onChange={e => setFiltroTiendaId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="todas">Todas las Sucursales</option>
              {tiendas.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          {(filtroFecha || filtroTiendaId !== 'todas') && (
            <button
              onClick={() => { setFiltroFecha(''); setFiltroTiendaId('todas'); }}
              className="text-[10px] font-bold text-[#c2703e] hover:text-[#c2703e]/80 transition-colors uppercase cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {terminados.length > 0 && (
          <button onClick={() => setShowNew(true)} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none justify-center"><Plus size={16} /> Nuevo Embarque</button>
        )}
        <button onClick={exportCSV} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none justify-center ml-auto"><Download size={16} /> Exportar CSV</button>
      </div>

      {/* Shipment list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {embarquesFiltrados.map(emb => {
          const curIdx = STATUS_TIMELINE.indexOf(emb.estatus);
          const next = nextStatus(emb.estatus);
          return (
            <div key={emb.id} className="glass-card p-5 space-y-3 hover:border-amber-500/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Truck size={16} className="text-amber-400" /> Ruta #{emb.id}</h3>
                  <p className="text-[10px] text-zinc-500">{emb.fecha_embarque}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${emb.estatus === 'entregado' ? 'bg-emerald-500/15 text-emerald-400' : emb.estatus === 'en_transito' ? 'bg-purple-500/15 text-purple-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {STATUS_LABEL[emb.estatus] || emb.estatus}
                </span>
              </div>
              {/* Timeline */}
              <div className="flex items-center gap-1">
                {STATUS_TIMELINE.map((step, i) => (
                  <div key={step} className="flex-1 flex items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${i <= curIdx ? 'bg-amber-500 border-amber-500' : 'border-zinc-700 bg-zinc-800'}`} />
                    {i < STATUS_TIMELINE.length - 1 && <div className={`flex-1 h-0.5 mx-0.5 ${i < curIdx ? 'bg-amber-500' : 'bg-zinc-700'}`} />}
                  </div>
                ))}
              </div>
              <div className="bg-zinc-800/40 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-zinc-500">Ruta de Viaje:</span><span className="text-zinc-300 font-bold truncate max-w-[200px]" title={emb.ruta_viaje}>{emb.ruta_viaje || emb.cliente_nombre}</span></div>
                {emb.transportista && <div className="flex justify-between"><span className="text-zinc-500">Transportista:</span><span className="text-zinc-300">{emb.transportista}</span></div>}
                {emb.placas_trailer && <div className="flex justify-between"><span className="text-zinc-500">Placas:</span><span className="text-zinc-300 font-mono">{emb.placas_trailer}</span></div>}
                <div className="flex justify-between"><span className="text-zinc-500">Piezas:</span><span className="text-zinc-300 font-bold">{emb.items.length}</span></div>
              </div>
              <div className="flex gap-2">
                {emb.estatus === 'preparando' && next && (
                  <button onClick={() => updateEmbarqueStatus(emb.id, next)} className="btn-primary text-xs flex-1 justify-center">{STATUS_LABEL[next]}</button>
                )}
                {emb.estatus === 'entregado' && (
                  <button onClick={() => handleStartReporte(emb.id)} className="btn-secondary text-xs flex-1 justify-center"><CheckCircle2 size={14} /> Ver Reporte de Entrega</button>
                )}
                {emb.estatus !== 'entregado' && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de cancelar este embarque? Las piezas regresarán a la fila de Listos para Embarcar.')) {
                        cancelarEmbarque(emb.id);
                      }
                    }} 
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-3 flex items-center justify-center transition-colors"
                    title="Cancelar Embarque"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {embarquesFiltrados.length === 0 && (
          <p className="col-span-2 text-center text-sm text-zinc-600 py-8">
            {embarques.length === 0 
              ? "Sin embarques registrados. Crea uno desde piezas terminadas."
              : "No se encontraron embarques con los filtros de búsqueda aplicados."}
          </p>
        )}
      </div>

      {/* New Shipment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center sticky top-0 bg-zinc-800/90 backdrop-blur-sm z-10">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2"><Package size={18} className="text-amber-400" /> Crear Embarque</h3>
              <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> Ruta de Viaje</label>
                  <input 
                    value={rutaPersonalizada} 
                    onChange={e => setRutaPersonalizada(e.target.value)} 
                    placeholder={rutaCalculada || 'Calculada por las piezas...'}
                    className="input-dark w-full"
                  />
                  <p className="text-[9px] text-zinc-500 mt-1">Se calcula automáticamente al elegir piezas.</p>
                </div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Transportista</label><input value={newTransportista} onChange={e => setNewTransportista(e.target.value)} className="input-dark" placeholder="Nombre" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Placas</label><input value={newPlacas} onChange={e => setNewPlacas(e.target.value)} className="input-dark font-mono" placeholder="ABC-1234" /></div>
              </div>
              <h4 className="text-xs font-bold text-zinc-300">Seleccionar piezas ({selectedTerminados.size} seleccionadas)</h4>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                {Array.from(
                  terminados.reduce((map, t) => {
                    const key = `Orden #${t.orden_id}`;
                    if (!map.has(key)) map.set(key, []);
                    map.get(key)!.push(t);
                    return map;
                  }, new Map<string, typeof terminados>())
                ).map(([key, groupItems]) => {
                  const first = groupItems[0];
                  const allSelected = groupItems.every(t => selectedTerminados.has(t.id));
                  const someSelected = groupItems.some(t => selectedTerminados.has(t.id));
                  
                  // Calculate if the order is incomplete
                  const ordenId = parseInt(key.replace(/\\D/g, ''), 10);
                  const pedido = pedidos.find(p => p.id === ordenId);
                  const totalEsperadas = pedido ? pedido.items.reduce((s, item) => s + item.cantidad, 0) : groupItems.length;
                  const isIncompleta = groupItems.length < totalEsperadas;
                  const missingCount = totalEsperadas - groupItems.length;
                  
                  const handleGroupToggle = () => {
                    setSelectedTerminados(prev => {
                      const next = new Set(prev);
                      if (allSelected) {
                        groupItems.forEach(t => next.delete(t.id));
                      } else {
                        groupItems.forEach(t => next.add(t.id));
                      }
                      return next;
                    });
                  };

                  return (
                    <label key={key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${someSelected ? 'bg-amber-500/10 border-amber-500/30' : isIncompleta ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50' : 'bg-zinc-800/40 border-zinc-700/30 hover:border-zinc-600/50'}`}>
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={handleGroupToggle} 
                        className="accent-amber-500" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-zinc-200 truncate">
                            {key} <span className={isIncompleta ? "text-red-400" : "text-amber-400"}>({groupItems.length} de {totalEsperadas} piezas listas)</span>
                          </p>
                          {isIncompleta && <span className="bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold">⚠️ Faltan {missingCount}</span>}
                        </div>
                        <p className="text-[10px] text-zinc-500">Cliente: {first.cliente_nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-zinc-300">${first.precio_estimado.toLocaleString('es-MX')} c/u</p>
                        <p className="text-[10px] text-zinc-500">Total: ${(first.precio_estimado * groupItems.length).toLocaleString('es-MX')}</p>
                      </div>
                    </label>
                  );
                })}
                {terminados.length === 0 && <p className="text-center text-sm text-zinc-600 py-6">No hay piezas terminadas disponibles</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={handleCrearEmbarque} disabled={selectedTerminados.size === 0} className="btn-primary flex-1 justify-center disabled:opacity-40"><Truck size={14} /> Crear Embarque ({selectedTerminados.size} piezas)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Report Modal */}
      {showReporte !== null && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
            {(() => {
              const emb = embarques.find(e => e.id === showReporte);
              if (!emb) return null;
              
              const okCount = emb.items.filter(i => i.estado_recepcion === 'ok').length;
              const danadoCount = emb.items.filter(i => i.estado_recepcion === 'dañado').length;
              const faltanteCount = emb.items.filter(i => i.estado_recepcion === 'faltante').length;
              
              return (
                <>
                  <div className="p-4 border-b border-zinc-700/50 flex justify-between items-center bg-zinc-800/90 rounded-t-2xl">
                    <div>
                      <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                        📋 Reporte de Entrega: Embarque #{emb.id}
                      </h3>
                      <p className="text-[10px] text-zinc-400">Resumen y estado de recepción reportado por la sucursal</p>
                    </div>
                    <button onClick={() => setShowReporte(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {/* Indicadores de Resumen */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-zinc-900/60 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">Entregadas OK</p>
                        <p className="text-lg font-black text-emerald-400">{okCount}</p>
                      </div>
                      <div className="bg-zinc-900/60 border border-red-500/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">Dañadas</p>
                        <p className="text-lg font-black text-red-400">{danadoCount}</p>
                      </div>
                      <div className="bg-zinc-900/60 border border-orange-500/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] uppercase text-zinc-500 font-bold mb-1">Faltantes</p>
                        <p className="text-lg font-black text-orange-400">{faltanteCount}</p>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-2">Detalle de Piezas</h4>
                    <div className="space-y-3">
                      {emb.items.map((item) => (
                        <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-200">{item.producto_nombre}</p>
                            <p className="text-[9px] font-mono text-zinc-500">{item.qr_code}</p>
                          </div>
                          
                          {/* Visualizador de Estado Consistente */}
                          <div className="flex gap-1.5 shrink-0 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                            <span
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                item.estado_recepcion === 'ok' 
                                  ? 'bg-emerald-500 text-black font-black' 
                                  : 'text-zinc-500 select-none'
                              }`}
                            >
                              ✓ OK
                            </span>
                            <span
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                item.estado_recepcion === 'dañado' 
                                  ? 'bg-red-500 text-white font-black' 
                                  : 'text-zinc-500 select-none'
                              }`}
                            >
                              ⚠️ Dañado
                            </span>
                            <span
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                item.estado_recepcion === 'faltante' 
                                  ? 'bg-orange-500 text-white font-black' 
                                  : 'text-zinc-500 select-none'
                              }`}
                            >
                              ✖ Faltante
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border-t border-zinc-700/50 flex justify-end bg-zinc-800/90 rounded-b-2xl">
                    <button onClick={() => setShowReporte(null)} className="btn-ghost px-6">Cerrar Reporte</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
