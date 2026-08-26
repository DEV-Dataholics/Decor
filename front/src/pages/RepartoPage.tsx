import { useState, useMemo } from 'react';
import { useDecor } from '../store/StoreContext';
import { 
  Truck, Package, AlertTriangle, ChevronRight, X, CheckCircle2, 
  Search, Clock, ArrowRight, UserCheck, MapPin, QrCode, Play,
  Printer, FileText, CheckCircle, ShieldCheck, ThumbsUp, AlertCircle,
  HelpCircle, MessageSquare
} from 'lucide-react';
import type { Embarque, TerminadoSinEmbarcar, EmbarqueItem } from '../store/useStore';

interface ItemRecepcionState {
  estado: 'ok' | 'danado' | 'rechazado';
  observacion: string;
}

export default function RepartoPage() {
  const { 
    embarques, terminados, updateEmbarqueStatus, crearEmbarque, 
    confirmarRecepcion, tiendas, pedidos, currentUser 
  } = useDecor();

  const [manifiestoModal, setManifiestoModal] = useState<Embarque | null>(null);
  const [itemsStatus, setItemsStatus] = useState<Record<number, ItemRecepcionState>>({});
  const [notasGenerales, setNotasGenerales] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [filtroTab, setFiltroTab] = useState<'todos' | 'listos' | 'en_ruta' | 'concluidos'>('todos');
  const [alerta, setAlerta] = useState<{ tipo: 'success' | 'info' | 'warning'; mensaje: string } | null>(null);

  // Rutas de embarque activas
  const rutasActivas = useMemo(() => 
    embarques.filter(e => e.estatus === 'en_transito' || e.estatus === 'embarcado' || e.estatus === 'preparando'), 
    [embarques]
  );

  // Rutas entregadas / historial concluido
  const rutasConcluidas = useMemo(() => 
    embarques.filter(e => e.estatus === 'entregado'), 
    [embarques]
  );

  // Piezas terminadas en fábrica pendientes de asignar a un embarque
  const piezasDisponibles = useMemo(() => {
    const ordenItemIdsEnEmbarque = new Set<number>();
    const ordenProductoEnEmbarque = new Set<string>();
    const qrsEnEmbarque = new Set<string>();

    embarques.forEach(emb => {
      if (emb.estatus !== 'cancelado') {
        emb.items.forEach(i => {
          if (i.orden_item_id) ordenItemIdsEnEmbarque.add(i.orden_item_id);
          if (i.orden_id && i.producto_id) ordenProductoEnEmbarque.add(`${i.orden_id}-${i.producto_id}`);
          if (emb.orden_id && i.producto_id) ordenProductoEnEmbarque.add(`${emb.orden_id}-${i.producto_id}`);
          if (i.qr_code) qrsEnEmbarque.add(i.qr_code);
        });
      }
    });

    return terminados.filter(t => {
      if (t.estatus_item === 'embarcado' || t.estatus_item === 'entregado') return false;
      if (t.orden_item_id && ordenItemIdsEnEmbarque.has(t.orden_item_id)) return false;
      if (t.orden_id && t.producto_id && ordenProductoEnEmbarque.has(`${t.orden_id}-${t.producto_id}`)) return false;
      if (qrsEnEmbarque.has(t.qr_code)) return false;
      return true;
    });
  }, [terminados, embarques]);

  // Filtrado general por búsqueda
  const piezasFiltradas = useMemo(() => {
    if (!search) return piezasDisponibles;
    const s = search.toLowerCase();
    return piezasDisponibles.filter(p => 
      (p.cliente_nombre || '').toLowerCase().includes(s) ||
      p.producto_nombre.toLowerCase().includes(s) ||
      p.codigo_sku.toLowerCase().includes(s) ||
      p.orden_id.toString().includes(s) ||
      p.qr_code.toLowerCase().includes(s)
    );
  }, [piezasDisponibles, search]);

  const rutasFiltradas = useMemo(() => {
    if (!search) return rutasActivas;
    const s = search.toLowerCase();
    return rutasActivas.filter(r => 
      (r.ruta_viaje || '').toLowerCase().includes(s) ||
      (r.transportista || '').toLowerCase().includes(s) ||
      (r.cliente_nombre || '').toLowerCase().includes(s) ||
      r.id.toString().includes(s)
    );
  }, [rutasActivas, search]);

  const concluidasFiltradas = useMemo(() => {
    if (!search) return rutasConcluidas;
    const s = search.toLowerCase();
    return rutasConcluidas.filter(r => 
      (r.ruta_viaje || '').toLowerCase().includes(s) ||
      (r.transportista || '').toLowerCase().includes(s) ||
      (r.cliente_nombre || '').toLowerCase().includes(s) ||
      r.id.toString().includes(s)
    );
  }, [rutasConcluidas, search]);

  // Abrir Manifiesto interactivo para un embarque existente
  const handleAbrirManifiesto = (emb: Embarque) => {
    const initialStatuses: Record<number, ItemRecepcionState> = {};
    emb.items.forEach(it => {
      let currentEstado: 'ok' | 'danado' | 'rechazado' = 'ok';
      if (it.estado_recepcion === 'danado' || it.estado_recepcion === 'dañado' || (it.cantidad_danada && it.cantidad_danada > 0)) {
        currentEstado = 'danado';
      } else if (it.estado_recepcion === 'rechazado' || (emb.estatus === 'entregado' && !it.recibido_en_tienda)) {
        currentEstado = 'rechazado';
      }

      initialStatuses[it.id] = {
        estado: currentEstado,
        observacion: ''
      };
    });
    setItemsStatus(initialStatuses);
    setNotasGenerales('');
    setManifiestoModal(emb);
  };

  // Despacho directo: crea el embarque y abre INMEDIATAMENTE el Manifiesto interactivo
  const handleDespacharPiezaDirecta = async (pieza: TerminadoSinEmbarcar) => {
    const pedido = pedidos.find(p => p.id === pieza.orden_id);
    const clienteDestino = pieza.cliente_nombre || pedido?.cliente_nombre || 'Cliente General';
    const isTiendaOrder = pedido?.tipo_orden === 'resurtido_tienda' || tiendas.some(ti => ti.id === pedido?.cliente_id);
    const tiendaDestinoId = isTiendaOrder ? (pedido?.cliente_id || 1) : 1;

    const item: EmbarqueItem = {
      id: Date.now(),
      producto_id: pieza.producto_id,
      producto_nombre: pieza.producto_nombre,
      codigo_sku: pieza.codigo_sku,
      qr_code: pieza.qr_code,
      precio_unitario: pieza.precio_estimado || 0,
      embarcado: true,
      recibido_en_tienda: false,
      original_terminado: pieza,
      tienda_destino_id: tiendaDestinoId,
      cliente_nombre: clienteDestino,
      cantidad: pieza.cantidad || 1,
      orden_id: pieza.orden_id,
      orden_item_id: pieza.orden_item_id,
      acabado: pieza.acabado
    };

    const newEmb = await crearEmbarque({
      orden_id: pieza.orden_id,
      ruta_viaje: `Entrega: ${clienteDestino}`,
      fecha_embarque: new Date().toISOString().split('T')[0],
      placas_trailer: 'Reparto Local',
      transportista: currentUser?.nombre || 'Chofer de Reparto',
      estatus: 'en_transito',
      items: [item],
      cliente_nombre: clienteDestino,
      tienda_destino_id: tiendaDestinoId,
    });

    if (newEmb) {
      handleAbrirManifiesto(newEmb);
    }
  };

  // Cambiar estado de una pieza en el manifiesto
  const handleSetItemEstado = (itemId: number, estado: 'ok' | 'danado' | 'rechazado') => {
    setItemsStatus(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        estado
      }
    }));
  };

  const handleSetItemObservacion = (itemId: number, observacion: string) => {
    setItemsStatus(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observacion
      }
    }));
  };

  // Liberar el pedido, guardar incidencias y mover al historial
  const handleLiberarYFinalizarEntrega = async () => {
    if (!manifiestoModal) return;
    setIsSubmitting(true);

    try {
      // Mapear los items con su estado final explícito
      const updatedItems: EmbarqueItem[] = manifiestoModal.items.map(it => {
        const itemState = itemsStatus[it.id] || { estado: 'ok', observacion: '' };
        return {
          ...it,
          recibido_en_tienda: itemState.estado === 'ok',
          estado_recepcion: itemState.estado,
          cantidad: it.cantidad || 1
        };
      });

      const hayIncidencias = updatedItems.some(i => i.estado_recepcion !== 'ok');

      await confirmarRecepcion(manifiestoModal.id, updatedItems);

      setAlerta({ 
        tipo: hayIncidencias ? 'warning' : 'success', 
        mensaje: hayIncidencias 
          ? `Viaje #${manifiestoModal.id} completado con incidencias (piezas dañadas/rechazadas registradas en historial).` 
          : `¡Pedido liberado y entregado al 100%! Guardado en historial de manifiestos.` 
      });

      setManifiestoModal(null);
      setFiltroTab('concluidos'); // Cambiar a la pestaña de historial concluido
    } catch (e) {
      console.error(e);
      alert('Error al liberar y finalizar entrega.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setAlerta(null), 5000);
    }
  };

  // Impresión del manifiesto oficial
  const handlePrintManifiesto = (emb: Embarque) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const fechaHoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manifiesto de Carga y Entrega - Viaje #${emb.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1c1917; line-height: 1.4; font-size: 13px; }
          .header { border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo { font-size: 22px; font-weight: 900; color: #0d9488; letter-spacing: -0.5px; }
          .badge { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .box { background: #fafaf9; border: 1px solid #e7e5e4; padding: 12px; border-radius: 8px; }
          .box-title { font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; margin-bottom: 6px; }
          .box-value { font-size: 13px; font-weight: 700; color: #1c1917; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f5f5f4; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #44403c; border-bottom: 1px solid #d6d3d1; }
          td { padding: 10px; border-bottom: 1px solid #e7e5e4; font-size: 12px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
          .sig-line { border-top: 1px solid #1c1917; text-align: center; padding-top: 8px; font-weight: 700; font-size: 11px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">DECOR MUEBLERÍA</div>
            <div style="font-size: 11px; color: #78716c; margin-top: 2px;">Manifiesto de Carga, Reparto y Recepción</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">VIAJE #${emb.id} · ${emb.estatus.toUpperCase()}</div>
            <div style="font-size: 10px; color: #78716c; margin-top: 6px;">Emisión: ${fechaHoy}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="box-title">Destino / Cliente</div>
            <div class="box-value">${emb.ruta_viaje || emb.cliente_nombre || 'Cliente General'}</div>
            <div style="font-size: 11px; color: #78716c; margin-top: 4px;">Fecha de Embarque: ${emb.fecha_embarque}</div>
          </div>
          <div class="box">
            <div class="box-title">Unidad de Transporte & Chofer</div>
            <div class="box-value">${emb.transportista || 'Chofer Asignado'}</div>
            <div style="font-size: 11px; color: #78716c; margin-top: 4px;">Placas / Unidad: ${emb.placas_trailer || 'Reparto Local'}</div>
          </div>
        </div>

        <div style="font-weight: 900; font-size: 13px; margin-top: 20px; color: #1c1917;">DETALLE DE PIEZAS Y BULTOS A BORDO (${emb.items.length} piezas)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Descripción del Producto</th>
              <th>Folio QR</th>
              <th>Estado Entrega</th>
            </tr>
          </thead>
          <tbody>
            ${emb.items.map((it, idx) => {
              let label = 'En Tránsito';
              let color = '#0f766e';
              const est = it.estado_recepcion || (it.cantidad_danada && it.cantidad_danada > 0 ? 'danado' : (it.recibido_en_tienda ? 'ok' : 'rechazado'));

              if (emb.estatus === 'entregado') {
                if (est === 'danado' || est === 'dañado') {
                  label = '⚠️ Con Daño / Avería';
                  color = '#d97706';
                } else if (est === 'rechazado') {
                  label = '❌ Rechazado / No Entregado';
                  color = '#dc2626';
                } else {
                  label = '✓ Recibido Conforme';
                  color = '#15803d';
                }
              }

              return `
                <tr>
                  <td style="font-weight: 700; color: #78716c;">${idx + 1}</td>
                  <td style="font-family: monospace; font-weight: 700;">${it.codigo_sku}</td>
                  <td><strong>${it.producto_nombre}</strong><br><span style="color: #78716c; font-size: 11px;">Destino: ${it.cliente_nombre || emb.cliente_nombre || 'General'}</span></td>
                  <td style="font-family: monospace; font-size: 11px; color: #0f766e;">${it.qr_code}</td>
                  <td><strong style="color: ${color};">${label}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-line">
            Firma del Transportista / Repartidor<br>
            <span style="font-weight: normal; color: #78716c; font-size: 10px;">${emb.transportista || 'Chofer Responsable'}</span>
          </div>
          <div class="sig-line">
            Firma de Recibido del Cliente / Sucursal<br>
            <span style="font-weight: normal; color: #78716c; font-size: 10px;">Nombre, Firma y Sello</span>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Truck size={22} className="text-[#0d9488]" /> Reparto & Manifiestos de Entrega
          </h1>
          <p className="text-xs text-stone-500 font-medium">
            Despacho directo, auditoría de carga y comprobación de entrega con incidencias.
          </p>
        </div>

        {/* Micro-KPIs */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-amber-800 font-bold block uppercase">Listos Fábrica</span>
            <strong className="text-sm font-black text-amber-900">{piezasDisponibles.length}</strong>
          </div>
          <div className="bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-teal-800 font-bold block uppercase">En Ruta</span>
            <strong className="text-sm font-black text-teal-900">{rutasActivas.length}</strong>
          </div>
          <div className="bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-emerald-800 font-bold block uppercase">Historial</span>
            <strong className="text-sm font-black text-emerald-900">{rutasConcluidas.length}</strong>
          </div>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {alerta && (
        <div className={`p-3.5 border text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-scale-in ${
          alerta.tipo === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-teal-50 border-teal-200 text-teal-900'
        }`}>
          <div className="flex items-center gap-2">
            {alerta.tipo === 'warning' ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-teal-600" />}
            <span>{alerta.mensaje}</span>
          </div>
          <button onClick={() => setAlerta(null)} className="text-stone-400 hover:text-stone-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, producto, SKU, QR o folio de viaje..." 
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

        {/* Tabs de Filtro */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0 w-full sm:w-auto">
          <button 
            onClick={() => setFiltroTab('todos')} 
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTab === 'todos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            Todos ({piezasFiltradas.length + rutasFiltradas.length + concluidasFiltradas.length})
          </button>
          <button 
            onClick={() => setFiltroTab('listos')} 
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTab === 'listos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            📦 Listos ({piezasFiltradas.length})
          </button>
          <button 
            onClick={() => setFiltroTab('en_ruta')} 
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTab === 'en_ruta' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            🚚 En Ruta ({rutasFiltradas.length})
          </button>
          <button 
            onClick={() => setFiltroTab('concluidos')} 
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTab === 'concluidos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
          >
            ✓ Historial ({concluidasFiltradas.length})
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: PIEZAS LISTAS PARA DESPACHO EN FÁBRICA */}
      {(filtroTab === 'todos' || filtroTab === 'listos') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={16} className="text-[#0d9488]" />
              Piezas Listas para Despacho en Fábrica ({piezasFiltradas.length})
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Salieron de taller y esperan entrega</span>
          </div>

          {piezasFiltradas.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-xs text-stone-400 font-medium">No hay piezas terminadas pendientes de despacho en este momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {piezasFiltradas.map(pieza => (
                <div key={pieza.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs hover:shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                          Orden #{pieza.orden_id}
                        </span>
                        <h4 className="text-sm font-black text-stone-900 mt-1 truncate max-w-[200px]">
                          {pieza.cliente_nombre || 'Cliente General'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                        {pieza.qr_code}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-1">
                      <p className="text-xs font-bold text-stone-900 leading-tight">{pieza.producto_nombre}</p>
                      <div className="flex items-center justify-between text-[10px] text-stone-500">
                        <span className="font-mono">SKU: {pieza.codigo_sku}</span>
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">{pieza.acabado || 'Natural'}</span>
                      </div>
                      {pieza.fecha_listo && (
                        <p className="text-[9px] text-stone-400 font-medium pt-1">Terminado el: {pieza.fecha_listo}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDespacharPiezaDirecta(pieza)}
                    className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <FileText size={15} /> Abrir Manifiesto y Liberar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: VIAJES ACTIVOS / EN RUTA */}
      {(filtroTab === 'todos' || filtroTab === 'en_ruta') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={16} className="text-[#0d9488]" />
              Viajes Activos / En Reparto ({rutasFiltradas.length})
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Pulsa en cualquier viaje para abrir su manifiesto</span>
          </div>

          {rutasFiltradas.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-xs text-stone-400 font-medium">No hay rutas de embarque activas actualmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {rutasFiltradas.map(emb => (
                <div 
                  key={emb.id} 
                  className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer space-y-3"
                  onClick={() => handleAbrirManifiesto(emb)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                        <Truck size={18} className="text-[#0d9488]" /> Viaje #{emb.id}
                      </h4>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">{emb.fecha_embarque} · {emb.transportista || 'Chofer Asignado'}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      emb.estatus === 'en_transito' 
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {emb.estatus === 'en_transito' ? '🚚 En ruta' : '⏳ Listo en Taller'}
                    </span>
                  </div>
                  
                  <div className="bg-stone-50 rounded-xl p-3 text-xs space-y-1.5 border border-stone-200/60">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-medium">Destino:</span>
                      <span className="text-stone-900 font-bold max-w-[200px] truncate">{emb.ruta_viaje || emb.cliente_nombre}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-medium">Piezas a Entregar:</span>
                      <span className="text-teal-700 font-bold font-mono">{emb.items.length} piezas a bordo</span>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAbrirManifiesto(emb); }}
                    className="w-full bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <FileText size={15} /> Abrir Manifiesto de Liberación <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 3: HISTORIAL DE MANIFIESTOS Y ENTREGAS CONCLUIDAS */}
      {(filtroTab === 'todos' || filtroTab === 'concluidos') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" />
              Historial de Manifiestos Concluidos ({concluidasFiltradas.length})
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Auditoría de pedidos entregados y recibidos</span>
          </div>

          {concluidasFiltradas.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-xs text-stone-400 font-medium">No hay registros de viajes concluidos en este filtro.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {concluidasFiltradas.map(emb => {
                const hasIncidencias = emb.items.some(i => 
                  i.estado_recepcion === 'danado' || 
                  i.estado_recepcion === 'dañado' || 
                  i.estado_recepcion === 'rechazado' || 
                  (i.cantidad_danada && i.cantidad_danada > 0) ||
                  !i.recibido_en_tienda
                );

                return (
                  <div key={emb.id} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-xs hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-black border px-2 py-0.5 rounded-full uppercase ${
                          hasIncidencias 
                            ? 'bg-rose-50 text-rose-800 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {hasIncidencias ? '⚠️ Con Incidencias' : '✓ 100% Conforme'}
                        </span>
                        <h4 className="text-sm font-black text-stone-900 mt-1 truncate max-w-[200px]">
                          {emb.ruta_viaje || emb.cliente_nombre || 'Cliente General'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                        {emb.fecha_embarque}
                      </span>
                    </div>

                    <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 text-xs space-y-1">
                      <p className="text-stone-600 font-medium truncate">Chofer: <strong className="text-stone-900">{emb.transportista || 'Chofer'}</strong></p>
                      <p className="text-stone-600 font-medium">Carga: <strong className="text-emerald-800 font-mono">{emb.items.length} piezas procesadas</strong></p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAbrirManifiesto(emb)}
                        className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <FileText size={14} /> Ver Manifiesto
                      </button>
                      <button
                        onClick={() => handlePrintManifiesto(emb)}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-900 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border border-teal-200/80 transition-all"
                        title="Imprimir Manifiesto"
                      >
                        <Printer size={14} /> Imprimir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL INTERACTIVO: MANIFIESTO DE LIBERACIÓN, ENTREGA E INCIDENCIAS ── */}
      {manifiestoModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden text-left">
            {/* Header del Manifiesto */}
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50 shrink-0">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <FileText size={20} className="text-[#0d9488]" /> Manifiesto de Carga y Liberación · Viaje #{manifiestoModal.id}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  Destino: <strong className="text-stone-900">{manifiestoModal.ruta_viaje || manifiestoModal.cliente_nombre}</strong>
                </p>
              </div>
              <button 
                onClick={() => setManifiestoModal(null)} 
                className="text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido Desplazable del Manifiesto */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Tarjetas Informativas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Estatus</span>
                  <span className={`text-xs font-black uppercase ${manifiestoModal.estatus === 'entregado' ? 'text-emerald-700' : 'text-teal-700'}`}>
                    {manifiestoModal.estatus === 'entregado' ? '✓ Entregado' : '🚚 En Reparto'}
                  </span>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Fecha</span>
                  <span className="text-xs font-bold text-stone-900">{manifiestoModal.fecha_embarque}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Chofer</span>
                  <span className="text-xs font-bold text-stone-900 truncate block">{manifiestoModal.transportista || currentUser?.nombre || 'Chofer'}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">Unidad</span>
                  <span className="text-xs font-bold font-mono text-stone-900">{manifiestoModal.placas_trailer || 'Reparto Local'}</span>
                </div>
              </div>

              {/* Auditoría de Piezas y Reporte de Incidencias */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-stone-100 px-4 py-2.5 border-b border-stone-200 flex justify-between items-center">
                  <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                    Piezas a Entregar ({manifiestoModal.items.length})
                  </span>
                  <span className="text-[10px] font-bold text-stone-500">
                    {manifiestoModal.estatus === 'entregado' ? 'Estado de recepción registrado' : 'Señala si alguna pieza presenta anomalías'}
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {manifiestoModal.items.map((it, idx) => {
                    const isConcluido = manifiestoModal.estatus === 'entregado';
                    const itemState = itemsStatus[it.id] || { 
                      estado: (it.estado_recepcion === 'danado' || it.estado_recepcion === 'dañado' || (it.cantidad_danada && it.cantidad_danada > 0)) 
                        ? 'danado' 
                        : (it.estado_recepcion === 'rechazado' || (isConcluido && !it.recibido_en_tienda) ? 'rechazado' : 'ok'), 
                      observacion: '' 
                    };

                    return (
                      <div key={it.id || idx} className="p-4 space-y-2.5 bg-white hover:bg-stone-50/60 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900">{it.producto_nombre}</p>
                            <p className="text-[11px] text-stone-500 font-mono">
                              SKU: {it.codigo_sku} · Folio QR: {it.qr_code}
                            </p>
                          </div>

                          {/* Controles de Estado de Entrega */}
                          {!isConcluido ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSetItemEstado(it.id, 'ok')}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                  itemState.estado === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                <ThumbsUp size={13} /> Conforme (OK)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetItemEstado(it.id, 'danado')}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                  itemState.estado === 'danado'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                <AlertTriangle size={13} /> Con Daño
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetItemEstado(it.id, 'rechazado')}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                                  itemState.estado === 'rechazado'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                <AlertCircle size={13} /> Rechazado
                              </button>
                            </div>
                          ) : (
                            <div>
                              {itemState.estado === 'ok' && (
                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                                  <CheckCircle size={12} /> Recibido Conforme
                                </span>
                              )}
                              {itemState.estado === 'danado' && (
                                <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                                  <AlertTriangle size={12} /> Con Daño / Avería
                                </span>
                              )}
                              {itemState.estado === 'rechazado' && (
                                <span className="text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1">
                                  <AlertCircle size={12} /> ❌ Rechazado / No Entregado
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Campo para señalar qué salió mal */}
                        {itemState.estado !== 'ok' && !isConcluido && (
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 space-y-1 animate-scale-in">
                            <label className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1">
                              <MessageSquare size={12} /> Detalle de la incidencia / anomalía:
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Empaque roto, detalle en pintura o raspadura..."
                              value={itemState.observacion}
                              onChange={(e) => handleSetItemObservacion(it.id, e.target.value)}
                              className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer con Acciones de Liberación */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row justify-between items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setManifiestoModal(null)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-all"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintManifiesto(manifiestoModal)}
                  className="flex-1 sm:flex-initial bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-stone-200 transition-all"
                  title="Imprimir Manifiesto"
                >
                  <Printer size={15} /> Imprimir Hoja
                </button>
              </div>

              {manifiestoModal.estatus !== 'entregado' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleLiberarYFinalizarEntrega}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  <CheckCircle2 size={16} /> {isSubmitting ? 'Guardando...' : '✓ Liberar Pedido y Finalizar Entrega'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
