import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Clock, Play, Paintbrush, Package, Search, X, Wrench, ChevronLeft, ChevronRight, Printer, CheckCircle } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';
import { QRCodeSVG } from 'qrcode.react';
import type { WOStatus } from '../store/useStore';

const STATUS_CONFIG: Record<WOStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pendiente:      { label: 'Pendiente',     bg: 'bg-stone-100',  text: 'text-stone-700',   icon: <Clock size={14} /> },
  en_produccion:  { label: 'En Taller',     bg: 'bg-amber-50',   text: 'text-amber-800',  icon: <Play size={14} /> },
  acabados:       { label: 'Acabados',      bg: 'bg-indigo-50',  text: 'text-indigo-800', icon: <Paintbrush size={14} /> },
  listo_embarque: { label: 'Listo Envíos',  bg: 'bg-teal-50',    text: 'text-teal-800',   icon: <Package size={14} /> },
};

const KANBAN_COLS: WOStatus[] = ['pendiente', 'en_produccion', 'acabados', 'listo_embarque'];

export default function ProduccionPage() {
  const { workOrders, moveWorkOrder, terminados, empleados, productos, updateProducto, pedidos, clientes, tiendas } = useDecor();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('lista');
  const [printGridData, setPrintGridData] = useState<{ ordenId: number, itemsList: typeof terminados } | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const gridPrintRef = useRef<HTMLDivElement>(null);

  // Assignment Modal State
  const [assignmentModalWo, setAssignmentModalWo] = useState<any | null>(null);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null);
  const [tarifaUnitaria, setTarifaUnitaria] = useState<number>(0);
  const [customMontoPago, setCustomMontoPago] = useState<number>(0);
  const [cantidadAsignar, setCantidadAsignar] = useState<number>(0);
  const [targetAssignmentStatus, setTargetAssignmentStatus] = useState<WOStatus>('en_produccion');

  const handleEmployeeChange = (empId: number) => {
    setSelectedEmpleadoId(empId);
    const emp = empleados.find(e => e.id === empId);
    if (!emp || !assignmentModalWo) return;
    
    let rate = 0;
    if (targetAssignmentStatus === 'acabados') {
      rate = emp.tarifa_base || 0;
    } else {
      const prod = productos.find(p => p.id === assignmentModalWo.producto_id);
      rate = prod?.costo_produccion || 0;
    }
    setTarifaUnitaria(rate);
    setCustomMontoPago(Number((rate * cantidadAsignar).toFixed(2)));
  };

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
    const map: Record<WOStatus, string> = { pendiente: '▶ Iniciar Taller', en_produccion: '🎨 A Acabados', acabados: '✓ Liberar', listo_embarque: '' };
    return map[s];
  };

  const handleMove = (id: number, newStatus: WOStatus) => {
    if (newStatus === 'en_produccion' || newStatus === 'acabados') {
      const wo = workOrders.find(w => w.id === id);
      if (wo) {
        setAssignmentModalWo(wo);
        setTargetAssignmentStatus(newStatus);
        const activeEmployees = empleados.filter(e => e.activo);
        
        const isAcabado = newStatus === 'acabados';
        const matchedEmp = activeEmployees.find(e => {
          if (isAcabado) {
            return e.rol.toLowerCase() === 'pintor' || e.especialidades.some(s => s.toLowerCase() === 'acabados');
          } else {
            return e.rol.toLowerCase() === 'carpintero' || e.especialidades.some(s => wo.producto_nombre.toLowerCase().includes(s.toLowerCase()));
          }
        }) || activeEmployees[0];
        
        setSelectedEmpleadoId(matchedEmp ? matchedEmp.id : null);
        
        let suggestedTarifa = 0;
        if (isAcabado) {
          suggestedTarifa = matchedEmp?.tarifa_base || 0;
        } else {
          const prod = productos.find(p => p.id === wo.producto_id);
          suggestedTarifa = prod?.costo_produccion || 0;
        }
        
        setTarifaUnitaria(suggestedTarifa);
        setCustomMontoPago(Number((suggestedTarifa * wo.cantidad).toFixed(2)));
        setCantidadAsignar(wo.cantidad);
        return;
      }
    }

    moveWorkOrder(id, newStatus);
  };

  const handleConfirmAssignment = () => {
    if (!assignmentModalWo || !selectedEmpleadoId || tarifaUnitaria <= 0 || cantidadAsignar <= 0) return;
    const emp = empleados.find(e => e.id === selectedEmpleadoId);
    if (!emp) return;

    if (targetAssignmentStatus === 'en_produccion') {
      const prod = productos.find(p => p.id === assignmentModalWo.producto_id);
      if (prod && prod.costo_produccion !== tarifaUnitaria) {
        updateProducto(prod.id, { costo_produccion: tarifaUnitaria });
      }
    }

    moveWorkOrder(assignmentModalWo.id, targetAssignmentStatus, {
      empleado_id: emp.id,
      empleado_nombre: emp.nombre,
      costo_mano_obra: Number(customMontoPago),
      cantidad_asignada: cantidadAsignar,
      costo_mano_obra_unitario: tarifaUnitaria
    });

    setAssignmentModalWo(null);
  };

  const getPrintablePiecesForOrder = (ordenId: number) => {
    const finished = terminados.filter(t => t.orden_id === ordenId);
    if (finished.length > 0) return finished;

    const orderWOs = workOrders.filter(wo => wo.orden_id === ordenId);
    const generated: typeof terminados = [];
    let idCounter = Date.now();
    orderWOs.forEach(wo => {
      const prod = productos.find(p => p.id === wo.producto_id);
      const price = prod ? Object.values(prod.prices)[0] || 200 : 200;
      for (let j = 0; j < wo.cantidad; j++) {
        generated.push({
          id: idCounter++,
          qr_code: `DCR-TEMP-${Date.now()}-${wo.id}-${j}`,
          producto_id: wo.producto_id,
          producto_nombre: wo.producto_nombre,
          codigo_sku: wo.codigo_sku,
          orden_id: wo.orden_id,
          cliente_nombre: wo.cliente_nombre || 'Cliente',
          acabado: wo.acabado_nombre || 'Natural',
          fecha_listo: new Date().toISOString().split('T')[0],
          precio_estimado: price
        });
      }
    });
    return generated;
  };

  const printOrderTicket = (ordenId: number) => {
    const pedido = pedidos.find(p => p.id === ordenId);
    if (!pedido) return;

    const isTiendaOrder = pedido.tipo_orden === 'resurtido_tienda' || tiendas.some(t => t.id === pedido.cliente_id && t.nombre === pedido.cliente_nombre);
    const cliente = clientes.find(c => c.id === pedido.cliente_id);
    const tienda = tiendas.find(t => t.id === pedido.cliente_id);
    const destinoCiudad = isTiendaOrder ? tienda?.ciudad : cliente?.ciudad;
    const destinoTel = isTiendaOrder ? '' : cliente?.telefono;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Orden #${pedido.id}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 80mm; padding: 4mm; margin: 0; color: black; background: white; box-sizing: border-box; }
            .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px; }
            .invoice-no { text-align: right; font-weight: bold; margin-bottom: 10px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
            th, td { text-align: left; padding: 4px 1px; font-size: 10px; vertical-align: top; word-wrap: break-word; }
            th { border-bottom: 1px solid black; border-top: 1px solid black; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .totals { display: flex; flex-direction: column; align-items: flex-end; width: 100%; }
            .totals-row { display: flex; justify-content: space-between; width: 60%; margin-bottom: 2px; font-size: 10px; }
            .totals-row span:first-child { text-align: right; padding-right: 10px; flex-grow: 1; }
            .totals-row span:last-child { width: 50px; text-align: right; }
            .bold { font-weight: bold; }
            .total-final { border-top: 1px solid black; border-bottom: 1px solid black; padding: 3px 0; font-size: 11px; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="header">DECOR MUEBLERÍA</div>
          <div class="invoice-no">Orden de Fabricación #${pedido.id}</div>
          <div style="display: flex; gap: 5px; font-size: 10px; margin-bottom: 5px;">
            <div style="width: 60%;">
              <div><strong style="display:inline-block; width:50px;">Cliente:</strong> ${pedido.cliente_nombre}</div>
              <div><strong style="display:inline-block; width:50px;">Ciudad:</strong> ${destinoCiudad || '-'}</div>
            </div>
            <div style="width: 40%; border-left: 1px solid black; padding-left: 5px;">
              <div><strong>Fecha:</strong> ${pedido.fecha_creacion}</div>
              <div><strong>Tel:</strong> ${destinoTel || '-'}</div>
            </div>
          </div>
          <table>
            <thead><tr><th style="width: 20%">SKU</th><th class="center" style="width: 12%">Cant</th><th style="width: 48%">Descripción</th><th class="right" style="width: 20%">TOTAL</th></tr></thead>
            <tbody>
              ${pedido.items.map(item => `<tr><td>${item.codigo_sku || '-'}</td><td class="center">${item.cantidad}</td><td>${item.producto_nombre}${item.acabado ? `<br/><small>${item.acabado}</small>` : ''}</td><td class="right">$${(item.precio_unitario * item.cantidad).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row bold total-final"><span>TOTAL</span><span>$${pedido.total.toFixed(2)}</span></div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintEtiquetasGrid = (ordenId: number) => {
    const printableItems = getPrintablePiecesForOrder(ordenId);
    if (printableItems.length === 0) return;

    setPrintGridData({ ordenId, itemsList: printableItems });

    setTimeout(() => {
      const w = window.open('', '_blank');
      if (!w) {
        setPrintGridData(null);
        return;
      }

      const qrHtmlContent = gridPrintRef.current?.innerHTML || '';

      const css = `
        @page { size: letter; margin: 0; }
        body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; }
        .avery-page { width: 8.5in; height: 11in; box-sizing: border-box; padding: 0.5in; page-break-after: always; break-after: page; display: grid; grid-template-columns: 2.25in 2.25in 2.25in; grid-template-rows: repeat(8, 1.25in); column-gap: 0.375in; row-gap: 0in; overflow: hidden; }
        .label-card { width: 2.25in; height: 1.25in; box-sizing: border-box; padding: 0.1in 0.15in; display: flex; align-items: center; border: 1px dashed #e4e4e7; overflow: hidden; }
        .qr-container { width: 0.95in; height: 0.95in; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-container svg { width: 100%; height: 100%; }
        .info-container { margin-left: 0.1in; display: flex; flex-direction: column; justify-content: center; flex-grow: 1; overflow: hidden; }
        .info-title { font-size: 8px; font-weight: 900; text-transform: uppercase; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .info-subtitle { font-size: 6.5px; margin: 0 0 1px 0; line-height: 1.1; }
        .info-qr-text { font-family: monospace; font-size: 5.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `;

      w.document.write(`
        <html>
          <head><title>Imprimir Etiquetas en Lote - Orden #${ordenId}</title><style>${css}</style></head>
          <body>${qrHtmlContent}<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 250); };</script></body>
        </html>
      `);
      w.document.close();
      setPrintGridData(null);
    }, 150);
  };

  return (
    <div className="space-y-5 text-left">
      {/* Semáforo Global */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center justify-between ${stats.pendientes > 0 ? 'border-rose-300 bg-rose-50/50' : 'border-stone-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stats.pendientes > 0 ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-600'}`}>
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">En Espera</p>
              <p className={`text-xl font-black ${stats.pendientes > 0 ? 'text-rose-700' : 'text-stone-800'}`}>{stats.pendientes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Play size={18} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">En Piso / Taller</p>
              <p className="text-xl font-black text-amber-800">{stats.en_proceso}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Liberadas</p>
              <p className="text-xl font-black text-teal-800">{stats.listos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Selector de Vista */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por producto, cliente o SKU..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]" 
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
          <button 
            onClick={() => setViewMode('lista')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'lista' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            ☰ Lista
          </button>
          <button 
            onClick={() => setViewMode('kanban')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            ▦ Kanban
          </button>
        </div>
      </div>

      {/* Grupos de Órdenes */}
      <div className="space-y-4">
        {groupedByOrder.length === 0 ? (
          <p className="text-center text-xs text-stone-400 py-12">No hay piezas en producción que coincidan con la búsqueda.</p>
        ) : groupedByOrder.map(({ordenId, items, isNueva}) => {
          const isExpanded = expandedOrders.has(ordenId);
          const clientName = items[0]?.cliente_nombre || 'Desconocido';
          
          return (
            <div key={ordenId} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${isNueva ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'}`}>
              <div 
                onClick={() => toggleOrder(ordenId)}
                className={`w-full px-5 py-4 flex items-center justify-between transition-colors cursor-pointer ${isNueva ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-stone-50/70'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${isNueva ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-teal-800 border border-teal-200'}`}>
                    <Package size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                      Orden #{ordenId}
                      {isNueva && <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase border border-amber-200">🔥 Nueva</span>}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">{clientName} · {items.reduce((sum, wo) => sum + (wo.cantidad || 1), 0)} piezas en producción</p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => printOrderTicket(ordenId)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl border border-stone-200 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs"
                    title="Imprimir Ticket de Pedido (80mm)"
                  >
                    <Printer size={13} /> Ticket
                  </button>
                  
                  <button
                    onClick={() => handlePrintEtiquetasGrid(ordenId)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs"
                    title="Imprimir Etiquetas Adhesivas"
                  >
                    <Printer size={13} /> Etiquetas
                  </button>

                  <button 
                    onClick={() => toggleOrder(ordenId)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    {isExpanded ? 'Ocultar' : 'Ver Piezas'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-stone-200 bg-stone-50/50 p-4">
                  {viewMode === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {KANBAN_COLS.map(status => {
                        const col = items.filter(wo => wo.estatus === status);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <div key={status} className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
                            <div className={`px-3 py-2 border-b border-stone-200 flex items-center justify-between ${cfg.bg}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={cfg.text}>{cfg.icon}</span>
                                <span className={`text-[10px] font-black uppercase ${cfg.text}`}>{cfg.label}</span>
                              </div>
                              <span className={`text-[9px] font-black ${cfg.text} bg-white px-2 py-0.5 rounded-full border border-stone-200/60`}>{col.length}</span>
                            </div>
                            <div className="p-2.5 space-y-2">
                              {col.length === 0 ? (
                                <p className="text-[10px] text-stone-400 text-center py-4 font-medium">Sin piezas</p>
                              ) : col.map(wo => (
                                <div key={wo.id} className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-1.5">
                                  <p className="text-xs font-bold text-stone-900 leading-tight">{wo.producto_nombre}</p>
                                  <p className="text-[10px] text-stone-500 font-mono">SKU: {wo.codigo_sku} · Cant: {wo.cantidad}</p>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">{wo.acabado_nombre}</span>
                                  </div>
                                  
                                  <div className="text-[9px] text-stone-600 space-y-0.5 pt-1.5 border-t border-stone-200">
                                    {wo.empleado_nombre && (
                                      <p className="truncate">🔨 <strong className="text-stone-800">{wo.empleado_nombre}</strong> (<span className="text-teal-700 font-black">${wo.costo_mano_obra}</span>)</p>
                                    )}
                                    {wo.empleado_acabado_nombre && (
                                      <p className="truncate">🎨 <strong className="text-stone-800">{wo.empleado_acabado_nombre}</strong> (<span className="text-teal-700 font-black">${wo.costo_acabado}</span>)</p>
                                    )}
                                  </div>
                                  
                                  {getNextStatus(wo.estatus) && (
                                    <button
                                      onClick={() => handleMove(wo.id, getNextStatus(wo.estatus)!)}
                                      className="w-full text-center py-1.5 rounded-lg text-[10px] font-black bg-[#0d9488] hover:bg-[#0f766e] text-white transition-all shadow-xs mt-1"
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
                    <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs">
                      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        <div className="col-span-4">Producto</div>
                        <div className="col-span-2">Acabado</div>
                        <div className="col-span-2">Cantidad</div>
                        <div className="col-span-2">Estado Actual</div>
                        <div className="col-span-2 text-right">Acción</div>
                      </div>
                      {items.map(wo => {
                        const cfg = STATUS_CONFIG[wo.estatus];
                        const next = getNextStatus(wo.estatus);
                        return (
                          <div key={wo.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-stone-100 hover:bg-stone-50/80 transition-colors items-center text-xs">
                            <div className="col-span-4">
                              <p className="font-bold text-stone-900 truncate">{wo.producto_nombre}</p>
                              <p className="text-[10px] text-stone-500 flex flex-wrap gap-x-2 mt-0.5">
                                <span className="font-mono">{wo.codigo_sku}</span>
                                {wo.empleado_nombre && (
                                  <span className="text-stone-700 font-medium">🔨 {wo.empleado_nombre} (${wo.costo_mano_obra})</span>
                                )}
                                {wo.empleado_acabado_nombre && (
                                  <span className="text-stone-700 font-medium">🎨 {wo.empleado_acabado_nombre} (${wo.costo_acabado})</span>
                                )}
                              </p>
                            </div>
                            <div className="col-span-2 text-[11px] font-bold text-teal-800">{wo.acabado_nombre}</div>
                            <div className="col-span-2 text-stone-800 font-black font-mono">{wo.cantidad}</div>
                            <div className="col-span-2">
                              <span className={`${cfg.bg} ${cfg.text} px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 border border-stone-200/50`}>
                                {cfg.label}
                              </span>
                            </div>
                            <div className="col-span-2 text-right">
                              {next ? (
                                <button 
                                  onClick={() => handleMove(wo.id, next)} 
                                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-xs"
                                >
                                  {getActionLabel(wo.estatus)}
                                </button>
                              ) : (
                                <span className="text-xs font-black text-teal-700">✓ Listo</span>
                              )}
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

      {/* Modal de Asignación y Mano de Obra */}
      {assignmentModalWo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-left space-y-4">
            <div className="w-12 h-12 bg-teal-50 text-[#0d9488] rounded-2xl flex items-center justify-center border border-teal-200">
              <Wrench size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900">
                {targetAssignmentStatus === 'acabados' ? '🎨 Asignar Acabados y Pintura' : '🔨 Iniciar Fabricación (Carpintería)'}
              </h3>
              <p className="text-xs text-stone-500">
                {targetAssignmentStatus === 'acabados' ? 'Asigna al pintor y confirma la tarifa de acabado.' : 'Asigna al carpintero y define la tarifa por pieza.'}
              </p>
            </div>
            
            <div className="bg-stone-50 rounded-2xl p-3.5 text-xs space-y-1.5 border border-stone-200">
              <p className="font-bold text-stone-900">{assignmentModalWo.producto_nombre}</p>
              <div className="flex justify-between text-stone-500 font-mono text-[11px]"><span>SKU:</span><span className="font-bold text-stone-700">{assignmentModalWo.codigo_sku}</span></div>
              <div className="flex justify-between text-stone-500 text-[11px]"><span>Cantidad:</span><span className="font-bold text-stone-900">{assignmentModalWo.cantidad} piezas</span></div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Seleccionar Trabajador</label>
                <select 
                  value={selectedEmpleadoId || ''} 
                  onChange={e => handleEmployeeChange(Number(e.target.value))}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="" disabled>Seleccione un trabajador...</option>
                  {empleados.filter(e => e.activo).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} ({emp.rol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Cantidad a Asignar</label>
                <input 
                  type="number" 
                  value={cantidadAsignar || ''}
                  onChange={e => {
                    const val = Math.min(assignmentModalWo.cantidad, Math.max(1, Number(e.target.value)));
                    setCantidadAsignar(val);
                    setCustomMontoPago(Number((tarifaUnitaria * val).toFixed(2)));
                  }}
                  onFocus={e => e.target.select()}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 font-mono focus:outline-none focus:border-[#0d9488]"
                  min="1"
                  max={assignmentModalWo.cantidad}
                  step="1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Tarifa por Pieza ($)</label>
                  <input 
                    type="number" 
                    value={tarifaUnitaria || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setTarifaUnitaria(val);
                      setCustomMontoPago(Number((val * cantidadAsignar).toFixed(2)));
                    }}
                    onFocus={e => e.target.select()}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 font-mono focus:outline-none focus:border-[#0d9488]"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Pago Total ($)</label>
                  <input 
                    type="number" 
                    value={customMontoPago || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setCustomMontoPago(val);
                      if (cantidadAsignar > 0) {
                        setTarifaUnitaria(Number((val / cantidadAsignar).toFixed(2)));
                      }
                    }}
                    onFocus={e => e.target.select()}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-black text-teal-700 font-mono focus:outline-none focus:border-[#0d9488]"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-stone-200">
              <button 
                onClick={() => setAssignmentModalWo(null)} 
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmAssignment} 
                disabled={!selectedEmpleadoId || tarifaUnitaria <= 0}
                className="px-4 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex-1 shadow-sm disabled:opacity-40"
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor oculto para renderizar los QRs del grid síncronamente antes de imprimir */}
      <div style={{ display: 'none' }} ref={gridPrintRef}>
        {printGridData && (() => {
          const labelGroups = [];
          for (let i = 0; i < printGridData.itemsList.length; i += 24) {
            labelGroups.push(printGridData.itemsList.slice(i, i + 24));
          }
          return labelGroups.map((group, pageIndex) => (
            <div key={pageIndex} className="avery-page">
              {group.map(item => (
                <div key={item.id} className="label-card">
                  <div className="qr-container">
                    <QRCodeSVG value={item.qr_code} size={80} level="M" />
                  </div>
                  <div className="info-container">
                    <h1 className="info-title">{item.producto_nombre}</h1>
                    <p className="info-subtitle"><strong>Ord:</strong> #{item.orden_id}</p>
                    <p className="info-subtitle"><strong>Destino:</strong> {item.cliente_nombre}</p>
                    <p className="info-subtitle"><strong>Acabado:</strong> {item.acabado}</p>
                    <p className="info-qr-text">{item.qr_code}</p>
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
