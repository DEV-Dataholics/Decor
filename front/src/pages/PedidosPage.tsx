import { useState, useMemo, useRef, useCallback } from 'react';
import { ClipboardList, Plus, Search, X, Save, Image, Package, Printer, Edit2, Trash2 } from 'lucide-react';
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

  const getPedidoEstatus = useCallback((pedidoId: number) => {
    // 1. Buscar embarques que contengan piezas de este pedido
    const relatedEmbarques = embarques.filter(emb => 
      emb.items.some(item => item.original_terminado?.orden_id === pedidoId)
    );

    if (relatedEmbarques.length > 0) {
      const statuses = relatedEmbarques.map(e => e.estatus);
      if (statuses.every(s => s === 'entregado')) {
        return { label: 'Entregado', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' };
      }
      if (statuses.some(s => s === 'en_sucursal')) {
        return { label: 'En Sucursal (por recibir)', color: 'bg-teal-500/15 text-teal-400 border border-teal-500/30' };
      }
      if (statuses.some(s => s === 'en_transito')) {
        return { label: 'En Tránsito', color: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' };
      }
      if (statuses.some(s => s === 'embarcado')) {
        return { label: 'Embarcado', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' };
      }
      return { label: 'Listo para Embarcar', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' };
    }

    // 2. Si no hay embarques, verificar estatus de las órdenes de producción
    const relatedWOs = workOrders.filter(wo => wo.orden_id === pedidoId);
    if (relatedWOs.length === 0) {
      return { label: 'Pendiente', color: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30' };
    }

    const allReady = relatedWOs.every(wo => wo.estatus === 'listo_embarque');
    if (allReady) {
      return { label: 'Listo para Embarcar', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' };
    }

    const anyInProduction = relatedWOs.some(wo => wo.estatus === 'en_produccion' || wo.estatus === 'acabados');
    if (anyInProduction) {
      return { label: 'En Producción', color: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' };
    }

    return { label: 'Pendiente', color: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30' };
  }, [workOrders, embarques]);

  const filtered = useMemo(() =>
    pedidos.filter(p => !search || p.cliente_nombre.toLowerCase().includes(search.toLowerCase()) || p.id.toString().includes(search)),
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

  // When selecting a catalog product, autofill dimensions
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
    // Si hay cliente seleccionado, buscar su precio específico
    if (selectedCliente) {
      const key = Object.keys(prod.prices || {}).find(k => selectedCliente.nombre.toLowerCase().includes(k.toLowerCase()));
      return key ? prod.prices[key] : Object.values(prod.prices || {})[0] || 0;
    }
    // Si el destino es una tienda, usar el primer precio del catálogo
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
  const TIPO_COLORS: Record<TipoPedido, string> = { linea: 'bg-blue-500/15 text-blue-400', linea_especial: 'bg-purple-500/15 text-purple-400', orden_especial: 'bg-amber-500/15 text-amber-400' };

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
            .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px; font-style: italic; }
            .invoice-no { text-align: right; font-weight: bold; margin-bottom: 10px; font-size: 12px; }
            .info { margin-bottom: 10px; line-height: 1.4; display: flex; justify-content: space-between; font-size: 10px; border-bottom: 1px solid black; padding-bottom: 5px; }
            .info-col { flex: 1; }
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
              <div><strong style="display:inline-block; width:50px;">Address</strong> -</div>
              <div><strong style="display:inline-block; width:50px;">City</strong> ${destinoCiudad || '-'}</div>
            </div>
            <div style="width: 40%; border-left: 1px solid black; padding-left: 5px;">
              <div><strong>Date</strong> ${pedido.fecha_creacion}</div>
              <div><strong>Phone</strong> ${destinoTel || '-'}</div>
              <div><strong>Fax</strong> -</div>
            </div>
          </div>
          <div style="font-size: 10px; margin-bottom: 10px; border-bottom: 1px solid black; padding-bottom: 5px;">
             <strong style="display:inline-block; width:50px;">State</strong> - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Zip</strong> -
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 20%">CODE</th>
                <th class="center" style="width: 12%">Qty</th>
                <th style="width: 48%">Description</th>
                <th class="right" style="width: 20%">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.items.map(item => `
                <tr>
                  <td>${item.codigo_sku || '-'}</td>
                  <td class="center">${item.cantidad}</td>
                  <td>${item.producto_nombre}${item.acabado ? `<br/><small>${item.acabado}</small>` : ''}</td>
                  <td class="right">${(item.precio_unitario * item.cantidad).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal</span>
              <span>${pedido.total.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Freight</span>
              <span>0.00</span>
            </div>
            <div class="totals-row bold total-final">
              <span>TOTAL</span>
              <span>${pedido.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
            <div style="width: 45%;">
              <div style="border-bottom: 1px solid black; height: 30px; margin-bottom: 5px;"></div>
              <div>Firma del Cliente</div>
            </div>
            <div style="width: 45%;">
              <div style="border-bottom: 1px solid black; height: 30px; margin-bottom: 5px;"></div>
              <div>Firma de Taller / Vendedor</div>
            </div>
          </div>
          <div style="margin-top: 15px; text-align: center; font-size: 9px; font-style: italic;">
            Fecha de entrega prometida: _______/_______/_______
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input type="text" placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} className="input-dark pl-10" />
        </div>
        <button onClick={() => { setEditingPedidoId(null); setShowNew(true); }} className="btn-primary shrink-0"><Plus size={16} /> Nueva Orden</button>
      </div>

      {/* Pedidos list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map(pedido => {
          const estatusInfo = getPedidoEstatus(pedido.id);
          return (
            <div key={pedido.id} className="glass-card p-5 space-y-3 hover:border-amber-500/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <ClipboardList size={16} className="text-amber-400" /> Orden #{pedido.id}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${estatusInfo.color}`}>
                      {estatusInfo.label}
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-500">{pedido.cliente_nombre} · {pedido.fecha_creacion}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pedido.tipo_orden === 'especial' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                  {pedido.tipo_orden === 'especial' ? 'Especial' : 'Línea'}
                </span>
              </div>
              <div className="space-y-1.5">
                {pedido.items.map(item => (
                  <div key={item.id} className="bg-zinc-800/40 rounded-lg p-2.5 flex items-center gap-3">
                    {item.diagrama_url && <img src={item.diagrama_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{item.producto_nombre}</p>
                      <p className="text-[10px] text-zinc-500">
                        {item.tipo_pedido && <span className={`${TIPO_COLORS[item.tipo_pedido]} px-1 py-0 rounded text-[8px] font-bold mr-1`}>{TIPO_LABELS[item.tipo_pedido]}</span>}
                        {item.acabado && <span className="text-amber-400">{item.acabado}</span>}
                        {item.medidas && <span className="ml-1">· {item.medidas.ancho}×{item.medidas.alto}×{item.medidas.fondo}″</span>}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-zinc-300 shrink-0">×{item.cantidad}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col pt-1 border-t border-zinc-800/30 space-y-1">
                  <div className="flex justify-between items-center text-zinc-500 text-xs w-full">
                    <p>{pedido.total_items} piezas</p>
                    <p className="font-bold text-amber-400 text-sm">${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  {(() => {
                    const relatedWOs = workOrders.filter(wo => wo.orden_id === pedido.id);
                    const costoManoObra = relatedWOs.reduce((sum, wo) => sum + (wo.costo_mano_obra || 0) + (wo.costo_acabado || 0), 0);
                    const hasAssignedCosto = relatedWOs.some(wo => wo.empleado_id || wo.empleado_acabado_id);
                    
                    if (!hasAssignedCosto) return null;

                    const margenDinero = pedido.total - costoManoObra;
                    const margenPorcentaje = pedido.total > 0 ? (margenDinero / pedido.total) * 100 : 0;
                    const isLowMargin = margenPorcentaje < 30; // warning threshold

                    return (
                      <div className="flex justify-between items-center text-[10px] bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50 mt-1">
                        <span className="text-zinc-500">Mano de Obra: <strong className="text-zinc-300 font-semibold">${costoManoObra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                        <span className={isLowMargin ? 'text-orange-400 font-bold font-mono' : 'text-emerald-400 font-bold font-mono'}>
                          Margen: ${margenDinero.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ({margenPorcentaje.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })()}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintTicket(pedido)} className="btn-secondary text-xs flex-1 justify-center"><Printer size={14} /> Imprimir</button>
                {isEditable(pedido.id) ? (
                  <>
                    <button onClick={() => handleAbrirEdicion(pedido)} className="btn-secondary text-xs px-2 justify-center text-zinc-400 hover:text-amber-400"><Edit2 size={14} /></button>
                    <button onClick={() => handleBorrar(pedido.id)} className="btn-secondary text-xs px-2 justify-center text-zinc-400 hover:text-red-400"><Trash2 size={14} /></button>
                  </>
                ) : (
                  <div className={`px-2.5 py-1 text-[10px] font-bold rounded flex items-center justify-center shrink-0 ${estatusInfo.color}`} title="Estado del pedido (no editable)">
                    {estatusInfo.label}
                  </div>
                )}
                {pedido.items.some(i => i.tipo_pedido === 'orden_especial' && !i.producto_id) && (
                  <button onClick={() => {
                    const special = pedido.items.find(i => i.tipo_pedido === 'orden_especial' && !i.producto_id);
                    if (special) guardarComoProducto(special);
                  }} className="btn-secondary text-xs flex-1 justify-center"><Package size={14} /> Guardar Especial como Producto</button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-2 text-center text-sm text-zinc-600 py-8">Sin pedidos registrados</p>}
      </div>

      {/* New Order Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center sticky top-0 bg-zinc-800/90 backdrop-blur-sm z-10">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2"><ClipboardList size={18} className="text-amber-400" /> {editingPedidoId ? `Editar Orden #${editingPedidoId}` : 'Nueva Orden'}</h3>
              <button onClick={cerrarFormulario} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Client/Store */}
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Destino (Cliente o Sucursal)</label>
                <select value={destinoStr} onChange={e => setDestinoStr(e.target.value)} className="input-dark">
                  <optgroup label="Clientes Mayoristas">
                    {clientes.map(c => <option key={`cliente_${c.id}`} value={`cliente_${c.id}`} className="bg-zinc-900">{c.nombre} ({c.ciudad})</option>)}
                  </optgroup>
                  <optgroup label="Sucursales Propias">
                    {tiendas.map(t => <option key={`tienda_${t.id}`} value={`tienda_${t.id}`} className="bg-zinc-900">{t.nombre}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Items list */}
              {items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400">Artículos ({items.length})</h4>
                  {items.map((item, i) => (
                    <div key={item.id} className="bg-zinc-800/40 rounded-lg p-3 flex items-center gap-3">
                      {item.diagrama_url && <img src={item.diagrama_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{item.producto_nombre}</p>
                        <p className="text-[10px] text-zinc-500">{TIPO_LABELS[item.tipo_pedido]} · {item.acabado} · {item.medidas ? `${item.medidas.ancho}×${item.medidas.alto}×${item.medidas.fondo}″` : 'Sin medidas'}</p>
                      </div>
                      <p className="text-xs font-bold text-zinc-300 shrink-0">×{item.cantidad}</p>
                      <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add item */}
              {!showAddItem ? (
                <button onClick={() => setShowAddItem(true)} className="btn-secondary w-full justify-center"><Plus size={14} /> Agregar Artículo</button>
              ) : (
                <div className="glass-card p-4 space-y-3 border-amber-500/20">
                  <h4 className="text-xs font-bold text-amber-400">Nuevo Artículo</h4>
                  {/* Type selector */}
                  <div className="flex gap-1">
                    {(['linea', 'linea_especial', 'orden_especial'] as TipoPedido[]).map(t => (
                      <button key={t} onClick={() => { setTipoPedido(t); setSelectedProdId(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tipoPedido === t ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/40'}`}>{TIPO_LABELS[t]}</button>
                    ))}
                  </div>

                  {/* Product search (for linea / linea_especial) */}
                  {tipoPedido !== 'orden_especial' ? (
                    <div className="relative">
                      <select 
                        value={selectedProdId || ''} 
                        onChange={e => handleSelectProduct(Number(e.target.value))} 
                        className="input-dark w-full"
                      >
                        <option value="" disabled>Seleccione un producto...</option>
                        {availableProducts.map(([cat, prods]) => (
                          <optgroup key={cat} label={cat} className="bg-zinc-900 font-bold text-amber-500">
                            {prods.map(p => (
                              <option key={p.id} value={p.id} className="text-zinc-200 font-normal">{p.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <input value={customName} onChange={e => setCustomName(e.target.value)} className="input-dark" placeholder="Nombre del mueble especial" />
                  )}

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[9px] text-zinc-500 block mb-0.5">Ancho (″)</label><input type="number" value={itemAncho || ''} onChange={e => setItemAncho(Number(e.target.value))} className="input-dark" /></div>
                    <div><label className="text-[9px] text-zinc-500 block mb-0.5">Alto (″)</label><input type="number" value={itemAlto || ''} onChange={e => setItemAlto(Number(e.target.value))} className="input-dark" /></div>
                    <div><label className="text-[9px] text-zinc-500 block mb-0.5">Fondo (″)</label><input type="number" value={itemFondo || ''} onChange={e => setItemFondo(Number(e.target.value))} className="input-dark" /></div>
                  </div>

                  {/* Finish + qty */}
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[9px] text-zinc-500 block mb-0.5">Acabado</label>
                      <select value={itemAcabado} onChange={e => setItemAcabado(e.target.value)} className="input-dark">
                        {acabados.map(a => <option key={a} value={a} className="bg-zinc-900">{a}</option>)}
                      </select>
                    </div>
                    <div><label className="text-[9px] text-zinc-500 block mb-0.5">Cantidad</label><input type="number" min={1} value={itemCant} onChange={e => setItemCant(Math.max(1, Number(e.target.value)))} className="input-dark" /></div>
                  </div>

                  {/* Notes */}
                  <textarea value={itemNotas} onChange={e => setItemNotas(e.target.value)} className="input-dark" rows={2} placeholder="Notas/especificaciones..." />

                  {/* Photo upload */}
                  <div>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="btn-ghost text-xs w-full justify-center"><Image size={14} /> {itemDiagrama ? 'Cambiar Foto/Diagrama' : 'Adjuntar Foto/Diagrama'}</button>
                    {itemDiagrama && <img src={itemDiagrama} alt="preview" className="mt-2 w-full h-32 object-contain rounded-lg border border-zinc-700/30" />}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={resetItemForm} className="btn-ghost flex-1 justify-center text-xs">Cancelar</button>
                    <button onClick={handleAddItem} className="btn-primary flex-1 justify-center text-xs"><Plus size={14} /> Agregar</button>
                  </div>
                </div>
              )}

              {/* Notes + submit */}
              <textarea value={notas} onChange={e => setNotas(e.target.value)} className="input-dark" rows={2} placeholder="Notas generales de la orden..." />
              <div className="flex gap-3 pt-2">
                <button onClick={cerrarFormulario} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={handleCrearPedido} disabled={!items.length} className="btn-primary flex-1 justify-center disabled:opacity-40"><Save size={14} /> {editingPedidoId ? 'Guardar Cambios' : `Crear Orden (${items.length} artículos)`}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
