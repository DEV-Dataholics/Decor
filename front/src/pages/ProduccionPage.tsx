import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Clock, Play, Paintbrush, Package, Search, X, Wrench, ChevronLeft, ChevronRight, Printer, CheckCircle } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';
import { QRCodeSVG } from 'qrcode.react';
import type { WOStatus } from '../store/useStore';

const STATUS_CONFIG: Record<WOStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pendiente:      { label: 'Pendiente',     bg: 'bg-zinc-700/50',    text: 'text-zinc-400',    icon: <Clock size={14} /> },
  en_produccion:  { label: 'En Producción', bg: 'bg-blue-500/15',    text: 'text-blue-400',    icon: <Play size={14} /> },
  acabados:       { label: 'Acabados',      bg: 'bg-amber-500/15',   text: 'text-amber-400',   icon: <Paintbrush size={14} /> },
  listo_embarque: { label: 'Listo Embarque',bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: <Package size={14} /> },
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
    const map: Record<WOStatus, string> = { pendiente: '▶ Iniciar', en_produccion: '🎨 A Acabados', acabados: '✓ Listo', listo_embarque: '' };
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
            .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px; font-style: italic; }
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
          <div class="header">SILVA WOOD FACTORY</div>
          <div class="invoice-no">Invoice No &nbsp;&nbsp;&nbsp; #${pedido.id}</div>
          <div style="display: flex; gap: 5px; font-size: 10px; margin-bottom: 5px;">
            <div style="width: 60%;">
              <div><strong style="display:inline-block; width:50px;">Customer</strong> ${pedido.cliente_nombre}</div>
              <div><strong style="display:inline-block; width:50px;">City</strong> ${destinoCiudad || '-'}</div>
            </div>
            <div style="width: 40%; border-left: 1px solid black; padding-left: 5px;">
              <div><strong>Date</strong> ${pedido.fecha_creacion}</div>
              <div><strong>Phone</strong> ${destinoTel || '-'}</div>
            </div>
          </div>
          <table>
            <thead><tr><th style="width: 20%">CODE</th><th class="center" style="width: 12%">Qty</th><th style="width: 48%">Description</th><th class="right" style="width: 20%">TOTAL</th></tr></thead>
            <tbody>
              ${pedido.items.map(item => `<tr><td>${item.codigo_sku || '-'}</td><td class="center">${item.cantidad}</td><td>${item.producto_nombre}${item.acabado ? `<br/><small>${item.acabado}</small>` : ''}</td><td class="right">${(Number(item.precio_unitario || 0) * Number(item.cantidad || 0)).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>${(Number(pedido.total) || 0).toFixed(2)}</span></div>
            <div class="totals-row bold total-final"><span>TOTAL</span><span>${(Number(pedido.total) || 0).toFixed(2)}</span></div>
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

    // Aumentamos a 350ms para asegurar que React complete el render del DOM de QRs oculto
    setTimeout(() => {
      const w = window.open('', '_blank');
      if (!w) {
        setPrintGridData(null);
        return;
      }

      const qrHtmlContent = gridPrintRef.current?.innerHTML || '';

      const css = `
        @page {
          size: letter;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          background: white;
          color: black;
          font-family: Arial, Helvetica, sans-serif;
        }
        .avery-page {
          width: 8.5in;
          height: 11in;
          box-sizing: border-box;
          padding-top: 0.5in;
          padding-bottom: 0.5in;
          padding-left: 0.5in;
          padding-right: 0.5in;
          page-break-after: always;
          break-after: page;
          display: grid;
          grid-template-columns: 2.25in 2.25in 2.25in;
          grid-template-rows: 1.25in 1.25in 1.25in 1.25in 1.25in 1.25in 1.25in 1.25in;
          column-gap: 0.375in;
          row-gap: 0in;
          overflow: hidden;
        }
        .label-card {
          width: 2.25in;
          height: 1.25in;
          box-sizing: border-box;
          padding: 0.1in 0.15in;
          display: flex;
          align-items: center;
          border: 1px dashed #e4e4e7;
          overflow: hidden;
        }
        .qr-container {
          width: 0.95in;
          height: 0.95in;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .qr-container svg {
          width: 100%;
          height: 100%;
        }
        .info-container {
          margin-left: 0.1in;
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex-grow: 1;
          overflow: hidden;
        }
        .info-title {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info-subtitle {
          font-size: 6.5px;
          margin: 0 0 1px 0;
          line-height: 1.1;
        }
        .info-qr-text {
          font-family: monospace;
          font-size: 5.5px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;

      w.document.write(`
        <html>
          <head>
            <title>Imprimir Etiquetas en Lote - Orden #${ordenId}</title>
            <style>${css}</style>
          </head>
          <body>
            ${qrHtmlContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      w.document.close();
      setPrintGridData(null);
    }, 150);
  };

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
            <div key={ordenId} className={`glass-card overflow-hidden transition-all ${isNueva ? 'border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : ''}`}>
              <div 
                onClick={() => toggleOrder(ordenId)}
                className={`w-full px-5 py-4 flex items-center justify-between transition-colors cursor-pointer ${isNueva ? 'bg-orange-500/10 hover:bg-orange-500/20' : 'hover:bg-[#FAF6EE]/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${isNueva ? 'bg-orange-500/20 text-orange-600' : 'bg-[#c2703e]/15 text-[#c2703e]'}`}>
                    <Package size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className={`font-bold ${isNueva ? 'text-[#4a2818]' : 'text-[#4a2818]'}`}>Orden #{ordenId}</h3>
                    <p className={`text-xs ${isNueva ? 'text-orange-700' : 'text-zinc-550'}`}>{clientName} · {items.reduce((sum, wo) => sum + (wo.cantidad || 1), 0)} piezas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isNueva && <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.4)] tracking-wider">🔥 NUEVO</span>}
                  
                  {/* Botones de impresión rápida */}
                  <button
                    onClick={() => printOrderTicket(ordenId)}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-[#c2703e]/10 hover:text-[#c2703e] text-zinc-300 rounded-lg border border-zinc-700/50 transition-all flex items-center gap-1 text-[10px] font-bold"
                    title="Imprimir Ticket de Pedido (80mm)"
                  >
                    <Printer size={12} /> Ticket
                  </button>
                  
                  <button
                    onClick={() => handlePrintEtiquetasGrid(ordenId)}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-400 text-zinc-300 rounded-lg border border-zinc-700/50 transition-all flex items-center gap-1 text-[10px] font-bold"
                    title="Imprimir Etiquetas Adhesivas (Grid Carta 2.25x1.25)"
                  >
                    <Printer size={12} /> Etiquetas
                  </button>

                  <button 
                    onClick={() => toggleOrder(ordenId)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors ${isNueva ? 'bg-orange-200/60 text-orange-800' : 'bg-[#FAF6EE] text-[#4a2818]/60 border border-[#e8dfcb]'}`}
                  >
                    {isExpanded ? 'Ocultar' : 'Expandir'}
                  </button>
                </div>
              </div>

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
                                  </div>
                                  <div className="flex flex-col text-[8px] text-zinc-500 space-y-0.5 mt-1 border-t border-zinc-800/30 pt-1">
                                    {wo.empleado_nombre && (
                                      <p className="truncate">👤 🔨 {wo.empleado_nombre} (<span className="text-emerald-400 font-bold">${wo.costo_mano_obra}</span>)</p>
                                    )}
                                    {wo.empleado_acabado_nombre && (
                                      <p className="truncate">👤 🎨 {wo.empleado_acabado_nombre} (<span className="text-emerald-400 font-bold">${wo.costo_acabado}</span>)</p>
                                    )}
                                  </div>
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
                              <p className="text-[9px] text-zinc-650 flex flex-wrap gap-x-2 mt-0.5">
                                <span className="font-mono text-zinc-600">{wo.codigo_sku}</span>
                                {wo.empleado_nombre && (
                                  <span className="text-zinc-500 font-medium">🔨 {wo.empleado_nombre} (${wo.costo_mano_obra})</span>
                                )}
                                {wo.empleado_acabado_nombre && (
                                  <span className="text-zinc-500 font-medium">🎨 {wo.empleado_acabado_nombre} (${wo.costo_acabado})</span>
                                )}
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

      {/* Assignment Modal */}
      {assignmentModalWo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-sm p-6 animate-scale-in text-left space-y-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <Wrench size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-100">
                {targetAssignmentStatus === 'acabados' ? '🎨 Asignar Acabados y Pintura' : '🔨 Iniciar Producción (Carpintería)'}
              </h3>
              <p className="text-xs text-zinc-500">
                {targetAssignmentStatus === 'acabados' ? 'Asigna un pintor y define el pago de acabados.' : 'Asigna un carpintero y define el pago por fabricación.'}
              </p>
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
                  onChange={e => handleEmployeeChange(Number(e.target.value))}
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

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Cantidad a Asignar</label>
                <input 
                  type="number" 
                  value={cantidadAsignar || ''}
                  onChange={e => {
                    const val = Math.min(assignmentModalWo.cantidad, Math.max(1, Number(e.target.value)));
                    setCantidadAsignar(val);
                    setCustomMontoPago(Number((tarifaUnitaria * val).toFixed(2)));
                  }}
                  onFocus={e => e.target.select()}
                  className="input-dark w-full font-bold text-zinc-300"
                  min="1"
                  max={assignmentModalWo.cantidad}
                  step="1"
                />
                <p className="text-[9px] text-zinc-500 mt-1">
                  Lote disponible: {assignmentModalWo.cantidad} {assignmentModalWo.cantidad === 1 ? 'pieza' : 'piezas'}.
                </p>
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
                      setCustomMontoPago(Number((val * cantidadAsignar).toFixed(2)));
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
                      if (cantidadAsignar > 0) {
                        setTarifaUnitaria(Number((val / cantidadAsignar).toFixed(2)));
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
                Los campos están vinculados. Modificar cualquiera calculará el otro para la cantidad de {cantidadAsignar} {cantidadAsignar === 1 ? 'pieza' : 'piezas'}.
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
