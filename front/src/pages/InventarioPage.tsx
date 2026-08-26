import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, TreePine, Store, Search, Minus, Plus, Timer, AlertTriangle, 
  QrCode, Printer, X, RefreshCw, CheckCircle2, ArrowDownToLine, SlidersHorizontal,
  LayoutGrid, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, Filter,
  DollarSign, Layers, FileSpreadsheet, Eye, Edit2, Trash2, Save
} from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';
import { QRCodeSVG } from 'qrcode.react';

type Tab = 'tienda' | 'materia_prima' | 'terminados';

import type { Embarque, EmbarqueItem, MateriaPrima } from '../store/useStore';

export default function InventarioPage() {
  const { 
    currentUser, inventario, materiaPrima, terminados, updateMateriaPrima, 
    crearMateriaPrima, actualizarMateriaPrima, eliminarMateriaPrima,
    tiendas, productos, embarques, ventas, devoluciones, confirmarRecepcion,
    ajustarInventarioManual, fetchInventarioTienda
  } = useDecor();
  const isGerenteTienda = currentUser?.rol === 'gerente_tienda';
  const posTiendaId = localStorage.getItem('decor_pos_tienda_id') ? Number(localStorage.getItem('decor_pos_tienda_id')) : null;

  const [tab, setTab] = useState<Tab>(isGerenteTienda ? 'tienda' : 'tienda');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Modal de Alta / Edición de Materia Prima
  const [showModalMP, setShowModalMP] = useState(false);
  const [editingMP, setEditingMP] = useState<MateriaPrima | null>(null);
  const [guardandoMP, setGuardandoMP] = useState(false);
  const [mpForm, setMpForm] = useState({
    nombre: '',
    tipo: 'madera',
    subtipo: '',
    unidad: 'tabla',
    cantidad: 0,
    minimo: 10,
    maximo: 100,
    costo_unitario: 0,
    codigo_referencia: '',
  });

  // Estados de Vista Dual (Tabla vs Tarjetas) y Filtros Multicriterio (DEC-011 / DEC-015 / DEC-016)
  const [viewModeTienda, setViewModeTienda] = useState<'table' | 'grid'>('table');
  const [filtroTiendaId, setFiltroTiendaId] = useState<number | 'todas'>(isGerenteTienda ? (posTiendaId || 'todas') : 'todas');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroEstadoStock, setFiltroEstadoStock] = useState<'todos' | 'con_stock' | 'disponible' | 'bajo' | 'agotado' | 'critico'>('todos');
  const [ordenColumna, setOrdenColumna] = useState<'producto' | 'sku' | 'tienda' | 'categoria' | 'stock' | 'precio' | 'valor'>('producto');
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc');

  // Estados para Vistas Alternativas en Terminados y Materia Prima
  const [viewModeTerminados, setViewModeTerminados] = useState<'cards' | 'table'>('table');
  const [viewModeMP, setViewModeMP] = useState<'cards' | 'table'>('cards');

  // Sincronizar inventario al cambiar la sucursal seleccionada
  useEffect(() => {
    fetchInventarioTienda(filtroTiendaId);
  }, [filtroTiendaId, fetchInventarioTienda]);
  
  // Drill-down states for Tienda
  const [selectedTiendaId, setSelectedTiendaId] = useState<number | null>(isGerenteTienda ? posTiendaId : null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [printQRs, setPrintQRs] = useState<{ nombre: string, qrs: string[], tiendaNombre: string } | null>(null);

  // States for Shop Receiving Flow
  const [activeRecepcionEmb, setActiveRecepcionEmb] = useState<Embarque | null>(null);
  const [recepcionItems, setRecepcionItems] = useState<EmbarqueItem[]>([]);

  // States for Manual Stock Adjustment Modal (DEC-004)
  const [showModalAjuste, setShowModalAjuste] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [guardandoAjuste, setGuardandoAjuste] = useState(false);
  const [alertaAjuste, setAlertaAjuste] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);
  const [busquedaProductoAjuste, setBusquedaProductoAjuste] = useState('');
  const [ajusteForm, setAjusteForm] = useState<{
    tienda_id: number;
    producto_id: number;
    tipo: 'entrada' | 'ajuste';
    cantidad: number;
    precio_venta: number;
    costo_unitario: number;
    origen_stock: 'embarque_taller' | 'compra_externa' | 'artesania' | 'pieza_unica';
    notas: string;
    es_absoluto: boolean;
  }>({
    tienda_id: posTiendaId || 1,
    producto_id: 0,
    tipo: 'entrada',
    cantidad: 1,
    precio_venta: 0,
    costo_unitario: 0,
    origen_stock: 'embarque_taller',
    notas: '',
    es_absoluto: false,
  });

  const targetTiendaId = isGerenteTienda ? posTiendaId : selectedTiendaId;

  // Embarques en tránsito o en sucursal destinados a esta tienda
  const embarquesEnCamino = useMemo(() => {
    if (!targetTiendaId) return [];
    return embarques.filter(e => {
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
      estado_recepcion: (item.estado_recepcion || 'ok') as any
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

  // Handlers para Captura y Ajuste Manual (DEC-004)
  const productosFiltradosAjuste = useMemo(() => {
    if (!busquedaProductoAjuste.trim()) return productos.slice(0, 12);
    const q = busquedaProductoAjuste.toLowerCase();
    return productos.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [productos, busquedaProductoAjuste]);

  const handleSeleccionarProductoAjuste = (prod: typeof productos[0]) => {
    const primerPrecio = prod.prices ? (Object.values(prod.prices)[0] || 0) : 0;
    setAjusteForm(prev => ({
      ...prev,
      producto_id: prod.id,
      precio_venta: primerPrecio,
      costo_unitario: prod.costo_produccion || Math.round(primerPrecio * 0.4),
    }));
  };

  const handleRefrescarInventario = async () => {
    setIsRefreshing(true);
    await fetchInventarioTienda(targetTiendaId || 1);
    setIsRefreshing(false);
  };

  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajusteForm.producto_id) {
      setAlertaAjuste({ tipo: 'error', mensaje: 'Debes seleccionar un producto del catálogo.' });
      return;
    }
    if (ajusteForm.cantidad <= 0) {
      setAlertaAjuste({ tipo: 'error', mensaje: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    setGuardandoAjuste(true);
    setAlertaAjuste(null);

    const res = await ajustarInventarioManual(ajusteForm);
    if (res.ok) {
      setAlertaAjuste({ tipo: 'success', mensaje: res.message || 'Inventario actualizado correctamente.' });
      setTimeout(() => {
        setShowModalAjuste(false);
        setAlertaAjuste(null);
        setAjusteForm(prev => ({
          ...prev,
          producto_id: 0,
          cantidad: 1,
          notas: '',
          precio_venta: 0,
          costo_unitario: 0,
        }));
        setBusquedaProductoAjuste('');
      }, 1000);
    } else {
      setAlertaAjuste({ tipo: 'error', mensaje: res.message || 'Error al guardar el ajuste.' });
    }
    setGuardandoAjuste(false);
  };

  const averyPrintRef = useRef<HTMLDivElement>(null);
  const [printAveryData, setPrintAveryData] = useState<{ ordenTitle: string, itemsList: typeof terminados } | null>(null);

  const handlePrintStoreQRs = (e: React.MouseEvent, tiendaId: number, productoId: number, count: number, productName: string) => {
    e.stopPropagation();
    const tObj = tiendas.find(t => Number(t.id) === Number(tiendaId));
    const tName = tObj?.nombre || (
      Number(tiendaId) === 1 ? 'Sucursal Matriz (Centro)' : 
      Number(tiendaId) === 2 ? 'Sucursal Norte' : 
      Number(tiendaId) === 3 ? 'Sucursal Sur' : `Sucursal #${tiendaId}`
    );
    const storeQRs = new Set<string>();
    embarques.forEach(emb => {
      if (emb.estatus === 'entregado') {
        emb.items.forEach(item => {
          if (item.producto_id === productoId && item.estado_recepcion === 'ok' && Number(item.tienda_destino_id) === Number(tiendaId)) {
            storeQRs.add(item.qr_code);
          }
        });
      }
    });

    ventas.forEach(venta => {
      if (Number(venta.tienda_id) === Number(tiendaId)) {
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

    setPrintQRs({ nombre: productName, qrs: qrList, tiendaNombre: tName });
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
      .branch-header {
        background: #0d9488;
        color: white;
        padding: 2px 4px;
        font-size: 6.5px;
        font-weight: 900;
        text-transform: uppercase;
        text-align: center;
        border-radius: 2px;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
            <div class="branch-header">📍 ${printQRs.tiendaNombre}</div>
            <h1 class="title">${printQRs.nombre}</h1>
            <p class="meta"><strong>Origen:</strong> Stock Tienda</p>
            <div class="sku">${qr}</div>
          </div>
        </div>
      `;
    });

    w.document.write(`<html><head><title>Etiquetas Lote - ${printQRs.tiendaNombre}</title><style>${css}</style></head><body>
      ${labelsHtml}
      <script>window.onload=function(){setTimeout(window.print, 250);}</script>
    </body></html>`);
    w.document.close();
  };

  const handlePrintOrdenCompleta = (ordenTitle: string, itemsList: typeof terminados) => {
    setPrintAveryData({ ordenTitle, itemsList });

    setTimeout(() => {
      const w = window.open('', '_blank');
      if (!w) {
        setPrintAveryData(null);
        return;
      }

      const qrHtmlContent = averyPrintRef.current?.innerHTML || '';

      const css = `
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        @page { size: letter; margin: 0; }
        body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; }
        .avery-page {
          width: 8.5in; height: 11in; box-sizing: border-box; padding-top: 0.5in; padding-bottom: 0.5in; padding-left: 0.16in; padding-right: 0.16in;
          page-break-after: always; break-after: page; display: grid; grid-template-columns: 4in 4in; grid-template-rows: repeat(5, 2in); column-gap: 0.18in; row-gap: 0in;
        }
        .avery-label { width: 4in; height: 2in; box-sizing: border-box; padding: 0.15in; display: flex; align-items: center; border: 1px dashed #e4e4e7; overflow: hidden; }
        .qr-container { width: 1.5in; height: 1.5in; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qr-container svg { width: 100%; height: 100%; }
        .info-container { margin-left: 0.2in; display: flex; flex-direction: column; justify-content: center; flex-grow: 1; overflow: hidden; }
        .info-title { font-size: 13px; font-weight: 900; text-transform: uppercase; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .info-subtitle { font-size: 10px; margin: 0 0 2px 0; }
        .info-qr-text { font-family: 'Courier Prime', monospace; font-size: 9px; font-weight: bold; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `;

      w.document.write(`
        <html>
          <head><title>Imprimir Avery 5163 - ${ordenTitle}</title><style>${css}</style></head>
          <body>${qrHtmlContent}<script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 250); };</script></body>
        </html>
      `);
      w.document.close();
      setPrintAveryData(null);
    }, 150);
  };

  const mpSorted = useMemo(() => {
    return [...materiaPrima].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [materiaPrima]);

  const tiendaData = useMemo(() => {
    if (!selectedTiendaId) {
      return tiendas.map(t => {
        const count = inventario
          .filter(i => i.tienda_id === t.id)
          .reduce((sum, i) => sum + i.cantidad_disponible, 0);
        return { id: t.id, name: t.nombre, count, type: 'tienda' as const };
      });
    }

    if (!selectedCategory) {
      const categoriesMap = new Map<string, number>();
      inventario
        .filter(i => i.tienda_id === selectedTiendaId)
        .forEach(item => {
          const prod = productos.find(p => p.id === item.producto_id);
          const cat = prod?.type || 'Otros';
          categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + item.cantidad_disponible);
        });

      return Array.from(categoriesMap.entries()).map(([name, count]) => ({
        id: name,
        name,
        count,
        type: 'category' as const
      }));
    }

    return inventario
      .filter(i => i.tienda_id === selectedTiendaId)
      .map(item => {
        const prod = productos.find(p => p.id === item.producto_id);
        if (prod?.type !== selectedCategory && (selectedCategory !== 'Otros' || prod?.type)) {
          return null;
        }
        return {
          id: item.producto_id,
          name: prod?.name || `Producto #${item.producto_id}`,
          count: item.cantidad_disponible,
          price: prod?.prices ? Object.values(prod.prices)[0] : undefined,
          type: 'product' as const
        };
      })
      .filter(Boolean) as { id: number; name: string; count: number; price?: number; type: 'product' }[];
  }, [inventario, tiendas, productos, selectedTiendaId, selectedCategory]);

  const terminadosGrouped = useMemo(() => {
    const hoy = Date.now();
    const withDays = terminados.map(t => ({
      ...t,
      dias: Math.floor((hoy - new Date(t.fecha_listo).getTime()) / 86400000)
    }));

    const filtered = withDays.filter(t => 
      !searchTerm || 
      t.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.qr_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = new Map<string, typeof withDays>();
    filtered.forEach(t => {
      const groupKey = `Orden #${t.orden_id}`;
      if (!grouped.has(groupKey)) grouped.set(groupKey, []);
      grouped.get(groupKey)!.push(t);
    });

    return Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [terminados, searchTerm]);

  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    productos.forEach(p => {
      if (p.type) cats.add(p.type);
    });
    return Array.from(cats).sort();
  }, [productos]);

  const inventarioTabla = useMemo(() => {
    return inventario.map(item => {
      const prod = productos.find(p => Number(p.id) === Number(item.producto_id));
      const tienda = tiendas.find(t => Number(t.id) === Number(item.tienda_id));
      const tiendaIdNum = Number(item.tienda_id) || 1;
      const tiendaNombre = (item as any).tienda_nombre || tienda?.nombre || (
        tiendaIdNum === 1 ? 'Sucursal Matriz (Centro)' : 
        tiendaIdNum === 2 ? 'Sucursal Norte' : 
        tiendaIdNum === 3 ? 'Sucursal Sur' : `Sucursal #${tiendaIdNum}`
      );
      const precio = (Number(item.precio_venta) > 0) 
        ? Number(item.precio_venta) 
        : (prod?.prices ? Object.values(prod.prices)[0] || 0 : 0);
      const stockNum = Number(item.cantidad_disponible) || 0;
      const valorTotal = stockNum * precio;

      return {
        id: item.id,
        tienda_id: tiendaIdNum,
        tienda_nombre: tiendaNombre,
        tienda_ciudad: tienda?.ciudad || 'Chihuahua',
        producto_id: Number(item.producto_id),
        producto_nombre: prod?.name || (item as any).producto_nombre || 'Mueble',
        sku: prod?.sku || (item as any).sku || `DCR-${item.producto_id}`,
        categoria: prod?.type || (item as any).categoria_nombre || 'Otros',
        stock: stockNum,
        reservado: Number(item.cantidad_reservada) || 0,
        precio: precio,
        costo: Number(item.costo_unitario) || (prod?.costo_produccion || 0),
        valor_total: valorTotal,
        ubicacion: item.ubicacion_especifica || 'Piso de Venta',
      };
    });
  }, [inventario, productos, tiendas]);

  // Inventario filtrado por texto, sucursal y categoría (Base para métricas de KPIs)
  const inventarioBase = useMemo(() => {
    return inventarioTabla.filter(item => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText = 
          item.producto_nombre.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.categoria.toLowerCase().includes(q) ||
          item.tienda_nombre.toLowerCase().includes(q);
        if (!matchText) return false;
      }

      if (filtroTiendaId !== 'todas' && item.tienda_id !== filtroTiendaId) {
        return false;
      }

      if (filtroCategoria !== 'todas' && item.categoria !== filtroCategoria) {
        return false;
      }

      return true;
    });
  }, [inventarioTabla, searchTerm, filtroTiendaId, filtroCategoria]);

  // Micro KPIs calculados sobre el conjunto base (DEC-015)
  const kpisInventario = useMemo(() => {
    const totalSkus = inventarioBase.length;
    const totalPiezas = inventarioBase.reduce((acc, curr) => acc + curr.stock, 0);
    const valorTotal = inventarioBase.reduce((acc, curr) => acc + curr.valor_total, 0);
    const articulosConStock = inventarioBase.filter(i => i.stock > 0).length;
    const articulosBajos = inventarioBase.filter(i => i.stock > 0 && i.stock <= 2).length;
    const articulosAgotados = inventarioBase.filter(i => i.stock === 0).length;

    return { totalSkus, totalPiezas, valorTotal, articulosConStock, articulosBajos, articulosAgotados };
  }, [inventarioBase]);

  // Inventario filtrado y ordenado final para la vista de tabla
  const inventarioFiltrado = useMemo(() => {
    return inventarioBase.filter(item => {
      if (filtroEstadoStock === 'con_stock' && item.stock <= 0) return false;
      if (filtroEstadoStock === 'disponible' && item.stock <= 2) return false;
      if (filtroEstadoStock === 'critico' && item.stock > 2) return false;
      if (filtroEstadoStock === 'bajo' && (item.stock < 1 || item.stock > 2)) return false;
      if (filtroEstadoStock === 'agotado' && item.stock !== 0) return false;

      return true;
    }).sort((a, b) => {
      const factor = ordenDireccion === 'asc' ? 1 : -1;
      switch (ordenColumna) {
        case 'producto':
          return a.producto_nombre.localeCompare(b.producto_nombre) * factor;
        case 'sku':
          return a.sku.localeCompare(b.sku) * factor;
        case 'tienda':
          return a.tienda_nombre.localeCompare(b.tienda_nombre) * factor;
        case 'categoria':
          return a.categoria.localeCompare(b.categoria) * factor;
        case 'stock':
          return (a.stock - b.stock) * factor;
        case 'precio':
          return (a.precio - b.precio) * factor;
        case 'valor':
          return (a.valor_total - b.valor_total) * factor;
        default:
          return 0;
      }
    });
  }, [inventarioBase, filtroEstadoStock, ordenColumna, ordenDireccion]);

  const handleSort = (col: typeof ordenColumna) => {
    if (ordenColumna === col) {
      setOrdenDireccion(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenColumna(col);
      setOrdenDireccion('asc');
    }
  };

  const handleAjusteRapido = (item: typeof inventarioTabla[0]) => {
    setAjusteForm(prev => ({
      ...prev,
      tienda_id: item.tienda_id,
      producto_id: item.producto_id,
      precio_venta: item.precio,
      costo_unitario: item.costo,
      cantidad: 1,
    }));
    setShowModalAjuste(true);
  };

  const handlePrintInventarioTabla = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const tiendaNombreFiltro = filtroTiendaId === 'todas' 
      ? 'Todas las Sucursales' 
      : tiendas.find(t => t.id === filtroTiendaId)?.nombre || `Sucursal #${filtroTiendaId}`;

    const rowsHtml = inventarioFiltrado.map(item => `
      <tr>
        <td style="font-family: monospace; font-weight: bold;">${item.sku}</td>
        <td><strong>${item.producto_nombre}</strong><br/><small style="color: #666;">${item.categoria}</small></td>
        <td>${item.tienda_nombre}</td>
        <td style="text-align: center; font-weight: bold; ${item.stock === 0 ? 'color: #dc2626;' : item.stock <= 2 ? 'color: #d97706;' : 'color: #0d9488;'}">${item.stock} pzas</td>
        <td style="text-align: right;">$${item.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold;">$${item.valor_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    w.document.write(`
      <html>
        <head>
          <title>Inventario Físico - Decor Mueblería</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; font-size: 11px; color: #222; }
            .header { border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; color: #0d9488; }
            .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
            .kpis { display: flex; gap: 20px; margin-bottom: 20px; background: #f9f9f9; padding: 10px; border-radius: 6px; }
            .kpi-item { font-size: 11px; }
            .kpi-item strong { display: block; font-size: 14px; color: #0d9488; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #f2f2f2; text-transform: uppercase; font-size: 9px; }
            @media print { body { margin: 15px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">DECOR MUEBLERÍA — REPORTE DE EXISTENCIAS DE INVENTARIO</div>
            <div class="subtitle">Sucursal: ${tiendaNombreFiltro} | Categoría: ${filtroCategoria} | Estado: ${filtroEstadoStock} | Emisión: ${new Date().toLocaleString('es-MX')}</div>
          </div>
          <div class="kpis">
            <div class="kpi-item">Total Modelos (SKUs): <strong>${kpisInventario.totalSkus}</strong></div>
            <div class="kpi-item">Unidades Físicas: <strong>${kpisInventario.totalPiezas}</strong></div>
            <div class="kpi-item">Valor Total Inventario: <strong>$${kpisInventario.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></div>
            <div class="kpi-item">Stock Bajo / Crítico: <strong style="color: #d97706;">${kpisInventario.articulosBajos + kpisInventario.articulosAgotados}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto y Categoría</th>
                <th>Sucursal</th>
                <th style="text-align: center;">Stock</th>
                <th style="text-align: right;">Precio Unitario</th>
                <th style="text-align: right;">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function() { setTimeout(window.print, 250); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const terminadosFlatList = useMemo(() => {
    const hoy = Date.now();
    return terminados.map(t => ({
      ...t,
      dias: Math.floor((hoy - new Date(t.fecha_listo).getTime()) / 86400000)
    })).filter(t => 
      !searchTerm || 
      t.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.qr_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.orden_id).includes(searchTerm)
    );
  }, [terminados, searchTerm]);

  const tabs = [
    { key: 'tienda' as Tab, label: 'Inventario de Tienda', icon: <Store size={14} />, count: inventario.reduce((acc, curr) => acc + curr.cantidad_disponible, 0) },
    { key: 'terminados' as Tab, label: 'Terminados sin Embarcar', icon: <Package size={14} />, count: terminados.length },
    { key: 'materia_prima' as Tab, label: 'Materia Prima', icon: <TreePine size={14} />, count: materiaPrima.length },
  ].filter(t => {
    if (isGerenteTienda) {
      return t.key === 'tienda';
    }
    return true;
  });

  return (
    <div className="space-y-5 text-left">
      {/* Selector de Pestañas */}
      {!isGerenteTienda && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 bg-white border border-stone-200 p-2 rounded-2xl shadow-sm">
          {tabs.map(t => (
            <button 
              key={t.key} 
              onClick={() => { setTab(t.key); setSearchTerm(''); }} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                tab === t.key 
                  ? 'bg-[#0d9488] text-white shadow-xs' 
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {t.icon} {t.label} <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab === t.key ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Pestaña: Tienda */}
      {tab === 'tienda' && (
        <div className="space-y-4">
          {/* Embarques Pendientes de Recibir en esta Tienda */}
          {embarquesEnCamino.length > 0 && (
            <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-[#0d9488]" /> {embarquesEnCamino.length} {embarquesEnCamino.length === 1 ? 'Embarque Pendiente' : 'Embarques Pendientes'} de Recibir en Tienda
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {embarquesEnCamino.map(emb => (
                  <div key={emb.id} className="bg-white border border-stone-200 rounded-xl p-3.5 flex justify-between items-center gap-3 shadow-xs">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900">Embarque #{emb.id}</p>
                      <p className="text-[10px] text-stone-500 truncate">Destino: {tiendas.find(t => t.id === (emb.tienda_destino_id || emb.items.find(i => i.tienda_destino_id > 0)?.tienda_destino_id))?.nombre} · {emb.items.length} piezas</p>
                      <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-1 uppercase border ${
                        emb.estatus === 'en_sucursal' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {emb.estatus === 'en_sucursal' ? 'Llegó a Sucursal' : 'En Tránsito'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleOpenRecepcion(emb)}
                      className="bg-[#0d9488] hover:bg-[#0f766e] text-white py-2 px-3.5 text-xs font-bold shrink-0 rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      Recibir Pedido
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra Superior: Selector de Modo de Vista y Acciones */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
            {/* Selector Dual: Tabla vs Tarjetas */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewModeTienda('table')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeTienda === 'table'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Ver inventario en tabla detallada con filtros"
              >
                <TableIcon size={14} />
                <span>Vista Tabla</span>
              </button>
              <button
                onClick={() => setViewModeTienda('grid')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeTienda === 'grid'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Ver inventario en tarjetas por sucursal"
              >
                <LayoutGrid size={14} />
                <span>Vista Tarjetas</span>
              </button>
            </div>

            {/* Acciones Globales */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleRefrescarInventario}
                disabled={isRefreshing}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 px-3 text-xs font-bold flex items-center gap-1.5 border border-stone-200 rounded-xl transition-all shadow-xs"
                title="Sincronizar inventario desde base de datos"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-teal-600' : ''} />
                <span className="hidden sm:inline">{isRefreshing ? 'Actualizando...' : 'Sincronizar'}</span>
              </button>

              {viewModeTienda === 'table' && (
                <button
                  onClick={handlePrintInventarioTabla}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 py-2 px-3 text-xs font-bold flex items-center gap-1.5 border border-stone-200 rounded-xl transition-all shadow-xs"
                  title="Imprimir reporte de existencias filtradas"
                >
                  <Printer size={14} />
                  <span>Imprimir Reporte</span>
                </button>
              )}

              <button
                onClick={() => {
                  setAjusteForm(prev => ({
                    ...prev,
                    tienda_id: targetTiendaId || (tiendas[0]?.id ?? 1),
                  }));
                  setShowModalAjuste(true);
                }}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white py-2 px-4 text-xs flex items-center gap-1.5 font-black shadow-sm rounded-xl transition-all active:scale-95"
              >
                <Plus size={15} />
                <span>+ Entrada Manual / Conteo</span>
              </button>
            </div>
          </div>

          {/* VISTA DE TABLA CON FILTROS (DEC-011) */}
          {viewModeTienda === 'table' && (
            <div className="space-y-4">
              {/* Barra de Filtros Multicriterio */}
              <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <span className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter size={14} /> Filtros de Inventario en Piso
                  </span>
                  {(searchTerm || filtroTiendaId !== 'todas' || filtroCategoria !== 'todas' || filtroEstadoStock !== 'todos') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        if (!isGerenteTienda) setFiltroTiendaId('todas');
                        setFiltroCategoria('todas');
                        setFiltroEstadoStock('todos');
                      }}
                      className="text-xs text-stone-500 hover:text-stone-900 font-bold flex items-center gap-1 transition-colors"
                    >
                      <X size={13} /> Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Búsqueda por texto */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                    <input
                      type="text"
                      placeholder="Buscar por SKU o producto..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]"
                    />
                  </div>

                  {/* Filtro por Sucursal */}
                  <div>
                    <select
                      value={filtroTiendaId}
                      onChange={e => setFiltroTiendaId(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                      disabled={isGerenteTienda}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488] disabled:opacity-60"
                    >
                      {!isGerenteTienda && <option value="todas">🏢 Todas las Sucursales ({tiendas.length})</option>}
                      {tiendas.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} ({t.ciudad})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Categoría */}
                  <div>
                    <select
                      value={filtroCategoria}
                      onChange={e => setFiltroCategoria(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
                    >
                      <option value="todas">🏷️ Todas las Categorías ({categoriasDisponibles.length})</option>
                      {categoriasDisponibles.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nivel de Stock */}
                  <div>
                    <select
                      value={filtroEstadoStock}
                      onChange={e => setFiltroEstadoStock(e.target.value as any)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
                    >
                      <option value="todos">📦 Todos los Modelos</option>
                      <option value="con_stock">🏢 Con Existencias Físicas (&gt; 0)</option>
                      <option value="disponible">🟢 En Stock Óptimo (&gt; 2)</option>
                      <option value="critico">⚠️ Críticos / Reabastecer (≤ 2)</option>
                      <option value="bajo">🟡 Stock Bajo (1 a 2 pzas)</option>
                      <option value="agotado">🔴 Agotados / Sin Stock (0)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Micro-KPIs Resumen Interactivos (Filtros Rápidos - DEC-015 / DEC-016) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Card 1: Modelos / SKUs */}
                <div 
                  onClick={() => setFiltroEstadoStock('todos')}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer transition-all hover:border-[#0d9488] hover:shadow-md active:scale-[0.99] select-none ${
                    filtroEstadoStock === 'todos' 
                      ? 'border-[#0d9488] ring-2 ring-teal-500/20 bg-teal-50/20' 
                      : 'border-stone-200'
                  }`}
                  title="Click para ver todos los modelos de catálogo maestro (incluye 0 existencias)"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      filtroEstadoStock === 'todos' ? 'bg-[#0d9488] text-white border-[#0d9488]' : 'bg-teal-50 border-teal-200 text-teal-800'
                    }`}>
                      <Package size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider truncate">Modelos / SKUs</p>
                      <p className="text-xl font-black text-stone-900">{kpisInventario.totalSkus}</p>
                    </div>
                  </div>
                  {filtroEstadoStock === 'todos' ? (
                    <span className="hidden sm:inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 shrink-0">
                      Activo
                    </span>
                  ) : (
                    <span className="hidden xl:inline-block text-[9px] font-bold text-stone-400 shrink-0">
                      Ver Catálogo
                    </span>
                  )}
                </div>

                {/* Card 2: Unidades Físicas (Existencias > 0) */}
                <div 
                  onClick={() => setFiltroEstadoStock('con_stock')}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer transition-all hover:border-emerald-500 hover:shadow-md active:scale-[0.99] select-none ${
                    filtroEstadoStock === 'con_stock' 
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20' 
                      : 'border-stone-200'
                  }`}
                  title="Click para filtrar y mostrar exclusivamente productos con existencias físicas (> 0)"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      filtroEstadoStock === 'con_stock' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <Store size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider truncate">Unidades Físicas</p>
                      <p className="text-xl font-black text-emerald-800">{kpisInventario.totalPiezas} <span className="text-xs font-normal text-stone-500">piezas</span></p>
                    </div>
                  </div>
                  {filtroEstadoStock === 'con_stock' ? (
                    <span className="hidden sm:inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      Activo
                    </span>
                  ) : (
                    <span className="hidden xl:inline-block text-[9px] font-bold text-stone-400 shrink-0">
                      Filtrar &gt; 0
                    </span>
                  )}
                </div>

                {/* Card 3: Valorización Stock (Ordenar por Valor) */}
                <div 
                  onClick={() => {
                    setFiltroEstadoStock('con_stock');
                    if (ordenColumna === 'valor') {
                      setOrdenDireccion(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setOrdenColumna('valor');
                      setOrdenDireccion('desc');
                    }
                  }}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer transition-all hover:border-teal-500 hover:shadow-md active:scale-[0.99] select-none ${
                    ordenColumna === 'valor' 
                      ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/20' 
                      : 'border-stone-200'
                  }`}
                  title="Click para ordenar tabla por mayor valorización ($) y ver existencias físicas"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      ordenColumna === 'valor' ? 'bg-[#0d9488] text-white border-[#0d9488]' : 'bg-teal-50 border-teal-200 text-teal-800'
                    }`}>
                      <DollarSign size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider truncate">Valorización Stock</p>
                      <p className="text-xl font-black text-teal-700 font-mono">${kpisInventario.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  {ordenColumna === 'valor' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200 shrink-0">
                      {ordenDireccion === 'desc' ? 'Mayor ↓' : 'Menor ↑'}
                    </span>
                  ) : (
                    <span className="hidden xl:inline-block text-[9px] font-bold text-stone-400 shrink-0">
                      Ordenar $
                    </span>
                  )}
                </div>

                {/* Card 4: Stock Bajo / Agotado (Crítico <= 2) */}
                <div 
                  onClick={() => setFiltroEstadoStock('critico')}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm cursor-pointer transition-all hover:border-amber-500 hover:shadow-md active:scale-[0.99] select-none ${
                    filtroEstadoStock === 'critico' || filtroEstadoStock === 'bajo' || filtroEstadoStock === 'agotado'
                      ? 'border-amber-600 ring-2 ring-amber-500/20 bg-amber-50/30' 
                      : 'border-stone-200'
                  }`}
                  title="Click para filtrar artículos con stock crítico o agotado (≤ 2)"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      filtroEstadoStock === 'critico' || filtroEstadoStock === 'bajo' || filtroEstadoStock === 'agotado'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : kpisInventario.articulosBajos + kpisInventario.articulosAgotados > 0 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-stone-50 border-stone-200 text-stone-500'
                    }`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider truncate">Stock Bajo / Agotado</p>
                      <p className="text-lg font-black text-amber-800">
                        {kpisInventario.articulosBajos} <span className="text-xs font-normal text-stone-500">bajos</span> · {kpisInventario.articulosAgotados} <span className="text-xs font-normal text-stone-500">agotados</span>
                      </p>
                    </div>
                  </div>
                  {filtroEstadoStock === 'critico' ? (
                    <span className="hidden sm:inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      Críticos
                    </span>
                  ) : (
                    <span className="hidden xl:inline-block text-[9px] font-bold text-stone-400 shrink-0">
                      Filtrar ≤ 2
                    </span>
                  )}
                </div>
              </div>

              {/* Tabla de Inventario */}
              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-800">
                    <thead className="bg-stone-50 text-[10px] uppercase font-black tracking-wider text-stone-500 border-b border-stone-200 select-none">
                      <tr>
                        <th 
                          onClick={() => handleSort('sku')} 
                          className="px-4 py-3.5 cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>SKU</span>
                            {ordenColumna === 'sku' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('producto')} 
                          className="px-4 py-3.5 cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Producto y Categoría</span>
                            {ordenColumna === 'producto' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('tienda')} 
                          className="px-4 py-3.5 cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Sucursal</span>
                            {ordenColumna === 'tienda' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('stock')} 
                          className="px-4 py-3.5 text-center cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Existencias</span>
                            {ordenColumna === 'stock' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('precio')} 
                          className="px-4 py-3.5 text-right cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Precio Unitario</span>
                            {ordenColumna === 'precio' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('valor')} 
                          className="px-4 py-3.5 text-right cursor-pointer hover:text-stone-900 transition-colors"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Valor Total</span>
                            {ordenColumna === 'valor' ? (ordenDireccion === 'asc' ? <ArrowUp size={12} className="text-[#0d9488]" /> : <ArrowDown size={12} className="text-[#0d9488]" />) : <ArrowUpDown size={12} className="opacity-40" />}
                          </div>
                        </th>
                        <th className="px-4 py-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {inventarioFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                            <Package size={36} className="mx-auto mb-2 opacity-30 text-[#0d9488]" />
                            <p className="font-bold text-stone-800">
                              {filtroEstadoStock === 'con_stock'
                                ? 'No hay artículos con existencias físicas en esta sucursal (0 piezas en stock)'
                                : filtroEstadoStock === 'disponible'
                                ? 'No hay artículos en stock óptimo (> 2 piezas)'
                                : filtroEstadoStock === 'critico'
                                ? 'No hay artículos con stock crítico (≤ 2 piezas)'
                                : 'No se encontraron artículos con los filtros seleccionados'}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                              {filtroEstadoStock === 'con_stock'
                                ? 'Puedes registrar existencias mediante "+ Entrada Manual / Conteo" o recibir pedidos desde Reparto.'
                                : 'Prueba cambiando la búsqueda o limpiando los filtros.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        inventarioFiltrado.map(item => {
                          const isAgotado = item.stock === 0;
                          const isBajo = item.stock > 0 && item.stock <= 2;
                          return (
                            <tr 
                              key={`${item.tienda_id}-${item.producto_id}`} 
                              className="hover:bg-stone-50/80 transition-colors group"
                            >
                              {/* SKU */}
                              <td className="px-4 py-3 font-mono font-bold text-teal-800 text-xs">
                                {item.sku}
                              </td>

                              {/* Producto y Categoría */}
                              <td className="px-4 py-3">
                                <p className="font-bold text-stone-900 text-xs">
                                  {item.producto_nombre}
                                </p>
                                <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 mt-0.5 border border-stone-200">
                                  {item.categoria}
                                </span>
                              </td>

                              {/* Sucursal con Badge Distintivo */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${
                                    item.tienda_id === 1 
                                      ? 'bg-teal-50 text-teal-900 border-teal-200 shadow-2xs' 
                                      : item.tienda_id === 2 
                                      ? 'bg-sky-50 text-sky-900 border-sky-200 shadow-2xs' 
                                      : 'bg-indigo-50 text-indigo-900 border-indigo-200 shadow-2xs'
                                  }`}>
                                    <span>{item.tienda_id === 1 ? '🏛️' : item.tienda_id === 2 ? '🏬' : '🏪'}</span>
                                    <span>{item.tienda_nombre}</span>
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-medium pl-1">
                                    {item.ubicacion} · {item.tienda_ciudad}
                                  </span>
                                </div>
                              </td>

                              {/* Stock */}
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${
                                  isAgotado 
                                    ? 'bg-rose-50 text-rose-800 border-rose-200' 
                                    : isBajo 
                                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {item.stock} pzas
                                </span>
                              </td>

                              {/* Precio Unitario */}
                              <td className="px-4 py-3 text-right font-medium text-stone-800">
                                ${item.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Valor Total */}
                              <td className="px-4 py-3 text-right font-black text-teal-700 font-mono">
                                ${item.valor_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>

                              {/* Acciones */}
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleAjusteRapido(item)}
                                    className="p-1.5 px-2.5 bg-stone-100 hover:bg-teal-50 hover:text-teal-800 text-stone-700 rounded-xl border border-stone-200 transition-colors text-xs font-bold flex items-center gap-1 shadow-xs"
                                    title="Ajustar existencias o registrar entrada"
                                  >
                                    <SlidersHorizontal size={12} />
                                    <span>Ajuste</span>
                                  </button>

                                  {item.stock > 0 && (
                                    <button
                                      onClick={(e) => handlePrintStoreQRs(e, item.tienda_id, item.producto_id, item.stock, item.producto_nombre)}
                                      className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl border border-stone-200 transition-colors"
                                      title="Imprimir etiquetas QR de esta sucursal"
                                    >
                                      <QrCode size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA DE TARJETAS JERÁRQUICAS */}
          {viewModeTienda === 'grid' && (
            <div className="space-y-4">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-xs font-bold text-stone-600 bg-white px-4 py-3 rounded-2xl border border-stone-200 shadow-sm w-full sm:w-auto overflow-x-auto">
                {!isGerenteTienda ? (
                  <button onClick={() => { setSelectedTiendaId(null); setSelectedCategory(null); }} className={`hover:text-teal-700 ${!selectedTiendaId ? 'text-teal-800' : ''}`}>Todas las Tiendas</button>
                ) : (
                  <span className="text-stone-900">
                    {posTiendaId ? tiendas.find(t => t.id === posTiendaId)?.nombre : 'Seleccionar Tienda'}
                  </span>
                )}
                
                {isGerenteTienda && !posTiendaId && selectedTiendaId && (
                  <>
                    <span className="text-stone-400">/</span>
                    <button onClick={() => setSelectedCategory(null)} className={`hover:text-teal-700 ${!selectedCategory ? 'text-teal-800' : ''}`}>
                      {tiendas.find(t => t.id === selectedTiendaId)?.nombre}
                    </button>
                  </>
                )}

                {!isGerenteTienda && selectedTiendaId && (
                  <>
                    <span className="text-stone-400">/</span>
                    <button onClick={() => setSelectedCategory(null)} className={`hover:text-teal-700 ${!selectedCategory ? 'text-teal-800' : ''}`}>
                      {tiendas.find(t => t.id === selectedTiendaId)?.nombre}
                    </button>
                  </>
                )}

                {selectedCategory && (
                  <>
                    <span className="text-stone-400">/</span>
                    <span className="text-teal-800">{selectedCategory}</span>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tiendaData.length === 0 ? (
                  <div className="col-span-full bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-sm"><p className="text-stone-400 text-xs font-medium">No hay inventario en esta sección</p></div>
                ) : tiendaData.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (item.type === 'tienda') setSelectedTiendaId(item.id as number);
                      else if (item.type === 'category') setSelectedCategory(item.id as string);
                    }}
                    className={`bg-white border border-stone-200 rounded-2xl p-5 flex flex-col items-center text-center transition-all shadow-sm relative ${item.type !== 'product' ? 'hover:border-teal-400 hover:shadow-md cursor-pointer' : ''}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-3 ${item.type !== 'product' ? 'text-teal-800' : 'text-stone-500'}`}>
                      {item.type === 'tienda' ? <Store size={28} /> : item.type === 'category' ? <Package size={28} /> : <Store size={28} />}
                    </div>
                    <h3 className="text-xs font-black text-stone-900 line-clamp-2 min-h-[32px]">{item.name}</h3>
                    <div className="mt-2 text-2xl font-black text-teal-700 font-mono">{item.count}</div>
                    <p className="text-[10px] text-stone-500 uppercase font-bold mt-0.5">
                      {item.type === 'tienda' ? 'Piezas Totales' : item.type === 'category' ? 'Piezas' : 'En Stock'}
                    </p>
                    {item.type === 'product' && item.price && (
                      <p className="mt-2 text-xs font-bold text-stone-800 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-xl w-full">
                        ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {item.type === 'product' && (
                      <button 
                        onClick={(e) => handlePrintStoreQRs(e, selectedTiendaId as number, item.id as number, item.count, item.name)} 
                        className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-teal-800 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Imprimir QRs"
                      >
                        <QrCode size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Terminados sin Embarcar */}
      {tab === 'terminados' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
            {/* Selector de Modo */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewModeTerminados('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeTerminados === 'table'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <TableIcon size={14} />
                <span>Vista Tabla</span>
              </button>
              <button
                onClick={() => setViewModeTerminados('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeTerminados === 'cards'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Agrupado por Orden</span>
              </button>
            </div>

            {/* Búsqueda */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
              <input 
                type="text" 
                placeholder="Buscar por producto, cliente o QR..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]" 
              />
            </div>
          </div>
          
          {viewModeTerminados === 'table' ? (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-800">
                  <thead className="bg-stone-50 text-[10px] uppercase font-black tracking-wider text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3.5">Folio Orden</th>
                      <th className="px-4 py-3.5">Pieza / Producto</th>
                      <th className="px-4 py-3.5">Cliente / Destino</th>
                      <th className="px-4 py-3.5">Acabado</th>
                      <th className="px-4 py-3.5">Código QR</th>
                      <th className="px-4 py-3.5 text-center">Tiempo en Taller</th>
                      <th className="px-4 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {terminadosFlatList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-stone-400 font-bold">
                          Sin piezas terminadas encontradas
                        </td>
                      </tr>
                    ) : (
                      terminadosFlatList.map(t => (
                        <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono font-black text-teal-800">
                            #{t.orden_id}
                          </td>
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {t.producto_nombre}
                          </td>
                          <td className="px-4 py-3 text-stone-600 font-medium">
                            {t.cliente_nombre}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-bold">
                              {t.acabado}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-stone-500 text-[11px]">
                            {t.qr_code}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              t.dias > 7 ? 'bg-rose-50 text-rose-800 border-rose-200' : t.dias > 3 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              <Timer size={11} /> {t.dias} días
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <QRLabel qrCode={t.qr_code} productoNombre={t.producto_nombre} ordenId={t.orden_id} clienteNombre={t.cliente_nombre} acabado={t.acabado} size={30} showPrint={true} />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {terminadosGrouped.length === 0 ? (
                <div className="col-span-full bg-white border border-stone-200 rounded-2xl p-12 text-center shadow-sm"><p className="text-stone-400 text-xs font-medium">Sin piezas terminadas encontradas</p></div>
              ) : terminadosGrouped.map(([productoName, items]) => (
                <div key={productoName} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black text-stone-900">{productoName}</h3>
                      <button 
                        onClick={() => handlePrintOrdenCompleta(productoName, items)} 
                        className="p-1 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 transition-colors flex items-center gap-1.5 text-xs font-bold"
                        title="Imprimir todas las etiquetas de esta orden"
                      >
                        <Printer size={12} /> Imprimir Orden
                      </button>
                    </div>
                    <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-xs font-black">{items.length} piezas</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {items.map(t => (
                      <div key={t.id} className={`bg-stone-50 p-3 rounded-xl flex items-center gap-3 border transition-colors ${t.dias > 7 ? 'border-rose-300' : 'border-stone-200'}`}>
                        <div className="shrink-0">
                           <QRLabel qrCode={t.qr_code} productoNombre={t.producto_nombre} ordenId={t.orden_id} clienteNombre={t.cliente_nombre} acabado={t.acabado} size={40} showPrint={true} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">{t.cliente_nombre} · {t.acabado}</p>
                          <p className="text-[10px] font-mono text-stone-500">{t.qr_code}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`flex items-center gap-1 ${t.dias > 7 ? 'text-rose-700 font-bold' : t.dias > 3 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}`}>
                            <Timer size={12} />
                            <span className="text-[10px] font-black">{t.dias} días</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Materia Prima */}
      {tab === 'materia_prima' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewModeMP('cards')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeMP === 'cards'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Vista Indicadores</span>
              </button>
              <button
                onClick={() => setViewModeMP('table')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewModeMP === 'table'
                    ? 'bg-white text-stone-900 shadow-xs font-black'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <TableIcon size={14} />
                <span>Vista Tabla</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-stone-500 font-bold">{materiaPrima.length} insumos registrados</span>
              <button
                onClick={() => {
                  setEditingMP(null);
                  setMpForm({
                    nombre: '',
                    tipo: 'madera',
                    subtipo: '',
                    unidad: 'tabla',
                    cantidad: 0,
                    minimo: 10,
                    maximo: 100,
                    costo_unitario: 0,
                    codigo_referencia: '',
                  });
                  setShowModalMP(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <Plus size={16} />
                <span>+ Nueva Materia Prima</span>
              </button>
            </div>
          </div>

          {viewModeMP === 'table' ? (
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-800">
                  <thead className="bg-stone-50 text-[10px] uppercase font-black tracking-wider text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3.5">Material / Insumo</th>
                      <th className="px-4 py-3.5 text-center">Stock Actual</th>
                      <th className="px-4 py-3.5 text-center">Mínimo</th>
                      <th className="px-4 py-3.5">Nivel de Stock</th>
                      <th className="px-4 py-3.5 text-center">Estado</th>
                      <th className="px-4 py-3.5 text-center">Ajuste Rápido</th>
                      <th className="px-4 py-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {mpSorted.map(mp => {
                      const pct = Math.min(100, (mp.cantidad / (mp.minimo * 3)) * 100);
                      const isCritical = mp.cantidad <= mp.minimo;
                      return (
                        <tr key={mp.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="px-4 py-3 font-bold text-stone-900 flex items-center gap-2.5">
                            <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10" style={{ background: mp.color }} />
                            <div>
                              <span>{mp.nombre}</span>
                              {mp.codigo_referencia && (
                                <span className="block text-[10px] font-mono text-stone-400 font-normal">{mp.codigo_referencia}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-black text-sm text-stone-900 font-mono">
                            {mp.cantidad} <span className="text-[10px] font-normal text-stone-500">{mp.unidad}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-stone-500 font-bold">
                            {mp.minimo} {mp.unidad}
                          </td>
                          <td className="px-4 py-3 min-w-[150px]">
                            <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                              <div 
                                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-rose-500' : pct > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              isCritical ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {isCritical ? 'Crítico / Reorden' : 'Óptimo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => updateMateriaPrima(mp.id, -1)} className="p-1 px-2.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg border border-stone-200 font-bold"><Minus size={12} /></button>
                              <button onClick={() => updateMateriaPrima(mp.id, 1)} className="p-1 px-2.5 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg border border-teal-200 font-bold"><Plus size={12} /></button>
                              <button onClick={() => updateMateriaPrima(mp.id, 5)} className="p-1 px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200 font-black text-[10px]">+5</button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => {
                                  setEditingMP(mp);
                                  setMpForm({
                                    nombre: mp.nombre,
                                    tipo: mp.tipo || 'madera',
                                    subtipo: mp.subtipo || '',
                                    unidad: mp.unidad,
                                    cantidad: mp.cantidad,
                                    minimo: mp.minimo,
                                    maximo: mp.maximo || 100,
                                    costo_unitario: mp.costo_unitario || 0,
                                    codigo_referencia: mp.codigo_referencia || '',
                                  });
                                  setShowModalMP(true);
                                }}
                                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg"
                                title="Editar Material"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (confirm(`¿Eliminar la materia prima "${mp.nombre}"?`)) {
                                    await eliminarMateriaPrima(mp.id);
                                  }
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                                title="Eliminar Material"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mpSorted.map(mp => {
                const pct = Math.min(100, (mp.cantidad / (mp.minimo * 3)) * 100);
                const isCritical = mp.cantidad <= mp.minimo;
                return (
                  <div key={mp.id} className={`bg-white border rounded-2xl p-5 space-y-3 shadow-sm relative group ${isCritical ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-xs" style={{ background: mp.color }} />
                        <h3 className="text-sm font-black text-stone-900">{mp.nombre}</h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingMP(mp);
                            setMpForm({
                              nombre: mp.nombre,
                              tipo: mp.tipo || 'madera',
                              subtipo: mp.subtipo || '',
                              unidad: mp.unidad,
                              cantidad: mp.cantidad,
                              minimo: mp.minimo,
                              maximo: mp.maximo || 100,
                              costo_unitario: mp.costo_unitario || 0,
                              codigo_referencia: mp.codigo_referencia || '',
                            });
                            setShowModalMP(true);
                          }}
                          className="p-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`¿Eliminar la materia prima "${mp.nombre}"?`)) {
                              await eliminarMateriaPrima(mp.id);
                            }
                          }}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-center py-1">
                      <p className={`text-3xl font-black font-mono ${isCritical ? 'text-rose-700' : 'text-stone-900'}`}>{mp.cantidad}</p>
                      <p className="text-xs text-stone-500 font-bold">{mp.unidad}</p>
                    </div>
                    {/* Gauge */}
                    <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                      <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-rose-500' : pct > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-stone-400" style={{ left: `${(mp.minimo / (mp.minimo * 3)) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-stone-500 text-center font-bold">Mínimo: {mp.minimo} {mp.unidad}</p>
                    {/* Actions */}
                    <div className="flex gap-2 justify-center pt-1">
                      <button onClick={() => updateMateriaPrima(mp.id, -1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200"><Minus size={14} /></button>
                      <button onClick={() => updateMateriaPrima(mp.id, 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"><Plus size={14} /></button>
                      <button onClick={() => updateMateriaPrima(mp.id, 5)} className="h-9 px-3.5 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-black">+5</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Print QRs Modal */}
      {printQRs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in text-left">
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-3xl">
              <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                <Printer size={18} className="text-[#0d9488]" /> Imprimir Etiquetas: {printQRs.nombre}
              </h3>
              <button onClick={() => setPrintQRs(null)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 print-only-container flex-1">
              <div className="grid grid-cols-2 gap-4">
                {printQRs.qrs.map(qr => (
                  <QRLabel key={qr} qrCode={qr} productoNombre={printQRs.nombre} ordenId={0} clienteNombre={printQRs.tiendaNombre} acabado="-" size={120} />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50 rounded-b-3xl">
              <button onClick={() => setPrintQRs(null)} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold">Cancelar</button>
              <button onClick={handlePrintLote} className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Printer size={14} /> Imprimir {printQRs.qrs.length} Etiquetas
              </button>
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
      <div className="hidden print:block print:w-full print:absolute print:top-0 print:left-0 print:bg-white print:z-50">
        <style>{`
          @media print {
            @page { margin: 10mm; size: letter; }
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}</style>
        <div className="grid grid-cols-3 gap-y-6 gap-x-4">
          {printQRs && printQRs.qrs.map(qr => (
            <div key={qr} className="break-inside-avoid flex justify-center">
              <QRLabel qrCode={qr} productoNombre={printQRs.nombre} ordenId={0} clienteNombre={printQRs.tiendaNombre} acabado="-" size={80} showPrint={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Recepción Táctil de Embarque */}
      {activeRecepcionEmb && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in text-left">
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-3xl">
              <div>
                <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Package size={18} className="text-[#0d9488]" /> Recibir Mercancía: Embarque #{activeRecepcionEmb.id}
                </h3>
                <p className="text-xs text-stone-500">Verifica la calidad y piezas físicas al ingresar a tienda</p>
              </div>
              <button onClick={() => setActiveRecepcionEmb(null)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {recepcionItems.map((item) => (
                <div key={item.qr_code} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900">{item.producto_nombre}</p>
                    <p className="text-[10px] font-mono text-stone-500">{item.qr_code}</p>
                  </div>
                  
                  {/* Selector Táctil */}
                  <div className="flex gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-stone-200">
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'ok')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        item.estado_recepcion === 'ok' 
                          ? 'bg-emerald-600 text-white font-black shadow-xs' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      ✓ OK
                    </button>
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'dañado')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        item.estado_recepcion === 'dañado' 
                          ? 'bg-rose-600 text-white font-black shadow-xs' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      ⚠️ Dañado
                    </button>
                    <button
                      onClick={() => handleUpdateItemStatus(item.qr_code, 'faltante')}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                        item.estado_recepcion === 'faltante' 
                          ? 'bg-amber-600 text-white font-black shadow-xs' 
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      ✖ Faltante
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50 rounded-b-3xl">
              <button onClick={() => setActiveRecepcionEmb(null)} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold">Cancelar</button>
              <button 
                onClick={handleConfirmarRecepcionClick}
                className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black shadow-sm"
              >
                ✓ Confirmar Recepción de Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Captura Manual y Ajuste de Inventario (DEC-004) */}
      {showModalAjuste && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in text-left">
            {/* Header */}
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0d9488]">
                  <ArrowDownToLine size={18} />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-sm">Entrada Manual / Conteo de Inventario</h3>
                  <p className="text-xs text-stone-500">Registra stock físico en piso o ajusta existencias</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowModalAjuste(false); setAlertaAjuste(null); }}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGuardarAjuste} className="p-6 overflow-y-auto space-y-4 flex-1">
              {alertaAjuste && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  alertaAjuste.tipo === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {alertaAjuste.tipo === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{alertaAjuste.mensaje}</span>
                </div>
              )}

              {/* Sucursal Destino */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 uppercase">Sucursal / Tienda Destino</label>
                <select
                  value={ajusteForm.tienda_id}
                  onChange={e => setAjusteForm({ ...ajusteForm, tienda_id: Number(e.target.value) })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                >
                  {tiendas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.ciudad})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de movimiento */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteForm({ ...ajusteForm, tipo: 'entrada', es_absoluto: false })}
                  className={`p-3 rounded-2xl border text-xs font-black text-center transition-all ${
                    ajusteForm.tipo === 'entrada'
                      ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  📥 Entrada (+ Sumar)
                </button>
                <button
                  type="button"
                  onClick={() => setAjusteForm({ ...ajusteForm, tipo: 'ajuste', es_absoluto: true })}
                  className={`p-3 rounded-2xl border text-xs font-black text-center transition-all ${
                    ajusteForm.tipo === 'ajuste'
                      ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  🎯 Conteo Físico (Fijar Total)
                </button>
              </div>

              {/* Buscador de Producto de Catálogo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase">
                  Producto de Catálogo <span className="text-[#0d9488]">*</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={busquedaProductoAjuste}
                    onChange={e => setBusquedaProductoAjuste(e.target.value)}
                    placeholder="Buscar por SKU (ej. DCR-0001) o Nombre..."
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                  {busquedaProductoAjuste && (
                    <button
                      type="button"
                      onClick={() => setBusquedaProductoAjuste('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Lista de selección de producto */}
                <div className="max-h-36 overflow-y-auto space-y-1 border border-stone-200 rounded-2xl p-1.5 bg-stone-50">
                  {productosFiltradosAjuste.length === 0 ? (
                    <p className="text-xs text-stone-400 p-2 text-center">No se encontraron productos coincidentes</p>
                  ) : (
                    productosFiltradosAjuste.map(p => {
                      const isSelected = ajusteForm.producto_id === p.id;
                      const primerPrecio = p.prices ? (Object.values(p.prices)[0] || 0) : 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSeleccionarProductoAjuste(p)}
                          className={`p-2.5 rounded-xl text-xs cursor-pointer flex justify-between items-center transition-all ${
                            isSelected 
                              ? 'bg-teal-50 border border-teal-300 text-teal-900 font-bold shadow-xs' 
                              : 'hover:bg-white text-stone-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-bold">{p.name}</p>
                            <p className="text-[10px] text-stone-500 font-mono">SKU: {p.sku || `DCR-${p.id}`} · {p.type || 'Mueble'}</p>
                          </div>
                          <span className="text-xs font-black text-teal-700 font-mono whitespace-nowrap">
                            ${primerPrecio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cantidad y Origen de Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Cantidad (Piezas)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAjusteForm(prev => ({ ...prev, cantidad: Math.max(1, prev.cantidad - 1) }))}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={ajusteForm.cantidad}
                      onChange={e => setAjusteForm({ ...ajusteForm, cantidad: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-white border border-stone-200 rounded-xl text-center text-sm font-black text-teal-800 py-1.5 font-mono focus:outline-none focus:border-[#0d9488]"
                    />
                    <button
                      type="button"
                      onClick={() => setAjusteForm(prev => ({ ...prev, cantidad: prev.cantidad + 1 }))}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Origen del Stock</label>
                  <select
                    value={ajusteForm.origen_stock}
                    onChange={e => setAjusteForm({ ...ajusteForm, origen_stock: e.target.value as any })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  >
                    <option value="embarque_taller">Fabricación Taller Propio</option>
                    <option value="compra_externa">Compra a Proveedor Externo</option>
                    <option value="artesania">Artesanía / Productor Local</option>
                    <option value="pieza_unica">Pieza Única / Muestra</option>
                  </select>
                </div>
              </div>

              {/* Precios (Venta y Costo) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ajusteForm.precio_venta}
                    onChange={e => setAjusteForm({ ...ajusteForm, precio_venta: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-teal-700 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={ajusteForm.costo_unitario}
                    onChange={e => setAjusteForm({ ...ajusteForm, costo_unitario: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-700 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 uppercase">Motivo / Notas del Movimiento</label>
                <input
                  type="text"
                  value={ajusteForm.notas}
                  onChange={e => setAjusteForm({ ...ajusteForm, notas: e.target.value })}
                  placeholder="Ej. Conteo inicial de apertura, compra directa, ajuste por merma..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowModalAjuste(false); setAlertaAjuste(null); }}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAjuste || !ajusteForm.producto_id}
                  className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  {guardandoAjuste ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine size={14} />
                      <span>Registrar en Inventario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Alta / Edición de Materia Prima e Insumos */}
      {showModalMP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in text-left">
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#0d9488] flex items-center justify-center font-black">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-stone-900">
                    {editingMP ? 'Editar Materia Prima / Insumo' : 'Nueva Materia Prima / Insumo'}
                  </h2>
                  <p className="text-[11px] text-stone-500 font-bold">Catálogo de suministros y maderas para el Taller</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModalMP(false); setEditingMP(null); }}
                className="p-2 hover:bg-stone-200/60 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!mpForm.nombre.trim()) return;
              setGuardandoMP(true);
              try {
                if (editingMP) {
                  await actualizarMateriaPrima(editingMP.id, mpForm);
                } else {
                  await crearMateriaPrima(mpForm);
                }
                setShowModalMP(false);
                setEditingMP(null);
              } catch (err) {
                console.error(err);
              } finally {
                setGuardandoMP(false);
              }
            }} className="p-6 space-y-4">
              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 uppercase">Nombre del Material o Madera *</label>
                <input
                  type="text"
                  required
                  value={mpForm.nombre}
                  onChange={e => setMpForm({ ...mpForm, nombre: e.target.value })}
                  placeholder="Ej. Madera Encino Americano 2x4, Laca Poliuretano Mate, Corredera Cierre Suave..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                />
              </div>

              {/* Tipo y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Tipo de Insumo</label>
                  <select
                    value={mpForm.tipo}
                    onChange={e => setMpForm({ ...mpForm, tipo: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  >
                    <option value="madera">Madera / Tablón</option>
                    <option value="quimico">Químico / Barniz / Tinte</option>
                    <option value="insumo">Insumo / Herraje / Tornillería</option>
                    <option value="herramienta">Herramienta / Abrasivo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Unidad de Medida</label>
                  <input
                    type="text"
                    value={mpForm.unidad}
                    onChange={e => setMpForm({ ...mpForm, unidad: e.target.value })}
                    placeholder="tabla, litro, pza, caja, kg..."
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
              </div>

              {/* Código y Subtipo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Código / SKU Taller</label>
                  <input
                    type="text"
                    value={mpForm.codigo_referencia}
                    onChange={e => setMpForm({ ...mpForm, codigo_referencia: e.target.value })}
                    placeholder="Ej. MAT-ENC-01 (opcional)"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Subtipo / Categoría</label>
                  <input
                    type="text"
                    value={mpForm.subtipo}
                    onChange={e => setMpForm({ ...mpForm, subtipo: e.target.value })}
                    placeholder="Ej. maderas_duras, barnices..."
                    className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
              </div>

              {/* Cantidad Inicial, Mínimo y Máximo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mpForm.cantidad}
                    onChange={e => setMpForm({ ...mpForm, cantidad: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-center text-teal-800 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Mínimo Reorden</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={mpForm.minimo}
                    onChange={e => setMpForm({ ...mpForm, minimo: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-center text-rose-700 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase">Costo Unitario ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={mpForm.costo_unitario}
                    onChange={e => setMpForm({ ...mpForm, costo_unitario: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-center text-stone-800 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowModalMP(false); setEditingMP(null); }}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoMP || !mpForm.nombre.trim()}
                  className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  {guardandoMP ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{editingMP ? 'Actualizar Insumo' : 'Registrar Materia Prima'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
