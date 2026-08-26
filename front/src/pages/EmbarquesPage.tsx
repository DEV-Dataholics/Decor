import { useState, useMemo } from 'react';
import { Truck, Package, CheckCircle2, X, Plus, MapPin, Check, Download, AlertTriangle } from 'lucide-react';
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
    <div className="space-y-5 text-left">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Listos para Embarcar', value: terminados.length, bgIcon: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Embarques Activos', value: embarques.filter(e => e.estatus !== 'entregado').length, bgIcon: 'bg-teal-50 border-teal-200 text-teal-800' },
          { label: 'En Tránsito', value: embarques.filter(e => e.estatus === 'en_transito').length, bgIcon: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
          { label: 'Entregados', value: embarques.filter(e => e.estatus === 'entregado').length, bgIcon: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className={`p-2.5 rounded-xl border ${k.bgIcon}`}><Truck size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">{k.label}</p>
              <p className="text-2xl font-black text-stone-900 mt-0.5">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador de Embarques */}
      <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-[#0d9488]" />
          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Filtrar Embarques</h4>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Fecha:</span>
            <input 
              type="date" 
              value={filtroFecha} 
              onChange={e => setFiltroFecha(e.target.value)} 
              className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]" 
            />
          </div>
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Destino:</span>
            <select
              value={filtroTiendaId}
              onChange={e => setFiltroTiendaId(e.target.value)}
              className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
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
              className="text-xs font-bold text-[#0d9488] hover:text-[#0f766e] uppercase cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        {terminados.length > 0 && (
          <button 
            onClick={() => setShowNew(true)} 
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 w-full sm:w-auto"
          >
            <Plus size={16} /> Nuevo Embarque ({terminados.length} piezas listas)
          </button>
        )}
        <button 
          onClick={exportCSV} 
          className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs w-full sm:w-auto ml-auto"
        >
          <Download size={16} /> Exportar Reporte CSV
        </button>
      </div>

      {/* Shipment list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {embarquesFiltrados.map(emb => {
          const curIdx = STATUS_TIMELINE.indexOf(emb.estatus);
          const next = nextStatus(emb.estatus);
          return (
            <div key={emb.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <Truck size={18} className="text-[#0d9488]" /> Embarque #{emb.id}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">{emb.fecha_embarque}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  emb.estatus === 'entregado' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : emb.estatus === 'en_transito' 
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {STATUS_LABEL[emb.estatus] || emb.estatus}
                </span>
              </div>

              {/* Timeline */}
              <div className="flex items-center gap-1 py-1">
                {STATUS_TIMELINE.map((step, i) => (
                  <div key={step} className="flex-1 flex items-center">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${i <= curIdx ? 'bg-[#0d9488] border-[#0d9488]' : 'border-stone-300 bg-stone-100'}`} />
                    {i < STATUS_TIMELINE.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded-full ${i < curIdx ? 'bg-[#0d9488]' : 'bg-stone-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-stone-50 rounded-xl p-3.5 text-xs space-y-1.5 border border-stone-200">
                <div className="flex justify-between"><span className="text-stone-500 font-medium">Ruta / Destino:</span><span className="text-stone-900 font-bold truncate max-w-[220px]" title={emb.ruta_viaje}>{emb.ruta_viaje || emb.cliente_nombre}</span></div>
                {emb.transportista && <div className="flex justify-between"><span className="text-stone-500 font-medium">Transportista:</span><span className="text-stone-800 font-bold">{emb.transportista}</span></div>}
                {emb.placas_trailer && <div className="flex justify-between"><span className="text-stone-500 font-medium">Placas:</span><span className="text-stone-800 font-mono font-bold">{emb.placas_trailer}</span></div>}
                <div className="flex justify-between"><span className="text-stone-500 font-medium">Piezas a Bordo:</span><span className="text-teal-700 font-black font-mono">{emb.items.length} piezas</span></div>
              </div>

              <div className="flex gap-2 pt-1">
                {emb.estatus === 'preparando' && next && (
                  <button 
                    onClick={() => updateEmbarqueStatus(emb.id, next)} 
                    className="bg-[#0d9488] hover:bg-[#0f766e] text-white py-2 rounded-xl text-xs font-black flex-1 shadow-xs transition-all"
                  >
                    ▶ Marcar como {STATUS_LABEL[next]}
                  </button>
                )}
                {emb.estatus === 'entregado' && (
                  <button 
                    onClick={() => handleStartReporte(emb.id)} 
                    className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 py-2 rounded-xl text-xs font-bold flex-1 flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" /> Ver Reporte de Entrega
                  </button>
                )}
                {emb.estatus !== 'entregado' && (
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de cancelar este embarque? Las piezas regresarán a la fila de Listos para Embarcar.')) {
                        cancelarEmbarque(emb.id);
                      }
                    }} 
                    className="bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-700 border border-stone-200 rounded-xl px-3 flex items-center justify-center transition-colors shadow-xs"
                    title="Cancelar Embarque"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {embarquesFiltrados.length === 0 && (
          <p className="col-span-2 text-center text-xs text-stone-400 py-12">
            {embarques.length === 0 
              ? "Sin embarques registrados. Crea uno a partir de piezas terminadas."
              : "No se encontraron embarques con los filtros de búsqueda aplicados."}
          </p>
        )}
      </div>

      {/* New Shipment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-in text-left">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                <Package size={18} className="text-[#0d9488]" /> Crear Nuevo Embarque
              </h3>
              <button onClick={() => setShowNew(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> Ruta de Viaje</label>
                  <input 
                    value={rutaPersonalizada} 
                    onChange={e => setRutaPersonalizada(e.target.value)} 
                    placeholder={rutaCalculada || 'Calculada por las piezas...'}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Transportista</label>
                  <input 
                    value={newTransportista} 
                    onChange={e => setNewTransportista(e.target.value)} 
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]" 
                    placeholder="Nombre del chofer" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Placas</label>
                  <input 
                    value={newPlacas} 
                    onChange={e => setNewPlacas(e.target.value)} 
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]" 
                    placeholder="ABC-1234" 
                  />
                </div>
              </div>

              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">Seleccionar piezas terminadas ({selectedTerminados.size} elegidas)</h4>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
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
                  
                  const ordenId = parseInt(key.replace(/\D/g, ''), 10);
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
                    <label key={key} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${someSelected ? 'bg-teal-50 border-teal-300' : isIncompleta ? 'bg-amber-50/50 border-amber-200' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={handleGroupToggle} 
                        className="accent-[#0d9488]" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-stone-900 truncate">
                            {key} <span className={isIncompleta ? "text-amber-800" : "text-teal-800"}>({groupItems.length} de {totalEsperadas} listas)</span>
                          </p>
                          {isIncompleta && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-200">Faltan {missingCount}</span>}
                        </div>
                        <p className="text-[10px] text-stone-500 font-medium">{first.cliente_nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black font-mono text-stone-900">${first.precio_estimado.toLocaleString('es-MX')} c/u</p>
                        <p className="text-[10px] text-stone-500">Total: ${(first.precio_estimado * groupItems.length).toLocaleString('es-MX')}</p>
                      </div>
                    </label>
                  );
                })}
                {terminados.length === 0 && <p className="text-center text-xs text-stone-400 py-8">No hay piezas terminadas disponibles en taller</p>}
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-200">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100 flex-1">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleCrearEmbarque} 
                  disabled={selectedTerminados.size === 0} 
                  className="px-5 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 flex-1 shadow-sm disabled:opacity-40"
                >
                  <Truck size={16} /> Crear Embarque ({selectedTerminados.size} piezas)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Report Modal */}
      {showReporte !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in text-left">
            {(() => {
              const emb = embarques.find(e => e.id === showReporte);
              if (!emb) return null;
              
              const okCount = emb.items.filter(i => i.estado_recepcion === 'ok').length;
              const danadoCount = emb.items.filter(i => i.estado_recepcion === 'dañado').length;
              const faltanteCount = emb.items.filter(i => i.estado_recepcion === 'faltante').length;
              
              return (
                <>
                  <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-3xl">
                    <div>
                      <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                        📋 Reporte de Entrega: Embarque #{emb.id}
                      </h3>
                      <p className="text-xs text-stone-500">Resumen y estado de recepción reportado por la sucursal</p>
                    </div>
                    <button onClick={() => setShowReporte(null)} className="text-stone-400 hover:text-stone-700">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Indicadores */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
                        <p className="text-[10px] uppercase text-emerald-800 font-black mb-1">Entregadas OK</p>
                        <p className="text-2xl font-black text-emerald-900">{okCount}</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center">
                        <p className="text-[10px] uppercase text-rose-800 font-black mb-1">Dañadas</p>
                        <p className="text-2xl font-black text-rose-900">{danadoCount}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center">
                        <p className="text-[10px] uppercase text-amber-800 font-black mb-1">Faltantes</p>
                        <p className="text-2xl font-black text-amber-900">{faltanteCount}</p>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider mt-2">Detalle de Piezas</h4>
                    <div className="space-y-2">
                      {emb.items.map((item) => (
                        <div key={item.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900">{item.producto_nombre}</p>
                            <p className="text-[10px] font-mono text-stone-500">{item.qr_code}</p>
                          </div>
                          
                          <div className="flex gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-xl border ${
                                item.estado_recepcion === 'ok' 
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                  : 'text-stone-400 bg-stone-100 border-stone-200'
                              }`}
                            >
                              ✓ OK
                            </span>
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-xl border ${
                                item.estado_recepcion === 'dañado' 
                                  ? 'bg-rose-100 text-rose-900 border-rose-300' 
                                  : 'text-stone-400 bg-stone-100 border-stone-200'
                              }`}
                            >
                              ⚠️ Dañado
                            </span>
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-xl border ${
                                item.estado_recepcion === 'faltante' 
                                  ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                  : 'text-stone-400 bg-stone-100 border-stone-200'
                              }`}
                            >
                              ✖ Faltante
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border-t border-stone-200 flex justify-end bg-stone-50 rounded-b-3xl">
                    <button onClick={() => setShowReporte(null)} className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-200 text-stone-800 hover:bg-stone-300">
                      Cerrar Reporte
                    </button>
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
