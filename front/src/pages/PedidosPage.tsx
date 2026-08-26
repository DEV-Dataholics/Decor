import { useState, useMemo, useRef, useCallback } from 'react';
import { ClipboardList, Plus, Search, X, Save, Image, Package, Printer, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import type { PedidoItem, TipoPedido } from '../store/useStore';

export default function PedidosPage() {
  const { pedidos, productos, clientes, tiendas, acabados, crearPedido, guardarComoProducto, editarPedido, eliminarPedido, workOrders, embarques } = useDecor();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<number | null>(null);

  // New order state
  const [destinoStr, setDestinoStr] = useState(`cliente_${clientes[0]?.id || 0}`);
  const isTienda = destinoStr.startsWith('tienda_');
  const destinoId = Number(destinoStr.split('_')[1] || 0);

  const [items, setItems] = useState<PedidoItem[]>([]);
  const [notas, setNotas] = useState('');

  // Add item state
  const [showAddItem, setShowAddItem] = useState(false);
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('linea');
  const [selectedProdId, setSelectedProdId] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [itemCant, setItemCant] = useState(1);
  const [itemAncho, setItemAncho] = useState(0);
  const [itemAlto, setItemAlto] = useState(0);
  const [itemFondo, setItemFondo] = useState(0);
  const [itemAcabado, setItemAcabado] = useState(acabados[0] || '');
  const [itemNotas, setItemNotas] = useState('');
  const [itemDiagrama, setItemDiagrama] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const getPedidoEstatus = useCallback((pedido: any) => {
    const pedidoId = typeof pedido === 'object' ? pedido.id : pedido;
    const directEstatus = typeof pedido === 'object' ? pedido.estatus : '';

    // 1. Buscar si hay embarques directos o items en embarque
    const relatedEmbarques = embarques.filter(emb => 
      emb.orden_id === pedidoId ||
      emb.items.some(item => item.orden_id === pedidoId || item.original_terminado?.orden_id === pedidoId)
    );

    if (relatedEmbarques.length > 0) {
      const statuses = relatedEmbarques.map(e => e.estatus);
      if (statuses.every(s => s === 'entregado')) {
        return { label: 'Entregado al Cliente', color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
      }
      if (statuses.some(s => s === 'en_transito' || s === 'embarcado')) {
        return { label: 'En Reparto / En Tránsito', color: 'bg-indigo-50 text-indigo-800 border border-indigo-200' };
      }
      if (statuses.some(s => s === 'preparando')) {
        return { label: 'Preparando Embarque', color: 'bg-blue-50 text-blue-800 border border-blue-200' };
      }
    }

    // 2. Usar el estatus persistido en la orden
    if (directEstatus === 'entregada') {
      return { label: 'Entregado al Cliente', color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' };
    }
    if (directEstatus === 'embarcada') {
      return { label: 'En Reparto / Embarcada', color: 'bg-indigo-50 text-indigo-800 border border-indigo-200' };
    }
    if (directEstatus === 'lista') {
      return { label: 'Listo para Embarcar', color: 'bg-teal-50 text-teal-800 border border-teal-200' };
    }
    if (directEstatus === 'en_produccion') {
      return { label: 'En Fabricación / Taller', color: 'bg-amber-50 text-amber-800 border border-amber-200' };
    }

    // 3. Evaluar work orders en taller
    const relatedWOs = workOrders.filter(wo => wo.orden_id === pedidoId);
    if (relatedWOs.length === 0) {
      return { label: 'En Cola / Confirmada', color: 'bg-stone-100 text-stone-700 border border-stone-200' };
    }

    const allReady = relatedWOs.every(wo => wo.estatus === 'listo_embarque' || (wo as any).estatus_item === 'terminado');
    if (allReady) {
      return { label: 'Listo para Embarcar', color: 'bg-teal-50 text-teal-800 border border-teal-200' };
    }

    const anyInProduction = relatedWOs.some(wo => wo.estatus === 'en_produccion' || wo.estatus === 'acabados' || (wo as any).estatus_item === 'en_produccion');
    if (anyInProduction) {
      return { label: 'En Fabricación / Taller', color: 'bg-amber-50 text-amber-800 border border-amber-200' };
    }

    return { label: 'En Cola / Confirmada', color: 'bg-stone-100 text-stone-700 border border-stone-200' };
  }, [workOrders, embarques]);

  const filtered = useMemo(() =>
    pedidos.filter(p => !search || (p.cliente_nombre || '').toLowerCase().includes(search.toLowerCase()) || p.id.toString().includes(search)),
    [pedidos, search]
  );

  const selectedCliente = !isTienda ? clientes.find(c => c.id === destinoId) : null;
  const selectedTienda = isTienda ? tiendas.find(t => t.id === destinoId) : null;

  const availableProducts = useMemo(() => {
    let prods = productos;
    if (!isTienda && selectedCliente) {
      const cliName = selectedCliente.nombre.toLowerCase();
      prods = productos.filter(p => {
        const hasClientPrice = Object.keys(p.prices || {}).some(k => cliName.includes(k.toLowerCase()) || k.toLowerCase().includes(cliName));
        return hasClientPrice;
      });
    }

    const grouped = new Map<string, typeof prods>();
    prods.forEach(p => {
      const cat = p.type || 'Otros';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(p);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [productos, selectedCliente, isTienda]);

  const selectedProd = selectedProdId ? productos.find(p => p.id === selectedProdId) : null;

  const handleSelectProduct = (id: number) => {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    setSelectedProdId(id);
    if (prod.dimensions) {
      setItemAncho(prod.dimensions.width);
      setItemAlto(prod.dimensions.height);
      setItemFondo(prod.dimensions.depth);
    }
    if (prod.finishes?.length) setItemAcabado(prod.finishes[0]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setItemDiagrama(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getPrice = (prod: typeof selectedProd) => {
    if (!prod) return 0;
    if (selectedCliente) {
      const key = Object.keys(prod.prices || {}).find(k => selectedCliente.nombre.toLowerCase().includes(k.toLowerCase()));
      return key ? prod.prices[key] : Object.values(prod.prices || {})[0] || 0;
    }
    return Object.values(prod.prices || {})[0] || 0;
  };

  const handleAddItem = () => {
    const nombre = tipoPedido === 'orden_especial' ? customName : selectedProd?.name || '';
    if (!nombre) return;
    const price = selectedProd ? getPrice(selectedProd) : 0;
    const newItem: PedidoItem = {
      id: Date.now(),
      producto_id: selectedProd?.id || 0,
      producto_nombre: nombre,
      codigo_sku: selectedProd?.sku || `ESP-${Date.now().toString(36).toUpperCase()}`,
      cantidad: itemCant,
      precio_unitario: price,
      subtotal: price * itemCant,
      tipo_pedido: tipoPedido,
      medidas: (itemAncho || itemAlto || itemFondo) ? { ancho: itemAncho, alto: itemAlto, fondo: itemFondo } : undefined,
      acabado: itemAcabado,
      notas: itemNotas || undefined,
      diagrama_url: itemDiagrama,
    };
    setItems(prev => [...prev, newItem]);
    resetItemForm();
  };

  const resetItemForm = () => {
    setShowAddItem(false);
    setTipoPedido('linea');
    setSelectedProdId(null);
    setCustomName('');
    setItemCant(1);
    setItemAncho(0); setItemAlto(0); setItemFondo(0);
    setItemAcabado(acabados[0] || '');
    setItemNotas('');
    setItemDiagrama(undefined);
  };

  const handleCrearPedido = async () => {
    if (!items.length || !destinoId) return;
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const nombre = isTienda ? selectedTienda?.nombre : selectedCliente?.nombre;
    const email = isTienda ? '' : selectedCliente?.email;
    
    if (editingPedidoId) {
      await editarPedido(editingPedidoId, {
        estatus: 'pendiente',
        tipo_orden: items.some(i => i.tipo_pedido === 'orden_especial') ? 'especial' : (isTienda ? 'resurtido_tienda' : 'mayorista'),
        cliente_id: destinoId,
        cliente_nombre: nombre || '',
        cliente_email: email || '',
        total,
        total_items: items.reduce((s, i) => s + i.cantidad, 0),
        items,
        notas,
      });
    } else {
      await crearPedido({
        fecha_creacion: new Date().toISOString().split('T')[0],
        estatus: 'pendiente',
        tipo_orden: items.some(i => i.tipo_pedido === 'orden_especial') ? 'especial' : (isTienda ? 'resurtido_tienda' : 'mayorista'),
        cliente_id: destinoId,
        cliente_nombre: nombre || '',
        cliente_email: email || '',
        total,
        total_items: items.reduce((s, i) => s + i.cantidad, 0),
        items,
        notas,
      });
    }
    cerrarFormulario();
  };

  const cerrarFormulario = () => {
    setItems([]);
    setNotas('');
    setEditingPedidoId(null);
    setShowNew(false);
    setDestinoStr(`cliente_${clientes[0]?.id || 0}`);
  };

  const isEditable = useCallback((pedidoId: number) => {
    const relatedWOs = workOrders.filter(wo => wo.orden_id === pedidoId);
    return relatedWOs.every(wo => wo.estatus === 'pendiente');
  }, [workOrders]);

  const handleBorrar = (id: number) => {
    if (confirm('¿Estás seguro de que deseas borrar este pedido? Se eliminarán también las órdenes de producción pendientes asociadas.')) {
      eliminarPedido(id);
    }
  };

  const handleAbrirEdicion = (pedido: typeof pedidos[0]) => {
    setEditingPedidoId(pedido.id);
    setDestinoStr(pedido.tipo_orden === 'resurtido_tienda' ? `tienda_${pedido.cliente_id}` : `cliente_${pedido.cliente_id}`);
    setItems(pedido.items);
    setNotas(pedido.notas || '');
    setShowNew(true);
  };

  const TIPO_LABELS: Record<TipoPedido, string> = { linea: 'Línea', linea_especial: 'Línea Especial', orden_especial: 'Orden Especial' };
  const TIPO_COLORS: Record<TipoPedido, string> = { 
    linea: 'bg-teal-50 text-teal-800 border border-teal-200', 
    linea_especial: 'bg-indigo-50 text-indigo-800 border border-indigo-200', 
    orden_especial: 'bg-amber-50 text-amber-800 border border-amber-200' 
  };

  const handlePrintTicket = (pedido: typeof pedidos[0]) => {
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
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 11px; 
              width: 80mm; 
              padding: 4mm; 
              margin: 0; 
              color: black; 
              background: white; 
              box-sizing: border-box; 
            }
            .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px; }
            .invoice-no { text-align: right; font-weight: bold; margin-bottom: 10px; font-size: 12px; }
            .info { margin-bottom: 10px; line-height: 1.4; display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid black; padding-bottom: 5px; }
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
            <thead>
              <tr>
                <th style="width: 20%">SKU</th>
                <th class="center" style="width: 12%">Cant</th>
                <th style="width: 48%">Descripción</th>
                <th class="right" style="width: 20%">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.items.map(item => `
                <tr>
                  <td>${item.codigo_sku || '-'}</td>
                  <td class="center">${item.cantidad}</td>
                  <td>${item.producto_nombre}${item.acabado ? `<br/><small>${item.acabado}</small>` : ''}</td>
                  <td class="right">$${(item.precio_unitario * item.cantidad).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row bold total-final">
              <span>TOTAL</span>
              <span>$${pedido.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
            <div style="width: 45%;">
              <div style="border-bottom: 1px solid black; height: 30px; margin-bottom: 5px;"></div>
              <div>Firma del Cliente</div>
            </div>
            <div style="width: 45%;">
              <div style="border-bottom: 1px solid black; height: 30px; margin-bottom: 5px;"></div>
              <div>Firma de Taller</div>
            </div>
          </div>
          
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar pedido por cliente, folio o fecha..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]" 
          />
        </div>
        <button 
          onClick={() => { setEditingPedidoId(null); setShowNew(true); }} 
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} /> Nueva Orden
        </button>
      </div>

      {/* Pedidos list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(pedido => {
          const estatusInfo = getPedidoEstatus(pedido);
          return (
            <div key={pedido.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3.5 shadow-sm hover:shadow-md hover:border-teal-500/50 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                    <ClipboardList size={16} className="text-[#0d9488]" /> Orden #{pedido.id}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${estatusInfo.color}`}>
                      {estatusInfo.label}
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">{pedido.cliente_nombre} · {pedido.fecha_creacion}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${pedido.tipo_orden === 'especial' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-teal-50 text-teal-800 border border-teal-200'}`}>
                  {pedido.tipo_orden === 'especial' ? 'Especial' : 'Línea'}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {pedido.items.map(item => (
                  <div key={item.id} className="bg-stone-50 rounded-xl p-2.5 flex items-center gap-3 border border-stone-200/70">
                    {item.diagrama_url && <img src={item.diagrama_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 truncate">{item.producto_nombre}</p>
                      <p className="text-[10px] text-stone-500 font-medium">
                        {item.tipo_pedido && <span className={`${TIPO_COLORS[item.tipo_pedido]} px-1.5 py-0.2 rounded text-[9px] font-bold mr-1`}>{TIPO_LABELS[item.tipo_pedido]}</span>}
                        {item.acabado && <span className="text-teal-800 font-bold">{item.acabado}</span>}
                        {item.medidas && <span className="ml-1 font-mono">· {item.medidas.ancho}×{item.medidas.alto}×{item.medidas.fondo}″</span>}
                      </p>
                    </div>
                    <p className="text-xs font-black text-stone-800 shrink-0">×{item.cantidad}</p>
                  </div>
                ))}
              </div>

              {/* Margen y Totales */}
              <div className="flex flex-col pt-2 border-t border-stone-100 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">{pedido.total_items} piezas en orden</span>
                  <span className="font-black text-teal-700 text-sm font-mono">${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                {(() => {
                  const relatedWOs = workOrders.filter(wo => wo.orden_id === pedido.id);
                  const costoManoObra = relatedWOs.reduce((sum, wo) => sum + (wo.costo_mano_obra || 0) + (wo.costo_acabado || 0), 0);
                  const hasAssignedCosto = relatedWOs.some(wo => wo.empleado_id || wo.empleado_acabado_id);
                  
                  if (!hasAssignedCosto) return null;

                  const margenDinero = pedido.total - costoManoObra;
                  const margenPorcentaje = pedido.total > 0 ? (margenDinero / pedido.total) * 100 : 0;
                  const isLowMargin = margenPorcentaje < 30;

                  return (
                    <div className="flex justify-between items-center text-[10px] bg-stone-50 p-2 rounded-xl border border-stone-200">
                      <span className="text-stone-600">Mano de Obra: <strong className="text-stone-900 font-bold font-mono">${costoManoObra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                      <span className={isLowMargin ? 'text-rose-700 font-bold font-mono' : 'text-emerald-700 font-bold font-mono'}>
                        Margen: ${margenDinero.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ({margenPorcentaje.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-1">
                <button 
                  onClick={() => handlePrintTicket(pedido)} 
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 py-1.5 px-3 rounded-xl text-xs font-bold flex-1 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Printer size={14} /> Imprimir Orden
                </button>
                {isEditable(pedido.id) ? (
                  <>
                    <button 
                      onClick={() => handleAbrirEdicion(pedido)} 
                      className="bg-stone-100 hover:bg-teal-50 hover:text-teal-800 text-stone-600 border border-stone-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs" 
                      title="Editar orden"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleBorrar(pedido.id)} 
                      className="bg-stone-100 hover:bg-rose-50 hover:text-rose-800 text-stone-600 border border-stone-200 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs" 
                      title="Eliminar orden"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : null}
                {pedido.items.some(i => i.tipo_pedido === 'orden_especial' && !i.producto_id) && (
                  <button 
                    onClick={() => {
                      const special = pedido.items.find(i => i.tipo_pedido === 'orden_especial' && !i.producto_id);
                      if (special) guardarComoProducto(special);
                    }} 
                    className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 py-1.5 px-3 rounded-xl text-xs font-bold flex-1 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Package size={14} /> Guardar a Catálogo
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-2 text-center text-xs text-stone-400 py-12">Sin pedidos registrados</p>}
      </div>

      {/* New Order Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scale-in">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                <ClipboardList size={18} className="text-[#0d9488]" /> {editingPedidoId ? `Editar Orden #${editingPedidoId}` : 'Nueva Orden de Fabricación'}
              </h3>
              <button onClick={cerrarFormulario} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-left flex-1">
              {/* Client/Store */}
              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Destino (Cliente o Sucursal)</label>
                <select 
                  value={destinoStr} 
                  onChange={e => setDestinoStr(e.target.value)} 
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#0d9488]"
                >
                  <optgroup label="Clientes Mayoristas">
                    {clientes.map(c => <option key={`cliente_${c.id}`} value={`cliente_${c.id}`}>{c.nombre} ({c.ciudad})</option>)}
                  </optgroup>
                  <optgroup label="Sucursales Propias">
                    {tiendas.map(t => <option key={`tienda_${t.id}`} value={`tienda_${t.id}`}>{t.nombre}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-stone-900">Artículos Agregados ({items.length})</h4>
                  {items.map((item, i) => (
                    <div key={item.id} className="bg-stone-50 rounded-xl p-3 flex items-center gap-3 border border-stone-200">
                      {item.diagrama_url && <img src={item.diagrama_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{item.producto_nombre}</p>
                        <p className="text-[10px] text-stone-500">{TIPO_LABELS[item.tipo_pedido]} · {item.acabado} · {item.medidas ? `${item.medidas.ancho}×${item.medidas.alto}×${item.medidas.fondo}″` : 'Sin medidas'}</p>
                      </div>
                      <p className="text-xs font-black text-stone-800 shrink-0">×{item.cantidad}</p>
                      <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-stone-400 hover:text-rose-600 p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item box */}
              {!showAddItem ? (
                <button 
                  onClick={() => setShowAddItem(true)} 
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Plus size={16} /> Agregar Artículo a la Orden
                </button>
              ) : (
                <div className="bg-stone-50 p-4 rounded-2xl space-y-3.5 border border-stone-200">
                  <h4 className="text-xs font-black text-[#0d9488] uppercase">Detalle del Artículo</h4>
                  
                  {/* Type selector */}
                  <div className="flex gap-1.5">
                    {(['linea', 'linea_especial', 'orden_especial'] as TipoPedido[]).map(t => (
                      <button 
                        key={t} 
                        onClick={() => { setTipoPedido(t); setSelectedProdId(null); }} 
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          tipoPedido === t ? 'bg-[#0d9488] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 bg-white border border-stone-200'
                        }`}
                      >
                        {TIPO_LABELS[t]}
                      </button>
                    ))}
                  </div>

                  {/* Product selector */}
                  {tipoPedido !== 'orden_especial' ? (
                    <div className="relative">
                      <select 
                        value={selectedProdId || ''} 
                        onChange={e => handleSelectProduct(Number(e.target.value))} 
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                      >
                        <option value="" disabled>Seleccione un producto del catálogo...</option>
                        {availableProducts.map(([cat, prods]) => (
                          <optgroup key={cat} label={cat}>
                            {prods.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <input 
                      value={customName} 
                      onChange={e => setCustomName(e.target.value)} 
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]" 
                      placeholder="Nombre o descripción del mueble especial" 
                    />
                  )}

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Ancho (″)</label>
                      <input type="number" value={itemAncho || ''} onChange={e => setItemAncho(Number(e.target.value))} className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Alto (″)</label>
                      <input type="number" value={itemAlto || ''} onChange={e => setItemAlto(Number(e.target.value))} className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Fondo (″)</label>
                      <input type="number" value={itemFondo || ''} onChange={e => setItemFondo(Number(e.target.value))} className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-mono" />
                    </div>
                  </div>

                  {/* Finish + qty */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Acabado</label>
                      <select value={itemAcabado} onChange={e => setItemAcabado(e.target.value)} className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800">
                        {acabados.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-500 font-bold block mb-0.5">Cantidad</label>
                      <input type="number" min={1} value={itemCant} onChange={e => setItemCant(Math.max(1, Number(e.target.value)))} className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold" />
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea 
                    value={itemNotas} 
                    onChange={e => setItemNotas(e.target.value)} 
                    className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#0d9488]" 
                    rows={2} 
                    placeholder="Notas o requerimientos de este artículo..." 
                  />

                  {/* Photo upload */}
                  <div>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleFileUpload} className="hidden" />
                    <button 
                      type="button" 
                      onClick={() => fileRef.current?.click()} 
                      className="w-full bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Image size={14} /> {itemDiagrama ? 'Cambiar Foto/Diagrama' : 'Adjuntar Foto/Diagrama'}
                    </button>
                    {itemDiagrama && <img src={itemDiagrama} alt="preview" className="mt-2 w-full h-32 object-contain rounded-xl border border-stone-200 bg-white p-2" />}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={resetItemForm} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl text-xs font-bold flex-1">Cancelar</button>
                    <button type="button" onClick={handleAddItem} className="px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold flex-1 flex items-center justify-center gap-1.5"><Plus size={14} /> Añadir Artículo</button>
                  </div>
                </div>
              )}

              {/* Notes + submit */}
              <textarea 
                value={notas} 
                onChange={e => setNotas(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#0d9488]" 
                rows={2} 
                placeholder="Notas generales de entrega o pedido..." 
              />
              
              <div className="flex gap-3 pt-3 border-t border-stone-200">
                <button type="button" onClick={cerrarFormulario} className="px-4 py-2.5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 flex-1">
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleCrearPedido} 
                  disabled={!items.length} 
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 flex-1 shadow-sm disabled:opacity-40"
                >
                  <Save size={14} /> {editingPedidoId ? 'Guardar Cambios' : `Crear Orden (${items.length} artículos)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
