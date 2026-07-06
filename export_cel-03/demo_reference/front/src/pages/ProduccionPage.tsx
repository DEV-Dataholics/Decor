import { useState, useMemo, useCallback } from 'react';
import { Clock, Play, Paintbrush, Package, Search, X, Wrench } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';
import type { WOStatus } from '../store/useStore';

const STATUS_CONFIG: Record<WOStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pendiente:      { label: 'Pendiente',     bg: 'bg-zinc-700/50',    text: 'text-zinc-400',    icon: <Clock size={14} /> },
  en_produccion:  { label: 'En Producción', bg: 'bg-blue-500/15',    text: 'text-blue-400',    icon: <Play size={14} /> },
  acabados:       { label: 'Acabados',      bg: 'bg-amber-500/15',   text: 'text-amber-400',   icon: <Paintbrush size={14} /> },
  listo_embarque: { label: 'Listo Embarque',bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: <Package size={14} /> },
};

const KANBAN_COLS: WOStatus[] = ['pendiente', 'en_produccion', 'acabados', 'listo_embarque'];

export default function ProduccionPage() {
  const { workOrders, moveWorkOrder, terminados, empleados, productos, updateProducto } = useDecor();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('lista');
  const [showQR, setShowQR] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // Assignment Modal State
  const [assignmentModalWo, setAssignmentModalWo] = useState<any | null>(null);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null);
  const [tarifaUnitaria, setTarifaUnitaria] = useState<number>(0);
  const [customMontoPago, setCustomMontoPago] = useState<number>(0);

  const filtered = useMemo(() => workOrders.filter(wo =>
    !search || wo.producto_nombre.toLowerCase().includes(search.toLowerCase()) ||
    wo.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
  ), [workOrders, search]);

  const groupedByOrder = useMemo(() => {
    const groups = new Map<number, typeof filtered>();
    filtered.forEach(wo => {
      if (!groups.has(wo.orden_id)) groups.set(wo.orden_id, []);
      groups.get(wo.orden_id)!.push(wo);
    });
    
    return Array.from(groups.entries()).map(([ordenId, items]) => {
      const isNueva = items.length > 0 && items.every(wo => wo.estatus === 'pendiente');
      return { ordenId, items, isNueva };
    }).sort((a, b) => {
      if (a.isNueva && !b.isNueva) return -1;
      if (!a.isNueva && b.isNueva) return 1;
      return b.ordenId - a.ordenId;
    });
  }, [filtered]);

  const stats = useMemo(() => {
    return {
      pendientes: workOrders.filter(wo => wo.estatus === 'pendiente').length,
      en_proceso: workOrders.filter(wo => wo.estatus === 'en_produccion' || wo.estatus === 'acabados').length,
      listos: workOrders.filter(wo => wo.estatus === 'listo_embarque').length,
    };
  }, [workOrders]);

  const toggleOrder = (id: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getNextStatus = (s: WOStatus): WOStatus | null => {
    const map: Record<WOStatus, WOStatus | null> = {
      pendiente: 'en_produccion', en_produccion: 'acabados', acabados: 'listo_embarque', listo_embarque: null
    };
    return map[s];
  };

  const getActionLabel = (s: WOStatus): string => {
    const map: Record<WOStatus, string> = { pendiente: '▶ Iniciar', en_produccion: '🎨 A Acabados', acabados: '✓ Listo', listo_embarque: '' };
    return map[s];
  };

  const handleMove = (id: number, newStatus: WOStatus) => {
    if (newStatus === 'en_produccion') {
      const wo = workOrders.find(w => w.id === id);
      if (wo) {
        setAssignmentModalWo(wo);
        const activeEmployees = empleados.filter(e => e.activo);
        const matchedEmp = activeEmployees.find(e => 
          e.especialidades.some(s => wo.producto_nombre.toLowerCase().includes(s.toLowerCase())) || 
          e.rol.toLowerCase() === (wo.producto_nombre.toLowerCase().includes('pintar') || wo.producto_nombre.toLowerCase().includes('acabado') ? 'pintor' : 'carpintero')
        ) || activeEmployees[0];
        
        setSelectedEmpleadoId(matchedEmp ? matchedEmp.id : null);
        
        const prod = productos.find(p => p.id === wo.producto_id);
        const costPerPiece = prod?.costo_produccion || 0;
        setTarifaUnitaria(costPerPiece);
        setCustomMontoPago(Number((costPerPiece * wo.cantidad).toFixed(2)));
        return;
      }
    }

    moveWorkOrder(id, newStatus);
    if (newStatus === 'listo_embarque') {
      // Show QR modal for the newly generated QR
      setTimeout(() => {
        const t = terminados.find(t => t.producto_id === workOrders.find(wo => wo.id === id)?.producto_id);
        if (t) setShowQR(t.qr_code);
      }, 100);
    }
  };

  const handleConfirmAssignment = () => {
    if (!assignmentModalWo || !selectedEmpleadoId || tarifaUnitaria <= 0) return;
    const emp = empleados.find(e => e.id === selectedEmpleadoId);
    if (!emp) return;

    const prod = productos.find(p => p.id === assignmentModalWo.producto_id);
    if (prod && prod.costo_produccion !== tarifaUnitaria) {
      updateProducto(prod.id, { costo_produccion: tarifaUnitaria });
    }

    moveWorkOrder(assignmentModalWo.id, 'en_produccion', {
      empleado_id: emp.id,
      empleado_nombre: emp.nombre,
      costo_mano_obra: Number(customMontoPago)
    });

    setAssignmentModalWo(null);
  };

  // Find QR data for modal
  const qrTerminado = showQR ? terminados.find(t => t.qr_code === showQR) : null;

  return (
    <div className="space-y-5">
      {/* Semaphore Global */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`glass-card p-3 flex items-center justify-between border-l-4 ${stats.pendientes > 0 ? 'border-red-500 bg-red-500/5' : 'border-zinc-700'}`}>
          <div className="flex items-center gap-2">
            <Clock size={16} className={stats.pendientes > 0 ? 'text-red-400' : 'text-zinc-500'} />
            <div><p className="text-[10px] text-zinc-500 font-bold uppercase">En Fila</p><p className={`text-lg font-black ${stats.pendientes > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`}>{stats.pendientes}</p></div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center justify-between border-l-4 border-amber-500 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Play size={16} className="text-amber-400" />
            <div><p className="text-[10px] text-zinc-500 font-bold uppercase">En Piso</p><p className="text-lg font-black text-amber-400">{stats.en_proceso}</p></div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center justify-between border-l-4 border-emerald-500 bg-emerald-500/5">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-emerald-400" />
            <div><p className="text-[10px] text-zinc-500 font-bold uppercase">Liberadas</p><p className="text-lg font-black text-emerald-400">{stats.listos}</p></div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input type="text" placeholder="Buscar producto o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="input-dark pl-10" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X size={14} /></button>}
        </div>
        <button onClick={() => setViewMode(viewMode === 'kanban' ? 'lista' : 'kanban')} className="btn-secondary shrink-0">
          {viewMode === 'kanban' ? '☰ Lista' : '▦ Kanban'}
        </button>
      </div>

      {/* Grouped Orders Accordion */}
      <div className="space-y-4">
        {groupedByOrder.length === 0 ? (
          <p className="text-center text-sm text-zinc-600 py-8">No hay piezas en producción que coincidan con la búsqueda.</p>
        ) : groupedByOrder.map(({ordenId, items, isNueva}) => {
          const isExpanded = expandedOrders.has(ordenId);
          const clientName = items[0]?.cliente_nombre || 'Desconocido';
          
          return (
            <div key={ordenId} className={`glass-card overflow-hidden transition-all ${isNueva ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''}`}>
              <button 
                onClick={() => toggleOrder(ordenId)}
                className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isNueva ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-zinc-800/30'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${isNueva ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    <Package size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold ${isNueva ? 'text-red-100' : 'text-zinc-100'}`}>Orden #{ordenId}</h3>
                    <p className={`text-xs ${isNueva ? 'text-red-300' : 'text-zinc-500'}`}>{clientName} · {items.length} piezas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isNueva && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] tracking-wider">🔥 NUEVO</span>}
                  <div className={`text-xs font-bold px-3 py-1 rounded-full ${isNueva ? 'bg-red-900/50 text-red-300' : 'bg-zinc-800 text-zinc-500'}`}>
                    {isExpanded ? 'Ocultar' : 'Expandir'}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-700/30 bg-zinc-900/30 p-4">
                  {viewMode === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {KANBAN_COLS.map(status => {
                        const col = items.filter(wo => wo.estatus === status);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <div key={status} className="bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-700/30">
                            <div className={`px-3 py-2 border-b border-zinc-700/30 flex items-center justify-between ${cfg.bg}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={cfg.text}>{cfg.icon}</span>
                                <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
                              </div>
                              <span className={`text-[9px] font-bold ${cfg.text} ${cfg.bg} px-1.5 rounded-full`}>{col.length}</span>
                            </div>
                            <div className="p-2 space-y-2">
                              {col.length === 0 ? (
                                <p className="text-[9px] text-zinc-600 text-center py-2">Vacío</p>
                              ) : col.map(wo => (
                                <div key={wo.id} className="bg-zinc-900/60 rounded-lg p-2 border border-zinc-700/50 space-y-1.5">
                                  <p className="text-[11px] font-semibold text-zinc-200 leading-tight">{wo.producto_nombre}</p>
                                  <p className="text-[9px] text-zinc-500">{wo.codigo_sku} · Qty: {wo.cantidad}</p>
                                  <div className="flex justify-between items-center text-[9px]">
                                    <span className="text-amber-400 font-medium">{wo.acabado_nombre}</span>
                                    {wo.empleado_nombre && <span className="text-emerald-400 font-bold">💰 ${wo.costo_mano_obra}</span>}
                                  </div>
                                  {wo.empleado_nombre && (
                                    <p className="text-[8px] text-zinc-500 italic truncate mt-0.5">👤 {wo.empleado_nombre}</p>
                                  )}
                                  {getNextStatus(wo.estatus) && (
                                    <button
                                      onClick={() => handleMove(wo.id, getNextStatus(wo.estatus)!)}
                                      className="w-full text-center py-1 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all mt-1"
                                    >
                                      {getActionLabel(wo.estatus)}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-zinc-800/20 rounded-xl overflow-hidden border border-zinc-700/30">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-zinc-800/40 border-b border-zinc-700/30 text-[9px] font-semibold text-zinc-500 uppercase">
                        <div className="col-span-4">Producto</div>
                        <div className="col-span-2">Acabado</div>
                        <div className="col-span-2">Qty</div>
                        <div className="col-span-2">Estado</div>
                        <div className="col-span-2 text-right">Acción</div>
                      </div>
                      {items.map(wo => {
                        const cfg = STATUS_CONFIG[wo.estatus];
                        const next = getNextStatus(wo.estatus);
                        return (
                          <div key={wo.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-zinc-800/30 hover:bg-zinc-800/40 transition-colors items-center">
                            <div className="col-span-4">
                              <p className="text-[11px] font-semibold text-zinc-200 truncate">{wo.producto_nombre}</p>
                              <p className="text-[9px] text-zinc-600">
                                {wo.codigo_sku}
                                {wo.empleado_nombre && <span className="text-zinc-500 font-medium"> · 👤 {wo.empleado_nombre} (${wo.costo_mano_obra})</span>}
                              </p>
                            </div>
                            <div className="col-span-2 text-[10px] text-amber-400">{wo.acabado_nombre}</div>
                            <div className="col-span-2 text-[10px] text-zinc-300">{wo.cantidad}</div>
                            <div className="col-span-2"><span className={`${cfg.bg} ${cfg.text} px-2 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-1`}>{cfg.label}</span></div>
                            <div className="col-span-2 text-right">
                              {next ? <button onClick={() => handleMove(wo.id, next)} className="px-2 py-1 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25">{getActionLabel(wo.estatus)}</button>
                                : <span className="text-[9px] text-emerald-400 font-bold">✓ Listo</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* QR Modal */}
      {showQR && qrTerminado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 animate-scale-in text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Package size={28} />
            </div>
            <h3 className="text-lg font-bold text-zinc-100">¡Pieza Listo!</h3>
            <p className="text-xs text-zinc-500">Etiqueta QR generada para esta pieza</p>
            <QRLabel
              qrCode={qrTerminado.qr_code}
              productoNombre={qrTerminado.producto_nombre}
              ordenId={qrTerminado.orden_id}
              clienteNombre={qrTerminado.cliente_nombre}
              acabado={qrTerminado.acabado}
              size={120}
            />
            <button onClick={() => setShowQR(null)} className="btn-primary w-full justify-center">Cerrar</button>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignmentModalWo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 animate-scale-in text-left space-y-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <Wrench size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-100">Iniciar Producción</h3>
              <p className="text-xs text-zinc-500">Asigna un empleado y define el pago por este trabajo.</p>
            </div>
            
            <div className="bg-zinc-800/40 rounded-xl p-3 text-xs space-y-2 border border-zinc-700/20">
              <p className="font-bold text-zinc-200">{assignmentModalWo.producto_nombre}</p>
              <div className="flex justify-between text-zinc-500"><span>SKU:</span><span className="font-mono text-zinc-400">{assignmentModalWo.codigo_sku}</span></div>
              <div className="flex justify-between text-zinc-500"><span>Cantidad:</span><span className="font-bold text-zinc-300">{assignmentModalWo.cantidad} piezas</span></div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Seleccionar Empleado</label>
                <select 
                  value={selectedEmpleadoId || ''} 
                  onChange={e => setSelectedEmpleadoId(Number(e.target.value))}
                  className="input-dark w-full"
                >
                  <option value="" disabled>Seleccione un trabajador...</option>
                  {empleados.filter(e => e.activo).map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-zinc-900 capitalize">
                      {emp.nombre} ({emp.rol})
                    </option>
                  ))}
                </select>
              </div>

              {tarifaUnitaria === 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-[10px] leading-relaxed animate-pulse">
                  ⚠️ Esta pieza no tiene un costo de producción registrado en el catálogo. Define la tarifa por pieza para poder asignar el trabajo.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Tarifa por Pieza ($)</label>
                  <input 
                    type="number" 
                    value={tarifaUnitaria || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setTarifaUnitaria(val);
                      setCustomMontoPago(Number((val * assignmentModalWo.cantidad).toFixed(2)));
                    }}
                    onFocus={e => e.target.select()}
                    className="input-dark w-full font-bold text-amber-400"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Pago Total ($)</label>
                  <input 
                    type="number" 
                    value={customMontoPago || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCustomMontoPago(val);
                      if (assignmentModalWo.cantidad > 0) {
                        setTarifaUnitaria(Number((val / assignmentModalWo.cantidad).toFixed(2)));
                      }
                    }}
                    onFocus={e => e.target.select()}
                    className="input-dark w-full font-bold text-emerald-400"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <p className="text-[9px] text-zinc-500">
                Los campos están vinculados. Modificar cualquiera calculará el otro para un lote de {assignmentModalWo.cantidad} {assignmentModalWo.cantidad === 1 ? 'pieza' : 'piezas'}.
              </p>
            </div>

            <div className="flex gap-2.5 pt-3">
              <button onClick={() => setAssignmentModalWo(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button 
                onClick={handleConfirmAssignment} 
                disabled={!selectedEmpleadoId || tarifaUnitaria <= 0}
                className="btn-primary flex-1 justify-center disabled:opacity-40"
              >
                ✓ Asignar e Iniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
