import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, CheckCircle2, XCircle, Search, Camera, X, 
  ArrowLeft, CreditCard, Wallet, Landmark, RefreshCw, 
  Mail, ChevronRight, Store, ArrowRight, Printer,
  Maximize2, Minimize2, FileText, Sparkles, Layers, DollarSign
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useDecor } from '../store/StoreContext';
import type { Venta } from '../store/useStore';

interface CartItem {
  productoId: number;
  inventarioTiendaId: number;
  nombre: string;
  precio: number;
  sku: string;
  cantidad: number;
  qrs: string[]; // Lista de códigos QR escaneados/generados para este item
}

export default function PuntoDeVentaPage() {
  const { 
    tiendas, embarques, terminados, inventario, productos, clientes, categorias,
    cajaActiva, fetchCajaActiva, cerrarCaja, procesarCheckout, fetchInventarioTienda
  } = useDecor();
  
  // Persistencia de sucursal activa en local storage (Configurar Caja una sola vez)
  const [tiendaId, setTiendaId] = useState<number | null>(() => {
    const saved = localStorage.getItem('decor_pos_tienda_id');
    return saved ? Number(saved) : null;
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qrInput, setQrInput] = useState('');
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estados para Modo de Búsqueda Dual (DEC-006)
  const [modoCaptura, setModoCaptura] = useState<'scan' | 'catalogo'>('scan');
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [categoriaFiltroCatalogo, setCategoriaFiltroCatalogo] = useState<string>('todas');

  // Estados para Control y Corte Z de Caja (DEC-005)
  const [showModalCorteZ, setShowModalCorteZ] = useState(false);
  const [efectivoContadoCierre, setEfectivoContadoCierre] = useState<string>('0');
  const [guardandoCorte, setGuardandoCorte] = useState(false);
  const [resultadoCorte, setResultadoCorte] = useState<{
    ok: boolean;
    diferencia: number;
    esperado: number;
    contado: number;
    mensaje: string;
  } | null>(null);

  // Estados para el flujo de pago y checkout transaccional (DEC-006)
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);
  const [clienteNombreLibre, setClienteNombreLibre] = useState<string>('Público General');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | null>(null);
  const [montoRecibido, setMontoRecibido] = useState<string>('0');
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [folioVentaReal, setFolioVentaReal] = useState<string>('');
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);
  
  // Estado para envío de ticket por correo
  const [emailCliente, setEmailCliente] = useState('');
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-cargar caja activa e inventario al cambiar o montar sucursal
  useEffect(() => {
    if (tiendaId !== null) {
      fetchCajaActiva(tiendaId);
      fetchInventarioTienda(tiendaId);
    }
  }, [tiendaId, fetchCajaActiva, fetchInventarioTienda]);

  // Escuchar cambios de pantalla completa (por si salen con ESC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error al activar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const startInputTime = useRef<number>(0);

  // Mantener el focus en el campo de texto manual continuamente (para pistolas de escaneo)
  useEffect(() => {
    if (step === 1 && !showCamera && tiendaId !== null) {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, showCamera, tiendaId]);

  // Auto-procesar entrada de la pistola de escaneo sin presionar Enter
  useEffect(() => {
    const trimmed = qrInput.trim();
    if (!trimmed) return;

    const elapsed = Date.now() - startInputTime.current;
    const msPerChar = trimmed.length > 0 ? elapsed / trimmed.length : 0;
    
    // Si la velocidad de entrada es muy rápida (menor a 45ms por carácter) y tiene
    // una longitud mínima de 8 caracteres, asumimos que es una pistola de escaneo
    // y procesamos de forma automática tras 100ms de inactividad.
    const esEntradaScanner = msPerChar < 45 && trimmed.length >= 8;

    if (esEntradaScanner) {
      const delayDebounceFn = setTimeout(() => {
        // Validar que el valor del input no haya cambiado o sido limpiado (ej. por presionar Enter manualmente)
        if (inputRef.current && inputRef.current.value.trim() === trimmed) {
          handleScan(trimmed);
        }
      }, 100);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [qrInput]);

  // Lista de catálogo con stock en la tienda para Búsqueda Rápida Dual (DEC-006)
  const productosCatalogoTienda = useMemo(() => {
    if (tiendaId === null) return [];
    const q = busquedaCatalogo.toLowerCase().trim();
    return productos.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      const matchCat = categoriaFiltroCatalogo === 'todas' || p.type === categoriaFiltroCatalogo;
      return matchSearch && matchCat;
    });
  }, [productos, tiendaId, busquedaCatalogo, categoriaFiltroCatalogo]);

  const handleAgregarDesdeCatalogo = (prod: typeof productos[0]) => {
    if (tiendaId === null) return;
    const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === prod.id);
    const stockDisponible = inv ? inv.cantidad_disponible : 0;
    const itemEnCarrito = carrito.find(i => i.productoId === prod.id);
    const cantActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    if (stockDisponible <= cantActual) {
      triggerError(`No hay stock disponible en tienda para "${prod.name}" (Stock: ${stockDisponible})`);
      return;
    }

    const precio = (inv && inv.precio_venta > 0) ? inv.precio_venta : (prod.prices ? Object.values(prod.prices)[0] || 0 : 0);
    const invId = inv ? inv.id : prod.id;
    const qrTemp = `DCR-REC-${tiendaId}-${prod.id}-${Date.now()}-${cantActual}`;

    setCarrito(prev => {
      const idx = prev.findIndex(item => item.productoId === prod.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          cantidad: updated[idx].cantidad + 1,
          qrs: [...updated[idx].qrs, qrTemp]
        };
        return updated;
      }
      return [...prev, {
        productoId: prod.id,
        inventarioTiendaId: invId,
        nombre: prod.name,
        precio: precio,
        sku: prod.sku || `DCR-${prod.id}`,
        cantidad: 1,
        qrs: [qrTemp]
      }];
    });

    setResult('success');
    setTimeout(() => setResult(null), 1200);
  };

  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (tiendaId === null) return;

    // Verificar si el código QR exacto ya está en el carrito
    const qrExistente = carrito.some(item => item.qrs.includes(trimmed));
    if (qrExistente) {
      setQrInput('');
      setShowCamera(false);
      return;
    }

    let productoEncontrado = null;
    let prodId = 0;
    let isStoreValid = false;

    // 1. Detectar si es un QR de reposición / inicial autodescriptivo
    if (trimmed.startsWith('DCR-REC-')) {
      const parts = trimmed.split('-');
      if (parts.length >= 4) {
        const qrTiendaId = Number(parts[2]);
        const qrProductoId = Number(parts[3]);
        const prod = productos.find(p => p.id === qrProductoId);
        if (prod) {
          const precio = prod.prices ? Object.values(prod.prices)[0] || 200 : 200;
          productoEncontrado = { id: prod.id, nombre: prod.name, precio: precio, sku: prod.sku };
          prodId = prod.id;
          isStoreValid = qrTiendaId === tiendaId;
        }
      }
    }

    // 2. Buscar si el producto fue entregado a esta tienda específica
    if (!productoEncontrado) {
      for (const emb of embarques) {
        if (emb.estatus === 'entregado') {
          const item = emb.items.find(i => i.qr_code === trimmed && i.estado_recepcion === 'ok');
          if (item) {
            productoEncontrado = { id: item.producto_id, nombre: item.producto_nombre, precio: item.precio_unitario, sku: item.codigo_sku };
            prodId = item.producto_id;
            if (item.tienda_destino_id === tiendaId) {
              isStoreValid = true;
            }
          }
        }
      }
    }

    // 3. Buscar en terminados si no fue parte de un embarque
    if (!productoEncontrado) {
      const term = terminados.find(t => t.qr_code === trimmed);
      if (term) {
        productoEncontrado = { id: term.producto_id, nombre: term.producto_nombre, precio: term.precio_estimado, sku: term.codigo_sku };
        prodId = term.producto_id;
        isStoreValid = tiendaId === 1; // Asumir venta directa en tienda matriz
      }
    }

    // 4. Buscar directo por SKU en catálogo si coincide
    if (!productoEncontrado) {
      const prodBySku = productos.find(p => p.sku && p.sku.toUpperCase() === trimmed.toUpperCase());
      if (prodBySku) {
        const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === prodBySku.id);
        const precio = (inv && inv.precio_venta > 0) ? inv.precio_venta : (prodBySku.prices ? Object.values(prodBySku.prices)[0] || 0 : 0);
        productoEncontrado = { id: prodBySku.id, nombre: prodBySku.name, precio: precio, sku: prodBySku.sku };
        prodId = prodBySku.id;
        isStoreValid = true;
      }
    }

    // Validar y agregar al carrito
    if (productoEncontrado && isStoreValid) {
      // Verificar stock disponible
      const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === prodId);
      const cantidadEnCarrito = carrito.find(i => i.productoId === prodId)?.cantidad || 0;
      const stockDisponible = inv ? inv.cantidad_disponible : 0;
      const invId = inv ? inv.id : prodId;

      if (stockDisponible > cantidadEnCarrito) {
        // Agregar al carrito
        setCarrito(prev => {
          const idx = prev.findIndex(item => item.productoId === prodId);
          if (idx > -1) {
            // Ya existe en el carrito, añadir el QR a la lista y sumar cantidad
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              cantidad: updated[idx].cantidad + 1,
              qrs: [...updated[idx].qrs, trimmed]
            };
            return updated;
          } else {
            // Es un artículo nuevo en el carrito
            return [...prev, {
              productoId: prodId,
              inventarioTiendaId: invId,
              nombre: productoEncontrado!.nombre,
              precio: productoEncontrado!.precio,
              sku: productoEncontrado!.sku,
              cantidad: 1,
              qrs: [trimmed]
            }];
          }
        });
        setResult('success');
        setTimeout(() => setResult(null), 1500);
      } else {
        triggerError('Producto agotado o sin existencias suficientes en esta sucursal.');
      }
    } else {
      triggerError(!isStoreValid && productoEncontrado 
        ? 'Este producto pertenece a otra sucursal de Decor Mueblería.'
        : 'Código QR / SKU no encontrado en el catálogo o sistema.'
      );
    }
    
    setQrInput('');
    setShowCamera(false);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setResult('error');
    setTimeout(() => {
      setResult(null);
      setErrorMessage('');
    }, 4000);
  };

  // Funciones táctiles del Carrito (+ / - / eliminar)
  const handleIncreaseQty = (productoId: number) => {
    if (tiendaId === null) return;
    const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === productoId);
    const item = carrito.find(c => c.productoId === productoId);
    if (!item) return;

    const stockDisponible = inv ? inv.cantidad_disponible : 0;
    if (stockDisponible > item.cantidad) {
      const nuevoQr = `DCR-REC-${tiendaId}-${productoId}-${Date.now()}-${item.cantidad}`;
      setCarrito(prev => prev.map(c => 
        c.productoId === productoId 
          ? { ...c, cantidad: c.cantidad + 1, qrs: [...c.qrs, nuevoQr] } 
          : c
      ));
    } else {
      triggerError('No hay más stock disponible de este producto en la tienda.');
    }
  };

  const handleDecreaseQty = (productoId: number) => {
    setCarrito(prev => prev.map(c => {
      if (c.productoId === productoId) {
        const updatedQrs = [...c.qrs];
        updatedQrs.pop();
        return { ...c, cantidad: c.cantidad - 1, qrs: updatedQrs };
      }
      return c;
    }).filter(c => c.cantidad > 0));
  };

  const handleRemoveProduct = (productoId: number) => {
    setCarrito(prev => prev.filter(c => c.productoId !== productoId));
  };

  // Calcular totales
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPagar = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  // Manejo de la pantalla del Numpad Táctil
  const handleNumpadPress = (val: string) => {
    setMontoRecibido(prev => {
      if (prev === '0') {
        return val === '.' ? '0.' : val;
      }
      if (val === '.' && prev.includes('.')) return prev;
      return prev + val;
    });
  };

  const handleNumpadClear = () => {
    setMontoRecibido('0');
  };

  const handleNumpadDelete = () => {
    setMontoRecibido(prev => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleQuickCash = (cash: number) => {
    setMontoRecibido(cash.toString());
  };

  const numMontoRecibido = Number(montoRecibido) || 0;
  const cambioEntregar = Math.max(0, numMontoRecibido - totalPagar);
  const faltaCobrar = Math.max(0, totalPagar - numMontoRecibido);

  const canConfirmPayment = 
    metodoPago !== null && 
    (metodoPago !== 'efectivo' || numMontoRecibido >= totalPagar);

  // Checkout Transaccional con Base de Datos (DEC-006)
  const handleCobrar = async () => {
    if (tiendaId === null || carrito.length === 0 || !canConfirmPayment) return;

    if (!cajaActiva) {
      triggerError('No hay una caja abierta activa en esta sucursal. Por favor recarga la página.');
      return;
    }

    setProcesandoVenta(true);
    const checkoutItems = carrito.map(item => ({
      inventario_tienda_id: item.inventarioTiendaId || item.productoId,
      producto_id: item.productoId,
      cantidad: item.cantidad || item.qrs.length,
      precio_unitario: item.precio,
      descuento_item: 0
    }));

    const checkoutPagos = [
      {
        metodo: metodoPago || 'efectivo',
        monto: totalPagar,
        referencia: metodoPago === 'efectivo' 
          ? `Recibido: $${numMontoRecibido.toFixed(2)}, Cambio: $${cambioEntregar.toFixed(2)}`
          : `${metodoPago.toUpperCase()} Ref #${Date.now().toString().slice(-6)}`
      }
    ];

    const res = await procesarCheckout({
      caja_id: cajaActiva.caja_id,
      tienda_id: tiendaId,
      cliente_id: clienteSeleccionadoId,
      cliente_nombre_libre: clienteSeleccionadoId ? undefined : clienteNombreLibre,
      items: checkoutItems,
      pagos: checkoutPagos
    });

    if (res.ok) {
      setFolioVentaReal(res.folio || `#${String(res.venta_id || '').padStart(6, '0')}`);
      setUltimaVenta({
        id: res.venta_id || Date.now(),
        tienda_id: tiendaId,
        fecha_venta: new Date().toISOString(),
        total: res.total || totalPagar,
        items: carrito.map(c => ({
          id: c.productoId,
          producto_id: c.productoId,
          producto_nombre: c.nombre,
          codigo_sku: c.sku,
          qr_code: c.qrs[0] || `DCR-${c.productoId}`,
          precio_unitario: c.precio,
          cantidad: c.cantidad
        }))
      });
      setStep(3); // Avanzar a pantalla de éxito/ticket
      setEmailEnviado(false);
      setEmailCliente('');
    } else {
      triggerError(res.error || 'Ocurrió un error al registrar la venta en la base de datos.');
    }
    setProcesandoVenta(false);
  };

  // Cierre y Corte Z de Caja (DEC-005)
  const handleCerrarCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaActiva) return;
    setGuardandoCorte(true);
    const contado = parseFloat(efectivoContadoCierre) || 0;
    const res = await cerrarCaja(cajaActiva.caja_id, contado);
    if (res.ok) {
      setResultadoCorte({
        ok: true,
        diferencia: res.diferencia || 0,
        esperado: res.esperado || 0,
        contado: res.contado || 0,
        mensaje: res.mensaje || 'Caja cerrada exitosamente.'
      });
      setTimeout(() => {
        if (tiendaId !== null) fetchCajaActiva(tiendaId);
      }, 2500);
    } else {
      triggerError(res.error || 'Error al procesar el corte de caja.');
    }
    setGuardandoCorte(false);
  };

  const printCorteZTicket = () => {
    if (!resultadoCorte || !cajaActiva) return;
    const tienda = tiendas.find(t => t.id === tiendaId);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Corte Z - Cierre de Caja</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0 auto; padding: 4mm; color: #000; font-size: 11px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-bottom: 1px dashed #000; margin: 8px 0; }
        .flex { display: flex; justify-content: space-between; }
      </style></head>
      <body>
        <div class="center bold">DECOR MUEBLERÍA</div>
        <div class="center">${tienda?.nombre || 'Sucursal'} - CORTE Z</div>
        <div class="center">${new Date().toLocaleString('es-MX')}</div>
        <div class="line"></div>
        <div class="flex"><span>Fondo Inicial:</span><span>$${cajaActiva.fondo_inicial.toFixed(2)}</span></div>
        <div class="flex"><span>Total Esperado:</span><span>$${resultadoCorte.esperado.toFixed(2)}</span></div>
        <div class="flex bold"><span>Efectivo Contado:</span><span>$${resultadoCorte.contado.toFixed(2)}</span></div>
        <div class="line"></div>
        <div class="flex bold">
          <span>Diferencia:</span>
          <span>${resultadoCorte.diferencia >= 0 ? '+' : ''}$${resultadoCorte.diferencia.toFixed(2)} (${resultadoCorte.diferencia === 0 ? 'CUADRADO' : resultadoCorte.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE'})</span>
        </div>
        <div class="line"></div>
        <div class="center" style="margin-top: 25px;">Firma Cajero: ___________________</div>
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
    w.document.close();
  };

  const handleNewSale = () => {
    setCarrito([]);
    setMetodoPago(null);
    setMontoRecibido('0');
    setUltimaVenta(null);
    setFolioVentaReal('');
    setStep(1);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCliente) return;
    setEnviandoEmail(true);
    setTimeout(() => {
      setEnviandoEmail(false);
      setEmailEnviado(true);
    }, 1500);
  };

  const printTicket = () => {
    if (!ultimaVenta) return;
    const tienda = tiendas.find(t => t.id === tiendaId);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Ticket de Venta</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 72mm; 
          margin: 0 auto; 
          padding: 4mm; 
          color: #000; 
          font-size: 11px; 
          background: #fff;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .line { border-bottom: 1px dashed #000; margin: 8px 0; }
        .line-solid { border-bottom: 2px solid #000; margin: 8px 0; }
        .flex { display: flex; justify-content: space-between; }
        .text-xs { font-size: 9px; }
        .text-sm { font-size: 12px; }
        .text-lg { font-size: 16px; }
        .mt-2 { margin-top: 10px; }
        .mb-2 { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th { border-bottom: 1px solid #000; padding-bottom: 4px; text-align: left; }
        td { padding: 4px 0; vertical-align: top; }
        .col-qty { width: 15%; text-align: left; }
        .col-desc { width: 55%; }
        .col-price { width: 30%; text-align: right; }
        .footer { font-size: 9px; text-align: center; margin-top: 20px; color: #000; }
      </style>
      </head><body>
        <div class="center">
          <h2 class="text-lg bold uppercase" style="margin:0 0 5px 0;">DECOR MUEBLERÍA</h2>
          <p style="margin:2px 0;" class="bold text-sm">${tienda?.nombre || 'Sucursal'}</p>
          <p style="margin:2px 0;">${tienda?.direccion || ''}</p>
          <p style="margin:2px 0;">${tienda?.ciudad || ''}</p>
          <p style="margin:2px 0;" class="text-xs">RFC: DEC-000101-AAA</p>
        </div>
        
        <div class="line-solid mt-2 mb-2"></div>
        
        <div class="flex">
          <span>Fecha:</span>
          <span class="bold">${new Date(ultimaVenta.fecha_venta).toLocaleDateString('es-MX')} ${new Date(ultimaVenta.fecha_venta).toLocaleTimeString('es-MX')}</span>
        </div>
        <div class="flex">
          <span>Ticket #:</span>
          <span class="bold">${ultimaVenta.id.toString().slice(-6)}</span>
        </div>
        <div class="flex">
          <span>Cajero:</span>
          <span>Caja Central</span>
        </div>
        
        <div class="line mt-2 mb-2"></div>
        
        <table>
          <thead>
            <tr>
              <th class="col-qty">Cant</th>
              <th class="col-desc">Descripción</th>
              <th class="col-price">Importe</th>
            </tr>
          </thead>
          <tbody>
          ${ultimaVenta.items.map((item: any) => `
            <tr>
              <td class="col-qty bold">1</td>
              <td class="col-desc">
                ${item.producto_nombre}<br/>
                <span class="text-xs">[SKU: ${item.codigo_sku}]</span>
              </td>
              <td class="col-price">$${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
        
        <div class="line-solid mt-2 mb-2"></div>
        
        <div class="flex bold text-sm">
          <span>TOTAL:</span>
          <span>$${ultimaVenta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div class="center" style="margin-top: 15px;">
          <p class="bold">*** GRACIAS POR SU COMPRA ***</p>
        </div>
        
        <div class="footer">
          <p style="margin:3px 0;">Conserve este ticket para devoluciones.</p>
          <p style="margin:3px 0;">Cambios válidos solo durante los primeros 15 días presentando su ticket físico.</p>
          <p style="margin:10px 0;">www.decormuebleria.com.mx</p>
        </div>
        
        <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
    w.document.close();
  };

  // --- RENDER 0: CONFIGURAR CAJA ---
  if (tiendaId === null) {
    const tiendasActivas = tiendas.filter(t => t.activa);
    return (
      <div className="max-w-md mx-auto p-4 my-10">
        <div className="clay-card-cream p-8 text-center space-y-6 rounded-2xl">
          <div className="w-20 h-20 rounded-2xl bg-[#0d9488]/10 text-[#0d9488] flex items-center justify-center mx-auto shadow-sm">
            <Store size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#4a2818] tracking-tight">Configuración de Caja</h2>
            <p className="text-xs text-zinc-500">Selecciona la sucursal física en la que opera esta tablet</p>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-black text-[#4a2818]/70 uppercase tracking-wider block mb-2">Sucursal</label>
              <select 
                defaultValue="" 
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) {
                    setTiendaId(id);
                    localStorage.setItem('decor_pos_tienda_id', id.toString());
                  }
                }}
                className="w-full bg-white border border-[#e8dfcb] rounded-xl px-4 py-3 text-sm text-[#4a2818] focus:outline-none focus:border-[#0d9488]/55 transition-all shadow-sm"
              >
                <option value="" disabled className="text-zinc-400">-- Selecciona una sucursal --</option>
                {tiendasActivas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.ciudad})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 border-t border-[#e8dfcb] pt-4">
            * Este ajuste se guardará localmente en este dispositivo para futuras ventas.
          </div>
        </div>
      </div>
    );
  }

  const sucursalActiva = tiendas.find(t => t.id === tiendaId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* BARRA SUPERIOR DE CONTROL DE CAJA Y SUCURSAL (DEC-005) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-stone-200 px-5 py-3 rounded-2xl gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Sucursal:</span>
            <span className="text-xs font-black text-stone-900">{sucursalActiva?.nombre} ({sucursalActiva?.ciudad})</span>
          </div>

          {cajaActiva && (
            <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1 rounded-xl text-xs font-bold text-stone-800 shadow-sm">
              <Wallet size={14} className="text-[#0d9488]" />
              <span>{cajaActiva.nombre}</span>
              <span className="text-[11px] font-mono font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-lg">
                Efectivo: ${cajaActiva.total_efectivo_esperado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {cajaActiva && (
            <button 
              onClick={() => {
                setEfectivoContadoCierre(cajaActiva.total_efectivo_esperado.toString());
                setResultadoCorte(null);
                setShowModalCorteZ(true);
              }}
              className="text-[11px] text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl active:scale-95 shadow-sm"
              title="Realizar Corte Z y cierre de turno de caja"
            >
              <FileText size={13} className="text-amber-700" />
              <span>Corte Z / Cerrar Caja</span>
            </button>
          )}

          <button 
            onClick={toggleFullscreen}
            className="text-[11px] text-stone-700 hover:text-[#0d9488] font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 active:scale-95 shadow-sm"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
          </button>
          
          <button 
            onClick={() => {
              if (confirm('¿Seguro que deseas cambiar de sucursal? Se limpiará el carrito de la venta actual.')) {
                localStorage.removeItem('decor_pos_tienda_id');
                setTiendaId(null);
                setCarrito([]);
                setStep(1);
              }
            }}
            className="text-[11px] text-stone-700 hover:text-[#0d9488] font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 active:scale-95 shadow-sm"
          >
            <RefreshCw size={12} /> <span className="hidden sm:inline">Cambiar Sucursal</span>
          </button>
        </div>
      </div>

      {/* STEPPER SUPERIOR DEL WIZARD */}
      <div className="bg-white border border-stone-200 py-4 px-6 md:px-12 flex justify-between items-center relative rounded-2xl shadow-sm">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-stone-200 -translate-y-1/2 z-0 hidden sm:block" />
        
        {/* Step 1 */}
        <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 1 ? 'bg-[#0d9488] text-white' : 'bg-stone-100 text-stone-600'}`}>
            1
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 1 ? 'text-teal-700' : 'text-stone-500'}`}>Registro</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 2 ? 'bg-[#0d9488] text-white' : 'bg-stone-100 text-stone-600'}`}>
            2
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 2 ? 'text-teal-700' : 'text-stone-500'}`}>Método de Pago</span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 3 ? 'bg-[#0d9488] text-white' : 'bg-stone-100 text-stone-600'}`}>
            3
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 3 ? 'text-teal-700' : 'text-stone-500'}`}>Cierre</span>
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {result === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 animate-scale-in flex items-center gap-3 shadow-md">
          <XCircle size={24} className="text-red-500 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-black text-red-700">Error en Operación</p>
            <p className="text-[11px] text-red-600 font-medium">{errorMessage || 'QR no encontrado o producto agotado.'}</p>
          </div>
        </div>
      )}

      {/* --- STEP 1: CAPTURA DE PRODUCTOS (MODO DUAL) --- */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Captura (Lado Izquierdo) */}
          <div className="lg:col-span-5 bg-white border border-stone-200 shadow-md p-5 space-y-4 text-center rounded-2xl">
            {/* Selector de modo dual */}
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setModoCaptura('scan')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  modoCaptura === 'scan'
                    ? 'bg-[#0d9488] text-white shadow-sm font-black'
                    : 'text-stone-700 hover:bg-white/80 font-bold'
                }`}
              >
                <Camera size={14} />
                <span>Pistola / Escáner QR</span>
              </button>
              <button
                type="button"
                onClick={() => setModoCaptura('catalogo')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  modoCaptura === 'catalogo'
                    ? 'bg-[#0d9488] text-white shadow-sm font-black'
                    : 'text-stone-700 hover:bg-white/80 font-bold'
                }`}
              >
                <Layers size={14} />
                <span>Catálogo Rápido</span>
              </button>
            </div>

            {modoCaptura === 'scan' ? (
              <div className="space-y-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Escaneo Directo</h3>
                  <p className="text-[11px] text-stone-500">Usa la cámara de la tablet o dispara con pistola de código de barras.</p>
                </div>

                {/* Selector de cámara */}
                {showCamera ? (
                  <div className="relative max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-[#0d9488]/50 shadow-lg">
                    <Scanner
                      onScan={(result) => {
                        if (result && result.length > 0) handleScan(result[0].rawValue);
                      }}
                      onError={(error) => console.error(error?.message)}
                    />
                    <button onClick={() => setShowCamera(false)} className="absolute top-2 right-2 p-2 bg-black/75 hover:bg-black/90 rounded-full text-white backdrop-blur-md transition-colors">
                      <X size={18} />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white bg-black/60 p-1.5 backdrop-blur-md tracking-wide uppercase font-bold">
                      Escaneando código QR
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowCamera(true)} 
                    className="w-full max-w-xs mx-auto aspect-video bg-stone-50 hover:bg-stone-100 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group border border-stone-200 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#0d9488]/10 text-[#0d9488] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      <Camera size={28} className="stroke-[2]" />
                    </div>
                    <span className="text-xs font-black text-stone-900 tracking-tight">Activar Cámara de la Tablet</span>
                  </button>
                )}

                {/* Input manual con auto-focus continuo */}
                <div className="relative max-w-xs mx-auto space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0d9488]" size={16} />
                    <input
                      ref={inputRef}
                      value={qrInput}
                      onChange={e => {
                        const val = e.target.value;
                        if (val && !qrInput) {
                          startInputTime.current = Date.now();
                        }
                        setQrInput(val);
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleScan(qrInput)}
                      className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-center font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15 transition-all shadow-sm"
                      placeholder="Escanea con pistola o escribe SKU / QR"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-center items-center gap-1.5 text-[10px] text-emerald-700 font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Escáner de pistola listo para capturar
                  </div>
                </div>
              </div>
            ) : (
              /* Modo Catálogo Rápido con Stock */
              <div className="space-y-3 text-left">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                  <input
                    type="text"
                    value={busquedaCatalogo}
                    onChange={e => setBusquedaCatalogo(e.target.value)}
                    placeholder="Buscar por SKU o Nombre..."
                    className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488] shadow-sm"
                  />
                  {busquedaCatalogo && (
                    <button onClick={() => setBusquedaCatalogo('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Categorías chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-[11px]">
                  <button
                    onClick={() => setCategoriaFiltroCatalogo('todas')}
                    className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                      categoriaFiltroCatalogo === 'todas'
                        ? 'bg-[#0d9488] text-white shadow-sm font-black'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-[#0d9488]'
                    }`}
                  >
                    Todas
                  </button>
                  {categorias.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategoriaFiltroCatalogo(c.nombre)}
                      className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
                        categoriaFiltroCatalogo === c.nombre
                          ? 'bg-[#0d9488] text-white shadow-sm font-black'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-[#0d9488]'
                      }`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>

                {/* Lista de productos con stock */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {productosCatalogoTienda.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">No hay productos que coincidan</p>
                  ) : (
                    productosCatalogoTienda.map(p => {
                      const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === p.id);
                      const stock = inv ? inv.cantidad_disponible : 0;
                      const precio = (inv && inv.precio_venta > 0) ? inv.precio_venta : (p.prices ? Object.values(p.prices)[0] || 0 : 0);
                      const isSinStock = stock <= 0;

                      return (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isSinStock 
                              ? 'bg-stone-50/90 border-stone-200' 
                              : 'bg-white border-stone-200 hover:border-teal-500/60 shadow-sm hover:shadow'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className={`text-xs font-bold truncate ${isSinStock ? 'text-stone-700' : 'text-stone-900'}`}>
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              <span className="font-mono text-stone-500 font-semibold">SKU: {p.sku || `DCR-${p.id}`}</span>
                              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                stock > 0 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {stock > 0 ? `Stock: ${stock}` : 'Agotado (0)'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className={`text-xs font-black ${isSinStock ? 'text-teal-700/60' : 'text-teal-700 font-black'}`}>
                              ${precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAgregarDesdeCatalogo(p)}
                              disabled={isSinStock}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                isSinStock
                                  ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                                  : 'bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-sm hover:shadow'
                              }`}
                            >
                              + Agregar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Alerta de éxito de escaneo corta */}
            {result === 'success' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 inline-flex items-center gap-2 animate-scale-in text-xs text-emerald-800 font-black shadow-sm">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ¡Artículo agregado al carrito!
              </div>
            )}
          </div>

          {/* Carrito de Compras (Lado Derecho) */}
          <div className={`lg:col-span-7 bg-white border border-stone-200 overflow-hidden shadow-md flex flex-col min-h-[400px] rounded-2xl transition-all duration-350 ${result === 'success' ? 'ring-2 ring-emerald-500/50 shadow-emerald-500/10' : ''}`}>
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#0d9488]" /> Carrito de Venta
              </h3>
              <span className="text-[10px] font-black uppercase bg-stone-800 text-white px-3.5 py-1.5 rounded-full shadow-sm">
                {totalArticulos} artículos
              </span>
            </div>

            {carrito.length === 0 ? (
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-center space-y-3 text-stone-400">
                <ShoppingBag size={56} className="stroke-[1] opacity-40 text-[#0d9488]" />
                <p className="text-sm font-bold text-stone-900">El carrito está vacío</p>
                <p className="text-xs max-w-xs text-stone-500">Usa el escáner o el catálogo rápido para agregar artículos al cobro de esta sucursal.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Listado de items */}
                <div className="divide-y divide-stone-100 max-h-[350px] overflow-y-auto p-4 space-y-3">
                  {carrito.map((item) => (
                    <div key={item.productoId} className="flex justify-between items-center py-3.5 bg-stone-50/70 hover:bg-stone-50 px-4 rounded-2xl border border-stone-200/80 shadow-sm transition-all duration-200">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-stone-900">{item.nombre}</p>
                        <p className="text-[10px] font-bold font-mono text-stone-500 uppercase tracking-wider">SKU: {item.sku}</p>
                      </div>
                      
                      {/* Controles táctiles */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex items-center bg-white border border-stone-200 rounded-2xl p-1 shadow-inner">
                          <button 
                            onClick={() => handleDecreaseQty(item.productoId)}
                            className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 flex items-center justify-center text-lg font-black active:scale-90 transition-transform border border-stone-200"
                          >
                            -
                          </button>
                          <span className="w-10 text-center text-sm font-black text-stone-900">{item.cantidad}</span>
                          <button 
                            onClick={() => handleIncreaseQty(item.productoId)}
                            className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 flex items-center justify-center text-lg font-black active:scale-90 transition-transform border border-stone-200"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right w-24">
                          <p className="text-sm font-black text-teal-700">${(item.precio * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-stone-500">${item.precio.toLocaleString('es-MX')} c/u</p>
                        </div>

                        <button 
                          onClick={() => handleRemoveProduct(item.productoId)}
                          className="text-stone-400 hover:text-red-500 p-2.5 active:scale-90 transition-transform hover:bg-red-50 rounded-xl"
                          title="Eliminar de la lista"
                        >
                          <X size={20} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal y botón de avanzar */}
                <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-between items-center rounded-b-2xl">
                  <div>
                    <span className="text-[10px] text-stone-500 block mb-0.5 uppercase font-bold tracking-wider">Total a cobrar:</span>
                    <span className="text-2xl font-black text-teal-700">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button 
                    onClick={() => setStep(2)}
                    className="py-3.5 px-7 shadow-lg shadow-[#0d9488]/15 text-xs font-black flex items-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl active:scale-[0.97] transition-all"
                  >
                    Proceder al Pago <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- STEP 2: METODO DE PAGO Y CHECKOUT TRANSACCIONAL --- */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Resumen del Cobro y Cliente (Lado Izquierdo) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Total a pagar gigante */}
            <div className="bg-white border border-stone-200 shadow-md p-6 text-center space-y-2 rounded-2xl">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Total a Cobrar</span>
              <p className="text-4xl font-black text-teal-700 tracking-tight">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <span className="text-xs bg-stone-100 border border-stone-200 text-stone-800 px-4 py-1.5 rounded-full inline-block font-mono font-bold shadow-sm">
                {totalArticulos} artículos a liquidar
              </span>
            </div>

            {/* Selector de Cliente */}
            <div className="bg-white border border-stone-200 shadow-md p-4 space-y-3 rounded-2xl text-left">
              <label className="text-xs font-black text-stone-900 uppercase tracking-wider block">
                Cliente Asociado a la Venta
              </label>
              <div className="space-y-2">
                <select
                  value={clienteSeleccionadoId || ''}
                  onChange={e => {
                    const cid = Number(e.target.value);
                    if (cid) {
                      setClienteSeleccionadoId(cid);
                      const c = clientes.find(item => item.id === cid);
                      if (c) setEmailCliente(c.email || '');
                    } else {
                      setClienteSeleccionadoId(null);
                    }
                  }}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="">Público General (Venta de Mostrador)</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                    </option>
                  ))}
                </select>

                {!clienteSeleccionadoId && (
                  <input
                    type="text"
                    value={clienteNombreLibre}
                    onChange={e => setClienteNombreLibre(e.target.value)}
                    placeholder="Nombre del cliente o nota rápida..."
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]"
                  />
                )}
              </div>
            </div>

            {/* Selector de método de pago */}
            <div className="bg-white border border-stone-200 shadow-md p-5 space-y-4 rounded-2xl">
              <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Selecciona Método de Pago</h3>
              <div className="space-y-3">
                {/* Efectivo */}
                <button
                  onClick={() => { setMetodoPago('efectivo'); handleNumpadClear(); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'efectivo' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500/20 font-black' : 'bg-stone-50/80 border-stone-200 hover:border-stone-400 text-stone-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'efectivo' ? 'bg-emerald-500/20 text-emerald-800' : 'bg-stone-200/70 text-stone-600'}`}>
                      <Wallet size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Efectivo</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'efectivo' ? 'text-emerald-700' : 'text-stone-400'} />
                </button>

                {/* Tarjeta */}
                <button
                  onClick={() => { setMetodoPago('tarjeta'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'tarjeta' ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500/20 font-black' : 'bg-stone-50/80 border-stone-200 hover:border-stone-400 text-stone-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'tarjeta' ? 'bg-blue-500/20 text-blue-800' : 'bg-stone-200/70 text-stone-600'}`}>
                      <CreditCard size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Tarjeta de Crédito / Débito</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'tarjeta' ? 'text-blue-700' : 'text-stone-400'} />
                </button>

                {/* Transferencia */}
                <button
                  onClick={() => { setMetodoPago('transferencia'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'transferencia' ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-sm ring-1 ring-purple-500/20 font-black' : 'bg-stone-50/80 border-stone-200 hover:border-stone-400 text-stone-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'transferencia' ? 'bg-purple-500/20 text-purple-800' : 'bg-stone-200/70 text-stone-600'}`}>
                      <Landmark size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Transferencia Interbancaria</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'transferencia' ? 'text-purple-700' : 'text-stone-400'} />
                </button>
              </div>
            </div>
          </div>

          {/* Panel Numérico o Instrucciones (Lado Derecho) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 shadow-md p-6 min-h-[380px] flex flex-col justify-between rounded-2xl">
            {metodoPago === null ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3 p-6 text-stone-400">
                <Wallet size={56} className="stroke-[1] opacity-40 text-[#0d9488]" />
                <p className="text-sm font-bold text-stone-900">Esperando selección de pago</p>
                <p className="text-xs max-w-xs text-stone-500">Selecciona a la izquierda cómo liquidará la cuenta el cliente en el mostrador.</p>
              </div>
            ) : metodoPago === 'efectivo' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  {/* Cifras de cobro */}
                  <div className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-black tracking-wider block">Total a Cobrar</span>
                      <span className="text-xl font-black text-stone-900">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-black tracking-wider block">Monto Recibido</span>
                      <span className="text-2xl font-black text-teal-700">${numMontoRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-stone-200 pt-3">
                      {numMontoRecibido >= totalPagar ? (
                        <div>
                          <span className="text-[10px] text-emerald-700 uppercase font-black tracking-wider block">Cambio a Entregar</span>
                          <span className="text-3xl font-black text-emerald-700">${cambioEntregar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-rose-600 uppercase font-black tracking-wider block">Falta por Cobrar</span>
                          <span className="text-3xl font-black text-rose-600">${faltaCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teclado Billetes Rápidos */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-stone-900 uppercase font-black tracking-wider block">Billetes Rápidos (MXN)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleQuickCash(50)} 
                        className="py-3 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $50.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(100)} 
                        className="py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $100.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(200)} 
                        className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $200.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(500)} 
                        className="py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $500.00
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleQuickCash(1000)} 
                        className="py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $1,000.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(totalPagar)} 
                        className="py-3 px-4 rounded-xl bg-[#0d9488]/10 hover:bg-[#0d9488]/20 border border-[#0d9488]/30 text-[#0d9488] font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        Pago Exacto
                      </button>
                    </div>
                  </div>
                </div>

                {/* Teclado Numérico Numpad */}
                <div className="max-w-xs mx-auto mt-6">
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
                      <button 
                        key={val} 
                        onClick={() => handleNumpadPress(val)}
                        className="py-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl font-black text-base text-stone-900 active:scale-95 transition-all shadow-sm"
                      >
                        {val}
                      </button>
                    ))}
                    <button 
                      onClick={() => handleNumpadPress('.')}
                      className="py-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl font-black text-base text-stone-900 active:scale-95 transition-all shadow-sm"
                    >
                      .
                    </button>
                    <button 
                      onClick={() => handleNumpadPress('0')}
                      className="py-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl font-black text-base text-stone-900 active:scale-95 transition-all shadow-sm"
                    >
                      0
                    </button>
                    <button 
                      onClick={handleNumpadDelete}
                      className="py-4 bg-stone-50 hover:bg-rose-50 border border-stone-200 rounded-xl font-black text-base text-rose-600 active:scale-95 transition-all shadow-sm"
                    >
                      ⌫
                    </button>
                  </div>
                  <button 
                    onClick={handleNumpadClear}
                    className="w-full mt-3 py-2.5 border border-stone-200 text-[11px] text-stone-600 hover:text-stone-900 font-black uppercase tracking-wider rounded-xl active:scale-95 transition-all bg-stone-50 shadow-inner"
                  >
                    Limpiar Monto Recibido
                  </button>
                </div>
              </div>
            ) : (
              // Tarjeta o Transferencia
              <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 p-6">
                <div className={`p-4 rounded-2xl shadow-sm ${metodoPago === 'tarjeta' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                  {metodoPago === 'tarjeta' ? <CreditCard size={44} className="stroke-[1.5]" /> : <Landmark size={44} className="stroke-[1.5]" />}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider">Instrucción para Cajero</h4>
                  <p className="text-xs text-stone-600 max-w-sm leading-relaxed">
                    {metodoPago === 'tarjeta' 
                      ? `Inserta la tarjeta del cliente en la Terminal Bancaria y procesa la transacción física por $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`
                      : `Verifica que se haya recibido la transferencia bancaria SPEI por la cantidad de $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en el portal bancario.`
                    }
                  </p>
                </div>
                <div className="bg-stone-100 px-4 py-2 border border-stone-200 rounded-xl text-[10px] text-emerald-800 font-black uppercase tracking-wider shadow-sm">
                  Pago Autorizado Externamente
                </div>
              </div>
            )}

            {/* Acciones de Flujo Inferior */}
            <div className="border-t border-stone-200 pt-4 mt-6 flex justify-between gap-4">
              <button 
                onClick={() => setStep(1)}
                className="px-5 py-3.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-800 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm bg-white"
              >
                <ArrowLeft size={16} /> Volver a Artículos
              </button>
              
              <button 
                onClick={handleCobrar}
                disabled={!canConfirmPayment || procesandoVenta}
                className={`flex-1 py-3.5 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                  canConfirmPayment && !procesandoVenta 
                    ? 'bg-[#0d9488] text-white hover:bg-[#0f766e] shadow-teal-500/20' 
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                }`}
              >
                {procesandoVenta ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Procesando Venta...
                  </>
                ) : (
                  <>
                    Cobrar y Guardar en BD <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: COMPLETADO Y TICKET REAL --- */}
      {step === 3 && ultimaVenta && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
          
          {/* Banner animado de éxito */}
          <div className="clay-card-cream p-6 border border-emerald-500/20 bg-emerald-50/45 space-y-3 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-emerald-500/10 text-[#5a6b5c] rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 size={36} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#5a6b5c]">¡Venta Procesada con Éxito!</h3>
              <p className="text-xs text-zinc-550">
                Folio Transaccional: <span className="font-bold font-mono text-emerald-800">{folioVentaReal || `#${ultimaVenta.id}`}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left">
            
            {/* Previsualización del Ticket (Lado Izquierdo) */}
            <div className="bg-white text-zinc-950 border border-zinc-200 rounded-2xl shadow-xl p-5 flex flex-col font-mono text-[10px] space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-200 flex overflow-hidden">
                {Array.from({ length: 25 }).map((_, idx) => (
                  <div key={idx} className="w-4 h-4 bg-white -translate-y-2.5 rotate-45 shrink-0 border-r border-b border-zinc-200" />
                ))}
              </div>

              <div className="text-center pt-3">
                <h4 className="text-xs font-black uppercase">DECOR MUEBLERÍA</h4>
                <p className="font-bold text-[9px]">{sucursalActiva?.nombre}</p>
                <p className="text-[8px] text-zinc-500">{sucursalActiva?.direccion}</p>
                <p className="text-[8px] text-zinc-500">RFC: DEC-000101-AAA</p>
              </div>

              <div className="border-b border-dashed border-zinc-300 my-1" />

              <div className="space-y-1 text-[9px]">
                <div className="flex justify-between"><span>Fecha:</span><span className="font-bold">{new Date(ultimaVenta.fecha_venta).toLocaleDateString('es-MX')} {new Date(ultimaVenta.fecha_venta).toLocaleTimeString('es-MX')}</span></div>
                <div className="flex justify-between"><span>Ticket #:</span><span className="font-bold text-zinc-900">{folioVentaReal || `#${ultimaVenta.id.toString().slice(-6)}`}</span></div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold truncate max-w-[120px]">
                    {clienteSeleccionadoId ? clientes.find(c => c.id === clienteSeleccionadoId)?.nombre : clienteNombreLibre}
                  </span>
                </div>
                <div className="flex justify-between"><span>Caja:</span><span>{cajaActiva?.nombre || 'Caja 1'}</span></div>
              </div>

              <div className="border-b border-dashed border-zinc-300 my-1" />

              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b border-zinc-300">
                    <th className="text-left font-bold py-1">Cant</th>
                    <th className="text-left font-bold py-1">Desc</th>
                    <th className="text-right font-bold py-1">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimaVenta.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1 font-bold">{item.cantidad || 1}</td>
                      <td className="py-1 truncate max-w-[120px]">{item.producto_nombre}</td>
                      <td className="py-1 text-right">${((item.precio_unitario || 0) * (item.cantidad || 1)).toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-b border-dashed border-zinc-300 my-1" />

              <div className="flex justify-between text-xs font-black">
                <span>TOTAL:</span>
                <span>${ultimaVenta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="text-center pt-4 text-[8px] space-y-1">
                <p className="font-bold">*** GRACIAS POR SU COMPRA ***</p>
                <p className="text-zinc-500">Conserve este ticket para cualquier cambio.</p>
              </div>
            </div>

            {/* Acciones Finales (Lado Derecho) */}
            <div className="space-y-5">
              
              {/* Opción Email */}
              <div className="clay-card-cream p-5 space-y-4 rounded-2xl">
                <h4 className="text-xs font-black text-[#4a2818] uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={16} className="text-[#0d9488]" /> Enviar Ticket Digital
                </h4>
                
                {emailEnviado ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2 animate-scale-in">
                    <CheckCircle2 size={28} className="text-[#5a6b5c] mx-auto" />
                    <p className="text-xs font-bold text-[#5a6b5c]">¡Correo Enviado!</p>
                    <p className="text-[10px] text-zinc-550">El ticket de compra se envió a: <strong>{emailCliente}</strong></p>
                  </div>
                ) : (
                  <form onSubmit={handleSendEmail} className="space-y-3">
                    <input 
                      type="email"
                      required
                      value={emailCliente}
                      onChange={e => setEmailCliente(e.target.value)}
                      placeholder="correo@cliente.com"
                      className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3 text-xs text-[#4a2818] focus:outline-none focus:border-[#0d9488]/40"
                    />
                    <button 
                      type="submit" 
                      disabled={enviandoEmail}
                      className="w-full btn-secondary py-3 text-xs font-black flex justify-center items-center gap-2 bg-white text-[#4a2818] border border-[#e8dfcb] rounded-xl active:scale-95 transition-all"
                    >
                      {enviandoEmail ? 'Enviando...' : 'Enviar por Email'}
                    </button>
                  </form>
                )}
              </div>

              {/* Acciones de Botones Físicos */}
              <div className="space-y-3">
                <button 
                  onClick={printTicket}
                  className="w-full py-3.5 rounded-xl border border-[#e8dfcb] hover:bg-[#FAF6EE] text-[#4a2818] font-bold text-xs flex justify-center items-center gap-2 active:scale-98 transition-all bg-white shadow-sm"
                >
                  <Printer size={16} className="text-zinc-550" /> Imprimir Ticket Físico (80mm)
                </button>

                <button 
                  onClick={handleNewSale}
                  className="w-full py-4 rounded-xl shadow-lg shadow-[#0d9488]/15 text-xs font-black flex justify-center items-center gap-2 active:scale-98 transition-all bg-[#0d9488] hover:bg-[#0d9488]/90 text-white"
                >
                  Iniciar Nueva Venta <ChevronRight size={16} />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL CORTE Z / CIERRE DE CAJA (DEC-005) */}
      {showModalCorteZ && cajaActiva && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900">Arqueo de Caja y Corte Z</h3>
                  <p className="text-[10px] text-stone-500 font-medium">{sucursalActiva?.nombre} - {cajaActiva.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalCorteZ(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {!resultadoCorte ? (
              <form onSubmit={handleCerrarCajaSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Fondo Inicial</span>
                    <span className="text-sm font-black text-stone-900">
                      ${cajaActiva.fondo_inicial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Efectivo Esperado</span>
                    <span className="text-base font-black text-emerald-700">
                      ${cajaActiva.total_efectivo_esperado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-900 block">
                    Total Efectivo Contado Físicamente en Cajón ($ MXN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={efectivoContadoCierre}
                    onChange={e => setEfectivoContadoCierre(e.target.value)}
                    className="w-full bg-white border-2 border-stone-300 focus:border-[#0d9488] rounded-xl px-4 py-3 text-lg font-black text-stone-900 focus:outline-none shadow-sm"
                    placeholder="0.00"
                    autoFocus
                  />
                  {(() => {
                    const contado = parseFloat(efectivoContadoCierre) || 0;
                    const diff = contado - cajaActiva.total_efectivo_esperado;
                    return (
                      <div className="flex items-center justify-between text-xs font-bold pt-1">
                        <span className="text-stone-500">Diferencia Calculada:</span>
                        <span className={`px-2.5 py-1 rounded-lg font-black ${
                          diff === 0 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : diff > 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({diff === 0 ? 'Cuadre Exacto' : diff > 0 ? 'Sobrante' : 'Faltante'})
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModalCorteZ(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoCorte}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {guardandoCorte ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                    <span>Confirmar Cierre de Caja</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-5 text-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="text-base font-black text-stone-900">¡Caja Cerrada Correctamente!</h4>
                  <p className="text-xs text-stone-500 mt-1">{resultadoCorte.mensaje}</p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Efectivo Esperado:</span>
                    <span className="font-bold text-stone-900">${resultadoCorte.esperado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Efectivo Contado:</span>
                    <span className="font-bold text-stone-900">${resultadoCorte.contado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-2 font-black">
                    <span className="text-stone-900">Diferencia:</span>
                    <span className={resultadoCorte.diferencia >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                      {resultadoCorte.diferencia >= 0 ? '+' : ''}${resultadoCorte.diferencia.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={printCorteZTicket}
                    className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black flex items-center gap-2 shadow-sm"
                  >
                    <Printer size={15} /> Imprimir Comprobante Corte Z
                  </button>
                  <button
                    onClick={() => setShowModalCorteZ(false)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
