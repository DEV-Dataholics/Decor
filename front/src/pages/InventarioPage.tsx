import { useState, useMemo, useRef } from 'react';
import { Package, TreePine, Store, Search, Minus, Plus, Timer, AlertTriangle, QrCode, Printer, X, Save } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';
import { QRCodeSVG } from 'qrcode.react';


type Tab = 'tienda' | 'materia_prima' | 'terminados';

import type { Embarque, EmbarqueItem } from '../store/useStore';

export default function InventarioPage() {
  const { currentUser, inventario, materiaPrima, terminados, updateMateriaPrima, guardarMateriaPrima, updateStockTienda, tiendas, productos, embarques, ventas, devoluciones, confirmarRecepcion } = useDecor();
  const isGerenteTienda = currentUser?.rol === 'gerente_tienda';
  const posTiendaId = localStorage.getItem('decor_pos_tienda_id') ? Number(localStorage.getItem('decor_pos_tienda_id')) : null;

  const [tab, setTab] = useState<Tab>(isGerenteTienda ? 'tienda' : 'terminados');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drill-down states for Tienda
  const [selectedTiendaId, setSelectedTiendaId] = useState<number | null>(isGerenteTienda ? posTiendaId : null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [printQRs, setPrintQRs] = useState<{ nombre: string, qrs: string[], tiendaNombre: string, precio?: number } | null>(null);

  // States for Shop Receiving Flow
  const [activeRecepcionEmb, setActiveRecepcionEmb] = useState<Embarque | null>(null);
  const [recepcionItems, setRecepcionItems] = useState<EmbarqueItem[]>([]);

  const targetTiendaId = isGerenteTienda ? posTiendaId : selectedTiendaId;

  // Embarques en tránsito o en sucursal destinados a esta tienda
  const embarquesEnCamino = useMemo(() => {
    if (!targetTiendaId) return [];
    return embarques.filter(e => {
      // Inferir tienda destino: primero del campo padre, luego de los items como fallback
      const tiendaDestino = e.tienda_destino_id
        || e.items.find(i => i.tienda_destino_id > 0)?.tienda_destino_id
        || 0;
      return tiendaDestino === targetTiendaId &&
        (e.estatus === 'en_transito' || e.estatus === 'en_sucursal');
    });
  }, [embarques, targetTiendaId]);

  const handleOpenRecepcion = (emb: Embarque) => {
    setActiveRecepcionEmb(emb);
    setRecepcionItems(emb.items.map(item => ({
      ...item,
      estado_recepcion: (item.estado_recepcion === 'pendiente' || !item.estado_recepcion) ? 'ok' : item.estado_recepcion as any
    })));
  };

  const handleUpdateItemStatus = (qr: string, status: 'ok' | 'dañado' | 'faltante') => {
    setRecepcionItems(prev => prev.map(i => i.qr_code === qr ? { ...i, estado_recepcion: status } : i));
  };

  const handleConfirmarRecepcionClick = () => {
    if (!activeRecepcionEmb) return;
    confirmarRecepcion(activeRecepcionEmb.id, recepcionItems);
    setActiveRecepcionEmb(null);
  };
  const averyPrintRef = useRef<HTMLDivElement>(null);
  const [printAveryData, setPrintAveryData] = useState<{ ordenTitle: string, itemsList: typeof terminados } | null>(null);

  const handlePrintStoreQRs = (e: React.MouseEvent, tiendaId: number, productoId: number, count: number, productName: string) => {
    e.stopPropagation();
    const tName = tiendas.find(t => t.id === tiendaId)?.nombre || 'STOCK TIENDA';
    const storeQRs = new Set<string>();
    embarques.forEach(emb => {
      if (emb.estatus === 'entregado') {
        emb.items.forEach(item => {
          if (item.producto_id === productoId && item.estado_recepcion === 'ok' && item.tienda_destino_id === tiendaId) {
            storeQRs.add(item.qr_code);
          }
        });
      }
    });

    ventas.forEach(venta => {
      if (venta.tienda_id === tiendaId) {
        venta.items.forEach(item => {
          if (item.producto_id === productoId) {
            storeQRs.delete(item.qr_code);
          }
        });
      }
    });

    const qrList = Array.from(storeQRs).slice(0, count);
    let index = 0;
    while (qrList.length < count) {
      qrList.push(`DCR-REC-${tiendaId}-${productoId}-${Date.now()}-${index}`);
      index++;
    }

    const prod = productos.find(p => p.id === productoId);
    const price = prod ? (prod.prices['Publico'] || prod.prices['General'] || Object.values(prod.prices)[0] || 0) : 0;
    setPrintQRs({ nombre: productName, qrs: qrList, tiendaNombre: tName, precio: price });
  };

  const handlePrintLote = () => {
    if (!printQRs) return;
    const w = window.open('', '_blank');
    if (!w) return;

    const css = `
      @page { margin: 0; size: 5.72cm 3.18cm; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
        background: white;
        color: black;
      }
      .label-page {
        width: 5.72cm;
        height: 3.18cm;
        padding: 0.15cm;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        page-break-after: always;
        break-after: page;
      }
      .qr-container {
        width: 2.3cm;
        height: 2.3cm;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .qr-container svg {
        width: 100%;
        height: 100%;
      }
      .details {
        margin-left: 0.15cm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex-grow: 1;
        overflow: hidden;
      }
      .title {
        font-size: 8px;
        font-weight: 900;
        text-transform: uppercase;
        margin: 0 0 1px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .meta {
        font-size: 6.5px;
        margin: 0 0 1px 0;
        line-height: 1.1;
      }
      .sku {
        font-family: monospace;
        font-size: 6.5px;
        font-weight: bold;
        margin-top: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;

    const modalContainers = document.querySelectorAll('.print-only-container .qr-label-svg-container');
    let labelsHtml = '';

    printQRs.qrs.forEach((qr, idx) => {
      const svgHtml = modalContainers[idx]?.innerHTML || '';
      labelsHtml += `
        <div class="label-page">
          <div class="qr-container">
            ${svgHtml}
          </div>
          <div class="details">
            <h1 class="title">${printQRs.nombre}</h1>
            <p class="meta"><strong>Origen:</strong> Stock Tienda</p>
            <p class="meta"><strong>Destino:</strong> ${printQRs.tiendaNombre}</p>
            <div class="sku">${qr}</div>
          </div>
        </div>
      `;
    });

    w.document.write(`<html><head><title>Etiquetas Lote</title><style>${css}</style></head><body>
      ${labelsHtml}
      <script>window.onload=function(){setTimeout(window.print, 250);}</script>
    </body></html>`);
    w.document.close();
  };

  const handlePrintOrdenCompleta = (ordenTitle: string, itemsList: typeof terminados) => {
    // Seteamos el estado para que React renderice los QRs SVG en el DOM oculto
    setPrintAveryData({ ordenTitle, itemsList });

    // Esperamos a que React termine de pintar el DOM local
    setTimeout(() => {
      const w = window.open('', '_blank');
      if (!w) {
        setPrintAveryData(null);
        return;
      }

      const qrHtmlContent = averyPrintRef.current?.innerHTML || '';

      const css = `
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        
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

        /* Contenedor de cada página física Avery 5163 (8.5in x 11in) */
        .avery-page {
          width: 8.5in;
          height: 11in;
          box-sizing: border-box;
          padding-top: 0.5in;
          padding-bottom: 0.5in;
          padding-left: 0.16in;
          padding-right: 0.16in;
          page-break-after: always;
          break-after: page;
          display: grid;
          grid-template-columns: 4in 4in;
          grid-template-rows: 2in 2in 2in 2in 2in;
          column-gap: 0.18in;
          row-gap: 0in;
          overflow: hidden;
        }

        /* Cada etiqueta individual (4in x 2in) */
        .avery-label {
          width: 4in;
          height: 2in;
          box-sizing: border-box;
          padding: 0.15in 0.25in;
          display: flex;
          align-items: center;
          gap: 0.2in;
          border: 1px dashed #ccc;
          overflow: hidden;
          background: white;
        }

        .qr-container {
          width: 1.1in;
          height: 1.1in;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .qr-container svg {
          width: 100%;
          height: 100%;
        }

        .info-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          line-height: 1.3;
        }

        .info-title {
          font-size: 11px;
          font-weight: 900;
          margin: 0 0 3px 0;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .info-subtitle {
          font-size: 9px;
          color: #000;
          margin: 0 0 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .info-qr-text {
          font-size: 9px;
          font-weight: bold;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          word-break: break-all;
          margin: 4px 0 0 0;
          line-height: 1.2;
        }
      `;
      w.document.write(`
        <html>
          <head>
            <title>Imprimir Etiquetas ${ordenTitle}</title>
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
      setPrintAveryData(null);
    }, 150);
  };

  // -- Materia Prima Tab --
  const mpSorted = useMemo(() => [...materiaPrima], [materiaPrima]);

  // -- Tienda Tab Drill-down --
  const tiendaData = useMemo(() => {
    // 1. Tiendas level
    if (!selectedTiendaId) {
      return tiendas.map(t => {
        const inv = inventario.filter(i => i.tienda_id === t.id);
        const total = inv.reduce((sum, i) => sum + i.cantidad_disponible, 0);
        return { type: 'tienda' as const, id: t.id, name: t.nombre, count: total };
      });
    }
    
    // 2. Categories level
    const invTienda = inventario.filter(i => i.tienda_id === selectedTiendaId);
    if (!selectedCategory) {
      const cats = new Map<string, number>();
      invTienda.forEach(i => {
        const p = productos.find(prod => prod.id === i.producto_id);
        const cat = p?.type || 'Otros';
        cats.set(cat, (cats.get(cat) || 0) + i.cantidad_disponible);
      });
      return Array.from(cats.entries()).map(([cat, total]) => ({ type: 'category' as const, id: cat, name: cat, count: total }));
    }
    
    // 3. Products level
    const catProducts = productos.filter(p => p.type.toLowerCase() === selectedCategory.toLowerCase());
    return catProducts.map(p => {
      const invRecord = invTienda.find(i => i.producto_id === p.id);
      const count = invRecord ? invRecord.cantidad_disponible : 0;
      const price = invRecord ? invRecord.precio_venta : (p.prices['Publico'] || p.prices['General'] || Object.values(p.prices)[0] || 0);
      return {
        type: 'product' as const,
        id: p.id,
        name: p.name,
        count: count,
        price: price
      };
    }).sort((a, b) => b.count - a.count);
  }, [inventario, productos, tiendas, selectedTiendaId, selectedCategory]);

  // -- Terminados Tab --
  const terminadosGrouped = useMemo(() => {
    const hoy = Date.now();
    const withDays = terminados.map(t => ({ ...t, dias: Math.floor((hoy - new Date(t.fecha_listo).getTime()) / 86400000) }));
    
    const filtered = withDays.filter(t => 
      !searchTerm || 
      t.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.qr_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group by orden_id
    const grouped = new Map<string, typeof withDays>();
    filtered.forEach(t => {
      const groupKey = `Orden #${t.orden_id}`;
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey)!.push(t);
    });

    return Array.from(grouped.entries()).sort((a, b) => {
      const aNum = Number(a[0].replace('Orden #', ''));
      const bNum = Number(b[0].replace('Orden #', ''));
      return bNum - aNum;
    });
  }, [terminados, searchTerm]);

  const tabs = [
    { key: 'terminados' as Tab, label: 'Terminados sin Embarcar', icon: <Package size={14} />, count: terminados.length },
    { key: 'tienda' as Tab, label: 'Tienda', icon: <Store size={14} />, count: inventario.reduce((acc, curr) => acc + curr.cantidad_disponible, 0) },
    { key: 'materia_prima' as Tab, label: 'Materia Prima', icon: <TreePine size={14} />, count: materiaPrima.length },
  ].filter(t => {
    if (isGerenteTienda) {
      return t.key === 'tienda';
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Tabs */}
      {!isGerenteTienda && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearchTerm(''); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}>
              {t.icon} {t.label} <span className="text-[10px] opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Materia Prima */}
      {tab === 'materia_prima' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50 gap-4">
            <p className="text-xs text-zinc-500">Ajusta las cantidades de las maderas e insumos del taller y presiona el botón para guardar en la base de datos.</p>
            <button onClick={guardarMateriaPrima} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2 shrink-0"><Save size={14} /> Guardar Cambios</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-fade-in">
          {mpSorted.map(mp => {
            const pct = Math.min(100, (mp.cantidad / (mp.minimo * 3)) * 100);
            const isCritical = mp.cantidad <= mp.minimo;
            return (
              <div key={mp.id} className={`glass-card p-5 space-y-3 ${isCritical ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ background: mp.color }} />
                    <h3 className="text-sm font-bold text-zinc-100">{mp.nombre}</h3>
                  </div>
                  {isCritical && <AlertTriangle size={16} className="text-red-400 animate-pulse" />}
                </div>
                <div className="text-center flex flex-col items-center">
                  <input 
                    type="number"
                    step={Number(mp.permite_decimales) === 1 ? "0.01" : "1"}
                    value={mp.cantidad}
                    onChange={e => {
                      let val = e.target.value;
                      if (val === '') {
                        updateMateriaPrima(mp.id, 0, true);
                        return;
                      }
                      let num = parseFloat(val);
                      if (Number(mp.permite_decimales) !== 1) {
                        num = Math.round(num);
                      }
                      if (isNaN(num)) num = 0;
                      updateMateriaPrima(mp.id, num, true);
                    }}
                    className={`bg-transparent border-b border-zinc-700/50 font-black text-3xl text-center w-28 focus:border-amber-500 focus:outline-none ${isCritical ? 'text-red-400' : 'text-zinc-100'}`}
                  />
                  <p className="text-xs text-zinc-500 mt-1">{mp.unidad}</p>
                </div>
                {/* Gauge */}
                <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : pct > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  {/* Min line */}
                  <div className="absolute top-0 h-full w-0.5 bg-zinc-500" style={{ left: `${(mp.minimo / (mp.minimo * 3)) * 100}%` }} />
                </div>
                <div className="text-[10px] text-zinc-600 text-center flex items-center justify-center gap-1">
                  <span>Mínimo:</span>
                  <input 
                    type="number"
                    step={Number(mp.permite_decimales) === 1 ? "0.01" : "1"}
                    value={mp.minimo}
                    onChange={e => {
                      let val = e.target.value;
                      if (val === '') {
                        updateMateriaPrima(mp.id, 0, true, 'minimo');
                        return;
                      }
                      let num = parseFloat(val);
                      if (Number(mp.permite_decimales) !== 1) {
                        num = Math.round(num);
                      }
                      if (isNaN(num)) num = 0;
                      updateMateriaPrima(mp.id, num, true, 'minimo');
                    }}
                    className="bg-transparent border-b border-zinc-700/30 text-zinc-400 text-center w-12 focus:border-amber-500 focus:outline-none"
                  />
                  <span>{mp.unidad}</span>
                </div>
                {/* Actions */}
                <div className="flex gap-2 justify-center">
                  <button onClick={() => updateMateriaPrima(mp.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all"><Minus size={14} /></button>
                  <button onClick={() => updateMateriaPrima(mp.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all"><Plus size={14} /></button>
                  <button onClick={() => updateMateriaPrima(mp.id, 5)} className="h-8 px-3 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-bold">+5</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Terminados sin Embarcar */}
      {tab === 'terminados' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input type="text" placeholder="Buscar por producto, cliente o QR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-dark pl-10" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {terminadosGrouped.length === 0 ? (
              <div className="col-span-full glass-card p-12 text-center"><p className="text-zinc-600 text-sm">Sin piezas terminadas encontradas</p></div>
            ) : terminadosGrouped.map(([productoName, items]) => (
              <div key={productoName} className="glass-card p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-700/50 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-zinc-100">{productoName}</h3>
                    <button 
                      onClick={() => handlePrintOrdenCompleta(productoName, items)} 
                      className="p-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 rounded-lg border border-zinc-700/50 transition-colors flex items-center gap-1.5 text-[10px] font-bold"
                      title="Imprimir todas las etiquetas de esta orden en formato Avery"
                    >
                      <Printer size={12} /> Imprimir Orden Completa
                    </button>
                  </div>
                  <span className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold">{items.length} piezas</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                  {items.map(t => (
                    <div key={t.id} className={`bg-zinc-800/40 p-3 rounded-lg flex items-center gap-3 border transition-colors ${t.dias > 7 ? 'border-red-500/30' : 'border-zinc-700/30'}`}>
                      <div className="shrink-0">
                      {(() => {
                        const prod = productos.find(p => p.id === t.producto_id || p.name === t.producto_nombre);
                        const price = prod ? (prod.prices['Publico'] || prod.prices['General'] || Object.values(prod.prices)[0] || 0) : 0;
                        return (
                          <QRLabel qrCode={t.qr_code} productoNombre={t.producto_nombre} ordenId={t.orden_id} clienteNombre={t.cliente_nombre} acabado={t.acabado} precio={price} size={40} showPrint={true} />
                        );
                      })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300">{t.cliente_nombre} · {t.acabado}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{t.qr_code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`flex items-center gap-1 ${t.dias > 7 ? 'text-red-400' : t.dias > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          <Timer size={12} />
                          <span className="text-[10px] font-bold">{t.dias} días</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tienda */}
      {tab === 'tienda' && (
        <div className="space-y-4">
          {/* Embarques Pendientes de Recibir en esta Tienda */}
          {embarquesEnCamino.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                📦 {embarquesEnCamino.length} {embarquesEnCamino.length === 1 ? 'Embarque Pendiente' : 'Embarques Pendientes'} de Recibir
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {embarquesEnCamino.map(emb => (
                  <div key={emb.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200">Embarque #{emb.id}</p>
                      <p className="text-[10px] text-zinc-400 truncate">Destino: {tiendas.find(t => t.id === (emb.tienda_destino_id || emb.items.find(i => i.tienda_destino_id > 0)?.tienda_destino_id))?.nombre} · {emb.items.length} piezas</p>
                      <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded mt-1.5 uppercase ${
                        emb.estatus === 'en_sucursal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {emb.estatus === 'en_sucursal' ? 'Llegó (Confirmar Recibo)' : 'En Tránsito'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleOpenRecepcion(emb)}
                      className="btn-primary py-2 px-4 text-xs font-bold shrink-0"
                    >
                      Recibir Pedido
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-zinc-800/30 px-4 py-2.5 rounded-lg border border-zinc-700/30">
            {!isGerenteTienda ? (
              <button onClick={() => { setSelectedTiendaId(null); setSelectedCategory(null); }} className={`hover:text-amber-400 ${!selectedTiendaId ? 'text-amber-400' : ''}`}>Todas las Tiendas</button>
            ) : (
              <span className="text-zinc-300">
                {posTiendaId ? tiendas.find(t => t.id === posTiendaId)?.nombre : 'Seleccionar Tienda'}
              </span>
            )}
            
            {/* Si es gerente y posTiendaId es null, pero ya seleccionó una, mostrar su nombre */}
            {isGerenteTienda && !posTiendaId && selectedTiendaId && (
              <>
                <span className="text-zinc-600">/</span>
                <button onClick={() => setSelectedCategory(null)} className={`hover:text-amber-400 ${!selectedCategory ? 'text-amber-400' : ''}`}>
                  {tiendas.find(t => t.id === selectedTiendaId)?.nombre}
                </button>
              </>
            )}

            {/* Para administradores o encargado de taller */}
            {!isGerenteTienda && selectedTiendaId && (
              <>
                <span className="text-zinc-600">/</span>
                <button onClick={() => setSelectedCategory(null)} className={`hover:text-amber-400 ${!selectedCategory ? 'text-amber-400' : ''}`}>
                  {tiendas.find(t => t.id === selectedTiendaId)?.nombre}
                </button>
              </>
            )}

            {selectedCategory && (
              <>
                <span className="text-zinc-600">/</span>
                <span className="text-amber-400">{selectedCategory}</span>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tiendaData.length === 0 ? (
               <div className="col-span-full glass-card p-12 text-center"><p className="text-zinc-600 text-sm">No hay inventario en esta sección</p></div>
            ) : tiendaData.map((item) => (
              <div 
                key={item.id} 
                onClick={() => {
                  if (item.type === 'tienda') setSelectedTiendaId(item.id as number);
                  else if (item.type === 'category') setSelectedCategory(item.id as string);
                }}
                className={`glass-card p-4 flex flex-col items-center text-center transition-colors relative ${item.type !== 'product' ? 'hover:border-amber-500/50 hover:bg-zinc-800/40 cursor-pointer' : ''}`}
              >
                <div className={`w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center mb-3 ${item.type !== 'product' ? 'text-amber-400 group-hover:scale-110 transition-transform' : 'text-zinc-500'}`}>
                  {item.type === 'tienda' ? <Store size={32} /> : item.type === 'category' ? <Package size={32} /> : <Store size={32} />}
                </div>
                <h3 className="text-xs font-bold text-zinc-200 line-clamp-2 min-h-[32px]">{item.name}</h3>
                {isGerenteTienda && item.type === 'product' ? (
                  <div className="flex items-center gap-1 mt-2 mb-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => updateStockTienda(selectedTiendaId as number, item.id as number, Math.max(0, item.count - 1))} 
                      className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-sm font-bold"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      value={item.count}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        updateStockTienda(selectedTiendaId as number, item.id as number, Math.max(0, val));
                      }}
                      className="bg-transparent border-b border-zinc-700 font-black text-lg text-center w-12 text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                    <button 
                      onClick={() => updateStockTienda(selectedTiendaId as number, item.id as number, item.count + 1)} 
                      className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-2xl font-black text-amber-400">{item.count}</div>
                )}
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">
                  {item.type === 'tienda' ? 'Piezas Totales' : item.type === 'category' ? 'Piezas' : 'En Stock'}
                </p>
                {item.type === 'product' && item.price && (
                  <p className="mt-2 text-[10px] text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded w-full">
                    ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {item.type === 'product' && (
                  <button 
                    onClick={(e) => handlePrintStoreQRs(e, selectedTiendaId as number, item.id as number, item.count, item.name)} 
                    className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Imprimir QRs"
                  >
                    <QrCode size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print QRs Modal */}
      {printQRs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-zinc-700/50 flex justify-between items-center bg-zinc-800/90 rounded-t-2xl">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2"><Printer size={18} className="text-amber-400" /> Imprimir Etiquetas: {printQRs.nombre}</h3>
              <button onClick={() => setPrintQRs(null)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 print-only-container flex-1">
              <div className="grid grid-cols-2 gap-4">
                {printQRs.qrs.map(qr => (
                   <QRLabel key={qr} qrCode={qr} productoNombre={printQRs.nombre} ordenId={0} clienteNombre={printQRs.tiendaNombre} acabado="-" precio={printQRs.precio} size={120} />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-700/50 flex justify-end gap-3 bg-zinc-800/90 rounded-b-2xl">
              <button onClick={() => setPrintQRs(null)} className="btn-ghost">Cancelar</button>
              <button onClick={handlePrintLote} className="btn-primary flex items-center gap-1.5"><Printer size={16} /> Imprimir {printQRs.qrs.length} Etiquetas</button>
            </div>
          </div>
        </div>
      )}
      {/* Contenedor oculto para renderizar los QRs síncronamente antes de imprimir */}
      <div style={{ display: 'none' }} ref={averyPrintRef}>
        {printAveryData && (() => {
          const labelGroups = [];
          for (let i = 0; i < printAveryData.itemsList.length; i += 10) {
            labelGroups.push(printAveryData.itemsList.slice(i, i + 10));
          }
          return labelGroups.map((group, pageIndex) => (
            <div key={pageIndex} className="avery-page">
              {group.map(item => (
                <div key={item.id} className="avery-label">
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

      {/* Real Print Area (only visible on media print) */}
      <div className="hidden print:block print:w-full print:absolute print:top-0 print:left-0 print:bg-white print:z-50 print-area">
        <style>{`
          @media print {
            @page { margin: 10mm; size: letter; }
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
            }
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
        <div className="grid grid-cols-3 gap-y-6 gap-x-4">
          {printQRs && printQRs.qrs.map(qr => (
            <div key={qr} className="break-inside-avoid flex justify-center">
              <QRLabel qrCode={qr} productoNombre={printQRs.nombre} ordenId={0} clienteNombre={printQRs.tiendaNombre} acabado="-" precio={printQRs.precio} size={80} showPrint={false} />
            </div>
          ))}
        </div>
      </div>
      {/* Modal de Recepción Táctil de Embarque */}
      {activeRecepcionEmb && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-zinc-700/50 flex justify-between items-center bg-zinc-800/90 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                  📦 Recibir Mercancía: Embarque #{activeRecepcionEmb.id}
                </h3>
                <p className="text-[10px] text-zinc-400">Verifica la calidad y piezas físicas al ingresar a tienda</p>
              </div>
              <button onClick={() => setActiveRecepcionEmb(null)} className="text-zinc-500 hover:text-zinc-300">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {recepcionItems.map((item) => (
                <div key={item.qr_code} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200">{item.producto_nombre}</p>
                    <p className="text-[9px] font-mono text-zinc-500">{item.qr_code}</p>
                  </div>
                  
                  {/* Selector Táctil */}
                  <div className="flex gap-1.5 shrink-0 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'ok')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                        item.estado_recepcion === 'ok' 
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10 font-black' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      ✓ OK
                    </button>
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'dañado')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                        item.estado_recepcion === 'dañado' 
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/10 font-black' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      ⚠️ Dañado
                    </button>
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'faltante')}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                        item.estado_recepcion === 'faltante' 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/10 font-black' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      ✖ Faltante
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-700/50 flex justify-end gap-3 bg-zinc-800/90 rounded-b-2xl">
              <button onClick={() => setActiveRecepcionEmb(null)} className="btn-ghost">Cancelar</button>
              <button 
                onClick={handleConfirmarRecepcionClick}
                className="btn-primary px-6 py-2 text-xs font-bold"
              >
                ✓ Confirmar Recepción de Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
