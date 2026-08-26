import { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, CheckCircle2, Lock, Unlock, XCircle, Search, Camera, X, 
  ArrowLeft, CreditCard, Wallet, Landmark, RefreshCw, 
  Mail, ChevronRight, Store, ArrowRight, Printer,
  Maximize2, Minimize2
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useDecor } from '../store/StoreContext';
import type { Venta } from '../store/useStore';
import { calculateTotals, calculatePaymentInfo, handleNumpadInput } from '../utils/posLogic';


interface CartItem {
  productoId: number;
  inventario_tienda_id: number;
  cantidad: number;
  nombre: string;
  precio: number;
  sku: string;
  qrs: string[];
}

export default function PuntoDeVentaPage() {
  const { registrarVentaCarrito, tiendas, embarques, terminados, inventario, productos, apiFetch } = useDecor();
  
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
  
  // Estados para el flujo de pago
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | null>(null);
  const [montoRecibido, setMontoRecibido] = useState<string>('0');
  const [ultimaVenta, setUltimaVenta] = useState<Venta | null>(null);
  
  // Estado para envío de ticket por correo
  const [emailCliente, setEmailCliente] = useState('');
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // Caja State
  const [cajaActual, setCajaActual] = useState<any>(null);
  const [showAbrirCaja, setShowAbrirCaja] = useState(false);
  const [showCerrarCaja, setShowCerrarCaja] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('0');
  const [efectivoContado, setEfectivoContado] = useState('0');
  const [cierreResult, setCierreResult] = useState<any>(null);
  const [isFetchingCaja, setIsFetchingCaja] = useState(false);

  // Fetch caja actual
  useEffect(() => {
    if (!tiendaId) return;
    setIsFetchingCaja(true);
    apiFetch('/ventas/caja.php?tienda_id=' + tiendaId)
      .then(res => res.json())
      .then(res => {
        if (res.caja_id) {
          setCajaActual(res.caja);
          setShowAbrirCaja(false);
        } else {
          setCajaActual(null);
          setShowAbrirCaja(true);
        }
      })
      .catch(console.error)
      .finally(() => setIsFetchingCaja(false));
  }, [tiendaId, apiFetch]);

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiendaId) return;
    try {
      const req = await apiFetch('/ventas/caja_abrir.php', {
        method: 'POST',
        body: JSON.stringify({ tienda_id: tiendaId, fondo_inicial: Number(fondoInicial) })
      });
      const res = await req.json();
      if (res.ok) {
        setCajaActual({ id: res.caja_id, fondo_inicial: Number(fondoInicial) });
        setShowAbrirCaja(false);
      }
    } catch (e) {
      alert('Error al abrir caja');
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaActual) return;
    try {
      const req = await apiFetch('/ventas/caja_cerrar.php', {
        method: 'POST',
        body: JSON.stringify({ caja_id: cajaActual.caja_id || cajaActual.id, total_efectivo_contado: Number(efectivoContado) })
      });
      const res = await req.json();
      if (res.ok) {
        setCierreResult(res);
      }
    } catch (e) {
      alert('Error cerrando caja');
    }
  };

  const finishCierre = () => {
    setCajaActual(null);
    setShowCerrarCaja(false);
    setCierreResult(null);
    setShowAbrirCaja(true);
  };


  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || tiendaId === null) return;

    const qrExistente = carrito.some(item => item.qrs.includes(trimmed));
    if (qrExistente) {
      setQrInput('');
      setShowCamera(false);
      return;
    }

    try {
      const req = await apiFetch('/inventario/scan.php?codigo=' + encodeURIComponent(trimmed) + '&tienda_id=' + tiendaId);
      const data = await req.json();
      if (data.ok && data.tipo_item === 'producto') {
        const prod = data.data;
        if (prod.stock_disponible <= 0) {
          triggerError('El producto ' + prod.nombre + ' no tiene stock disponible en esta tienda.');
          return;
        }

        const existingItemIndex = carrito.findIndex(i => i.productoId === prod.id && i.precio === prod.precio_venta);
        if (existingItemIndex >= 0) {
          const newCart = [...carrito];
          newCart[existingItemIndex].qrs.push(trimmed);
          newCart[existingItemIndex].cantidad = (newCart[existingItemIndex].cantidad || 1) + 1;
          setCarrito(newCart);
        } else {
          setCarrito(prev => [...prev, {
            productoId: prod.id,
            inventario_tienda_id: prod.inventario_tienda_id,
            cantidad: 1,
            nombre: prod.nombre,
            precio: prod.precio_venta,
            sku: prod.codigo,
            qrs: [trimmed]
          }]);
        }
        
        setResult('success');
        setTimeout(() => setResult(null), 1500);
        setQrInput('');
        setShowCamera(false);
      } else {
        triggerError('Producto no encontrado en inventario de tienda.');
      }
    } catch (e) {
      triggerError('Error de red al buscar el codigo.');
    }
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
    setCarrito(prev => prev.map(c => 
      c.productoId === productoId 
        ? { ...c, cantidad: (c.cantidad || 1) + 1 }
        : c
    ));
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
  const { totalArticulos, totalPagar } = calculateTotals(carrito);

  // Manejo de la pantalla del Numpad Táctil
  const handleNumpadPress = (val: string) => {
    setMontoRecibido(prev => handleNumpadInput(val, prev));
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

  const { numMontoRecibido, cambioEntregar, faltaCobrar, canConfirmPayment } = calculatePaymentInfo(totalPagar, montoRecibido, metodoPago);

  const handleCobrar = async () => {
    if (tiendaId === null || carrito.length === 0 || !canConfirmPayment) return;
    if (!cajaActual) {
      triggerError('No hay turno abierto (caja).');
      return;
    }

    try {
      const payload = {
        caja_id: cajaActual.caja_id || cajaActual.id,
        tienda_id: tiendaId,
        pagos: [{ metodo: metodoPago, monto: Number(montoRecibido) }],
        items: carrito.map(item => ({
          inventario_tienda_id: item.inventario_tienda_id,
          producto_id: item.productoId,
          cantidad: item.cantidad || 1,
          precio_unitario: item.precio,
          descuento_item: 0
        }))
      };

      const req = await apiFetch('/ventas/checkout.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await req.json();
      
      if (data.ok) {
        setUltimaVenta({
          id: data.venta_id,
          folio: data.folio,
          fecha_venta: new Date().toISOString(),
          total: data.total,
          items: carrito.map(i => ({ producto_nombre: i.nombre, precio_unitario: i.precio, cantidad: i.cantidad }))
        } as any);
        setStep(3);
        setEmailEnviado(false);
        setEmailCliente('');
      } else {
        triggerError(data.error || 'Ocurrio un error al cobrar.');
      }
    } catch (e) {
      triggerError('Error de red al procesar el cobro.');
    }
  };

  const handleNewSale = () => {
    setCarrito([]);
    setMetodoPago(null);
    setMontoRecibido('0');
    setUltimaVenta(null);
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
          <div className="w-20 h-20 rounded-2xl bg-[#c2703e]/10 text-[#c2703e] flex items-center justify-center mx-auto shadow-sm">
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
                className="w-full bg-white border border-[#e8dfcb] rounded-xl px-4 py-3 text-sm text-[#4a2818] focus:outline-none focus:border-[#c2703e]/55 transition-all shadow-sm"
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
      {/* BARRA SUPERIOR DISCRETA DE CAJA */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#f4eedf] border border-[#e8dfcb] px-5 py-3 rounded-2xl gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-[#5a6b5c] uppercase tracking-wider">Caja Activa:</span>
          <span className="text-xs font-black text-[#4a2818]">{sucursalActiva?.nombre} ({sucursalActiva?.ciudad})</span>
        </div>
        <div className="flex items-center gap-2.5">
          {cajaActual && !showAbrirCaja && !cierreResult && (
            <button
              onClick={() => setShowCerrarCaja(true)}
              className="text-[11px] font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl border active:scale-95 bg-red-100 text-red-600 border-red-200 hover:bg-red-200"
            >
              <Lock size={12} /> Cerrar Caja
            </button>
          )}
          <button 
            onClick={toggleFullscreen}
            className="text-[11px] text-[#4a2818] hover:text-[#c2703e] font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl clay-btn-white border border-[#e8dfcb]/60 active:scale-95"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
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
            className="text-[11px] text-[#4a2818] hover:text-[#c2703e] font-bold transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-xl clay-btn-white border border-[#e8dfcb]/60 active:scale-95"
          >
            <RefreshCw size={12} /> Cambiar Sucursal
          </button>
        </div>
      </div>

      {/* STEPPER SUPERIOR DEL WIZARD */}
      <div className="clay-card-cream py-5 px-6 md:px-12 flex justify-between items-center relative rounded-2xl">
        <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-[#e8dfcb] -translate-y-1/2 z-0 hidden sm:block" />
        
        {/* Step 1 */}
        <div className="flex items-center gap-3 bg-[#FAF6EE] border border-[#e8dfcb]/40 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 1 ? 'clay-btn-dark text-[#FAF6EE]' : 'clay-btn-white text-[#5a6b5c]'}`}>
            1
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 1 ? 'text-[#c2703e]' : 'text-zinc-500'}`}>Registro</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3 bg-[#FAF6EE] border border-[#e8dfcb]/40 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 2 ? 'clay-btn-dark text-[#FAF6EE]' : 'clay-btn-white text-[#5a6b5c]'}`}>
            2
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 2 ? 'text-[#c2703e]' : 'text-zinc-500'}`}>Método de Pago</span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-3 bg-[#FAF6EE] border border-[#e8dfcb]/40 px-4 py-2 z-10 rounded-full shadow-sm">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${step === 3 ? 'clay-btn-dark text-[#FAF6EE]' : 'clay-btn-white text-[#5a6b5c]'}`}>
            3
          </div>
          <span className={`text-xs font-black tracking-wide ${step === 3 ? 'text-[#c2703e]' : 'text-zinc-500'}`}>Cierre</span>
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


      {/* MODAL CERRAR CAJA */}
      {showCerrarCaja && !cierreResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-black text-center text-[#4a2818] mb-2">Cierre de Turno</h2>
            <p className="text-sm text-center text-zinc-500 mb-6">Ingresa el total de efectivo que contaste en caja.</p>
            
            <form onSubmit={handleCerrarCaja} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Efectivo Contado ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={efectivoContado}
                  onChange={e => setEfectivoContado(e.target.value)}
                  className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3 text-lg font-bold text-[#4a2818]"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCerrarCaja(false)}
                  className="flex-1 py-3 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 btn-danger py-3 text-xs font-bold rounded-xl"
                >
                  Confirmar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESULTADO DE CIERRE */}
      {cierreResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-in text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-black text-[#4a2818] mb-2">Turno Cerrado</h2>
            
            <div className="space-y-2 mb-6 mt-4 text-left bg-[#FAF6EE] p-4 rounded-xl border border-[#e8dfcb]">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Esperado:</span>
                <span className="font-bold"></span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Contado:</span>
                <span className="font-bold"></span>
              </div>
              <div className="border-t border-[#e8dfcb] my-2 pt-2 flex justify-between text-sm font-black">
                <span className="text-zinc-600">Diferencia:</span>
                <span className={cierreResult.diferencia < 0 ? 'text-red-500' : (cierreResult.diferencia > 0 ? 'text-blue-500' : 'text-emerald-500')}>
                  {cierreResult.diferencia > 0 ? '+' : ''}
                </span>
              </div>
            </div>
            
            <button 
              onClick={finishCierre}
              className="w-full btn-primary py-3 text-sm font-bold rounded-xl"
            >
              Aceptar e Iniciar Nuevo Turno
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA BLOQUEADA: ABRIR CAJA */}
      {showAbrirCaja && !isFetchingCaja && (
        <div className="absolute inset-0 z-50 bg-[#FAF6EE] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl border border-[#e8dfcb]">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Unlock size={32} />
            </div>
            <h2 className="text-2xl font-black text-center text-[#4a2818] mb-2">Abrir Caja</h2>
            <p className="text-sm text-center text-zinc-500 mb-6">Ingresa el fondo inicial para comenzar a cobrar.</p>
            
            <form onSubmit={handleAbrirCaja} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Fondo Inicial ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={fondoInicial}
                  onChange={e => setFondoInicial(e.target.value)}
                  className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3 text-lg font-bold text-[#4a2818]"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full btn-primary py-4 text-sm font-black rounded-xl shadow-lg mt-2"
              >
                Abrir Turno
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- STEP 1: CAPTURA DE PRODUCTOS --- */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Captura (Lado Izquierdo) */}
          <div className="lg:col-span-5 clay-card-cream p-6 space-y-6 text-center rounded-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#4a2818]">Registro de Artículos</h3>
              <p className="text-xs text-zinc-500">Usa la cámara táctil o introduce el SKU/QR manualmente</p>
            </div>

            {/* Selector de cámara */}
            {showCamera ? (
              <div className="relative max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-[#c2703e]/50 shadow-lg">
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
                className="w-full max-w-xs mx-auto aspect-video clay-btn-white hover:bg-[#FAF6EE] rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group border border-[#e8dfcb]"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#c2703e]/10 text-[#c2703e] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Camera size={32} className="stroke-[2]" />
                </div>
                <span className="text-sm font-black text-[#4a2818] tracking-tight">Activar Cámara de la Tablet</span>
              </button>
            )}

            {/* Input manual con auto-focus continuo */}
            <div className="relative max-w-xs mx-auto space-y-3.5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c2703e]" size={18} />
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
                  className="w-full clay-input border border-[#e8dfcb] rounded-xl pl-11 pr-4 py-3.5 text-center font-mono text-xs text-[#4a2818] placeholder-zinc-400 focus:outline-none focus:border-[#c2703e]/50 focus:ring-2 focus:ring-[#c2703e]/15 transition-all"
                  placeholder="Escanea con pistola o escribe QR"
                  autoFocus
                />
              </div>
              <div className="flex justify-center items-center gap-1.5 text-[10px] text-[#5a6b5c] font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#5a6b5c] animate-pulse" />
                Escáner de pistola listo para capturar
              </div>
            </div>

            {/* Alerta de éxito de escaneo corta */}
            {result === 'success' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 inline-flex items-center gap-2 animate-scale-in text-xs text-[#5a6b5c] font-black shadow-sm">
                <CheckCircle2 size={16} className="text-[#5a6b5c] shrink-0" />
                ¡Artículo agregado!
              </div>
            )}
          </div>

          {/* Carrito de Compras (Lado Derecho) */}
          <div className={`lg:col-span-7 clay-card-cream overflow-hidden shadow-lg flex flex-col min-h-[400px] rounded-2xl transition-all duration-350 ${result === 'success' ? 'ring-2 ring-emerald-500/50 shadow-emerald-500/10' : ''}`}>
            <div className="px-5 py-4 border-b border-[#e8dfcb] bg-[#f4eedf]/40 flex justify-between items-center">
              <h3 className="text-sm font-black text-[#4a2818] flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#c2703e]" /> Carrito de Venta
              </h3>
              <span className="text-[10px] font-black uppercase bg-[#5a6b5c] text-white px-3.5 py-1.5 rounded-full shadow-sm">
                {totalArticulos} artículos
              </span>
            </div>

            {carrito.length === 0 ? (
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-center space-y-3 text-zinc-450">
                <ShoppingBag size={56} className="stroke-[1] opacity-40 text-[#c2703e]" />
                <p className="text-sm font-bold text-[#4a2818]">El carrito está vacío</p>
                <p className="text-xs max-w-xs text-zinc-550">Usa el escáner para comenzar a agregar muebles al cobro de esta sucursal.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Listado de items */}
                <div className="divide-y divide-[#e8dfcb]/60 max-h-[350px] overflow-y-auto p-4 space-y-3">
                  {carrito.map((item) => (
                    <div key={item.productoId} className="flex justify-between items-center py-3.5 bg-white/65 px-4 rounded-2xl border border-[#e8dfcb]/50 shadow-sm transition-all duration-300 hover:shadow-md">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[#4a2818]">{item.nombre}</p>
                        <p className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">SKU: {item.sku}</p>
                      </div>
                      
                      {/* Controles táctiles gigantes */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex items-center bg-[#FAF6EE] border border-[#e8dfcb] rounded-2xl p-1 shadow-inner">
                          <button 
                            onClick={() => handleDecreaseQty(item.productoId)}
                            className="w-12 h-12 rounded-xl clay-btn-white hover:bg-white text-[#4a2818] flex items-center justify-center text-xl font-bold active:scale-90 transition-transform border border-[#e8dfcb]"
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-sm font-black text-[#4a2818]">{item.cantidad}</span>
                          <button 
                            onClick={() => handleIncreaseQty(item.productoId)}
                            className="w-12 h-12 rounded-xl clay-btn-white hover:bg-white text-[#4a2818] flex items-center justify-center text-xl font-bold active:scale-90 transition-transform border border-[#e8dfcb]"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right w-24">
                          <p className="text-sm font-black text-[#c2703e]">${(item.precio * item.qrs.length).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-zinc-500">${item.precio.toLocaleString('es-MX')} c/u</p>
                        </div>

                        <button 
                          onClick={() => handleRemoveProduct(item.productoId)}
                          className="text-zinc-400 hover:text-red-500 p-2.5 active:scale-90 transition-transform hover:bg-red-50 rounded-xl"
                          title="Eliminar de la lista"
                        >
                          <X size={20} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal y botón de avanzar */}
                <div className="p-5 border-t border-[#e8dfcb] bg-[#f4eedf]/40 flex justify-between items-center rounded-b-2xl">
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-0.5 uppercase font-bold tracking-wider">Total a cobrar:</span>
                    <span className="text-2xl font-black text-[#c2703e]">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button 
                    onClick={() => setStep(2)}
                    className="py-3.5 px-7 shadow-lg shadow-[#c2703e]/15 text-xs font-black flex items-center gap-2 bg-[#c2703e] hover:bg-[#c2703e]/90 text-white rounded-xl active:scale-[0.97] transition-all"
                  >
                    Proceder al Pago <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- STEP 2: METODO DE PAGO --- */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Resumen del Cobro (Lado Izquierdo) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Total a pagar gigante */}
            <div className="clay-card-cream p-6 text-center space-y-2 rounded-2xl">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total a Cobrar</span>
              <p className="text-4xl font-black text-[#c2703e] tracking-tight">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <span className="text-xs bg-[#FAF6EE] border border-[#e8dfcb] text-[#4a2818] px-4 py-1.5 rounded-full inline-block font-mono font-bold shadow-sm">
                {totalArticulos} artículos a liquidar
              </span>
            </div>

            {/* Selector de método de pago */}
            <div className="clay-card-cream p-5 space-y-4 rounded-2xl">
              <h3 className="text-xs font-black text-[#4a2818] uppercase tracking-wider">Selecciona Método de Pago</h3>
              <div className="space-y-3">
                {/* Efectivo */}
                <button
                  onClick={() => { setMetodoPago('efectivo'); handleNumpadClear(); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'efectivo' ? 'bg-emerald-50 border-emerald-500/40 text-[#5a6b5c] shadow-sm ring-1 ring-emerald-500/20' : 'bg-white border-[#e8dfcb] hover:border-zinc-400 text-[#4a2818]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'efectivo' ? 'bg-emerald-500/15 text-[#5a6b5c]' : 'bg-[#FAF6EE] text-zinc-500'}`}>
                      <Wallet size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Efectivo</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'efectivo' ? 'text-[#5a6b5c]' : 'text-zinc-400'} />
                </button>

                {/* Tarjeta */}
                <button
                  onClick={() => { setMetodoPago('tarjeta'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'tarjeta' ? 'bg-blue-50 border-blue-500/40 text-blue-700 shadow-sm ring-1 ring-blue-500/20' : 'bg-white border-[#e8dfcb] hover:border-zinc-400 text-[#4a2818]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'tarjeta' ? 'bg-blue-500/15 text-blue-600' : 'bg-[#FAF6EE] text-zinc-500'}`}>
                      <CreditCard size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Tarjeta de Crédito / Débito</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'tarjeta' ? 'text-blue-600' : 'text-zinc-400'} />
                </button>

                {/* Transferencia */}
                <button
                  onClick={() => { setMetodoPago('transferencia'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'transferencia' ? 'bg-purple-50 border-purple-500/40 text-purple-700 shadow-sm ring-1 ring-purple-500/20' : 'bg-white border-[#e8dfcb] hover:border-zinc-400 text-[#4a2818]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${metodoPago === 'transferencia' ? 'bg-purple-500/15 text-purple-600' : 'bg-[#FAF6EE] text-zinc-500'}`}>
                      <Landmark size={20} className="stroke-[2]" />
                    </div>
                    <span className="text-sm font-black">Transferencia Interbancaria</span>
                  </div>
                  <ChevronRight size={18} className={metodoPago === 'transferencia' ? 'text-purple-600' : 'text-zinc-400'} />
                </button>
              </div>
            </div>
          </div>

          {/* Panel Numérico o Instrucciones (Lado Derecho) */}
          <div className="lg:col-span-7 clay-card-cream p-6 shadow-xl min-h-[380px] flex flex-col justify-between rounded-2xl">
            {metodoPago === null ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3 p-6 text-zinc-500">
                <Wallet size={56} className="stroke-[1] opacity-40 text-[#c2703e]" />
                <p className="text-sm font-bold text-[#4a2818]">Esperando selección de pago</p>
                <p className="text-xs max-w-xs text-zinc-555">Selecciona a la izquierda cómo liquidará la cuenta el cliente en el mostrador.</p>
              </div>
            ) : metodoPago === 'efectivo' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  {/* Cifras de cobro */}
                  <div className="space-y-4 bg-white/75 p-5 rounded-2xl border border-[#e8dfcb]/60 shadow-sm">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block">Total a Cobrar</span>
                      <span className="text-xl font-black text-[#4a2818]">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block">Monto Recibido</span>
                      <span className="text-2xl font-black text-[#c2703e]">${numMontoRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-[#e8dfcb] pt-3">
                      {numMontoRecibido >= totalPagar ? (
                        <div>
                          <span className="text-[10px] text-[#5a6b5c] uppercase font-black tracking-wider block">Cambio a Entregar</span>
                          <span className="text-3xl font-black text-[#5a6b5c]">${cambioEntregar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-red-500 uppercase font-black tracking-wider block">Falta por Cobrar</span>
                          <span className="text-3xl font-black text-red-500">${faltaCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teclado Billetes Rápidos */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-[#4a2818] uppercase font-black tracking-wider block">Billetes Rápidos (MXN)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {/* $50 - Rosa */}
                      <button 
                        onClick={() => handleQuickCash(50)} 
                        className="py-3 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $50.00
                      </button>
                      {/* $100 - Rojo */}
                      <button 
                        onClick={() => handleQuickCash(100)} 
                        className="py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $100.00
                      </button>
                      {/* $200 - Verde */}
                      <button 
                        onClick={() => handleQuickCash(200)} 
                        className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#5a6b5c] font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $200.00
                      </button>
                      {/* $500 - Azul */}
                      <button 
                        onClick={() => handleQuickCash(500)} 
                        className="py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $500.00
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* $1000 - Morado */}
                      <button 
                        onClick={() => handleQuickCash(1000)} 
                        className="py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-600 font-black text-sm active:scale-95 transition-all shadow-sm"
                      >
                        $1,000.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(totalPagar)} 
                        className="py-3 px-4 rounded-xl bg-[#c2703e]/10 hover:bg-[#c2703e]/20 border border-[#c2703e]/30 text-[#c2703e] font-black text-sm active:scale-95 transition-all shadow-sm"
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
                        className="py-4 bg-white hover:bg-zinc-50 border border-[#e8dfcb] rounded-xl font-black text-base text-[#4a2818] active:scale-95 transition-all shadow-sm clay-btn-white"
                      >
                        {val}
                      </button>
                    ))}
                    <button 
                      onClick={() => handleNumpadPress('.')}
                      className="py-4 bg-white hover:bg-zinc-50 border border-[#e8dfcb] rounded-xl font-black text-base text-[#4a2818] active:scale-95 transition-all shadow-sm clay-btn-white"
                    >
                      .
                    </button>
                    <button 
                      onClick={() => handleNumpadPress('0')}
                      className="py-4 bg-white hover:bg-zinc-50 border border-[#e8dfcb] rounded-xl font-black text-base text-[#4a2818] active:scale-95 transition-all shadow-sm clay-btn-white"
                    >
                      0
                    </button>
                    <button 
                      onClick={handleNumpadDelete}
                      className="py-4 bg-white hover:bg-red-50 border border-[#e8dfcb] rounded-xl font-black text-base text-red-500 active:scale-95 transition-all shadow-sm clay-btn-white"
                    >
                      ⌫
                    </button>
                  </div>
                  <button 
                    onClick={handleNumpadClear}
                    className="w-full mt-3 py-2.5 border border-[#e8dfcb] text-[11px] text-[#4a2818]/60 hover:text-[#4a2818] font-black uppercase tracking-wider rounded-xl active:scale-95 transition-all bg-white shadow-inner"
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
                  <h4 className="text-sm font-black text-[#4a2818] uppercase tracking-wider">Instrucción para Cajero</h4>
                  <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                    {metodoPago === 'tarjeta' 
                      ? `Inserta la tarjeta del cliente en la Terminal Bancaria y procesa la transacción física por $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`
                      : `Verifica que se haya recibido la transferencia bancaria SPEI por la cantidad de $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en el portal bancario.`
                    }
                  </p>
                </div>
                <div className="bg-[#FAF6EE] px-4 py-2 border border-[#e8dfcb] rounded-xl text-[10px] text-[#5a6b5c] font-black uppercase tracking-wider shadow-sm">
                  Pago Autorizado Externamente
                </div>
              </div>
            )}

            {/* Acciones de Flujo Inferior */}
            <div className="border-t border-[#e8dfcb] pt-4 mt-6 flex justify-between gap-4">
              <button 
                onClick={() => setStep(1)}
                className="px-5 py-3.5 rounded-xl border border-[#e8dfcb] hover:bg-[#FAF6EE] text-[#4a2818] font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm bg-white"
              >
                <ArrowLeft size={16} /> Volver a Artículos
              </button>
              
              <button 
                onClick={handleCobrar}
                disabled={!canConfirmPayment}
                className={`flex-1 py-3.5 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${canConfirmPayment ? 'bg-[#5a6b5c] text-white hover:bg-[#5a6b5c]/90 shadow-[#5a6b5c]/10' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'}`}
              >
                Cobrar y Generar Ticket <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: COMPLETADO Y TICKET --- */}
      {step === 3 && ultimaVenta && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
          
          {/* Banner animado de éxito */}
          <div className="clay-card-cream p-6 border border-emerald-500/20 bg-emerald-50/45 space-y-3 rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-emerald-500/10 text-[#5a6b5c] rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <CheckCircle2 size={36} className="stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#5a6b5c]">¡Venta Procesada con Éxito!</h3>
              <p className="text-xs text-zinc-550">El inventario físico ha sido actualizado. Ticket generado.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left">
            
            {/* Previsualización del Ticket (Lado Izquierdo) */}
            <div className="bg-white text-zinc-950 border border-zinc-200 rounded-2xl shadow-xl p-5 flex flex-col font-mono text-[10px] space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-200 flex overflow-hidden">
                {/* Efecto borde dentado del ticket */}
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
                <div className="flex justify-between"><span>Ticket #:</span><span className="font-bold">#{ultimaVenta.id.toString().slice(-6)}</span></div>
                <div className="flex justify-between"><span>Cajero:</span><span>Caja Central</span></div>
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
                      <td className="py-1 font-bold">1</td>
                      <td className="py-1 truncate max-w-[120px]">{item.producto_nombre}</td>
                      <td className="py-1 text-right">${item.precio_unitario.toLocaleString('es-MX')}</td>
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
                  <Mail size={16} className="text-[#c2703e]" /> Enviar Ticket Digital
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
                      className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3 text-xs text-[#4a2818] focus:outline-none focus:border-[#c2703e]/40"
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
                  className="w-full py-4 rounded-xl shadow-lg shadow-[#c2703e]/15 text-xs font-black flex justify-center items-center gap-2 active:scale-98 transition-all bg-[#c2703e] hover:bg-[#c2703e]/90 text-white"
                >
                  Iniciar Nueva Venta <ChevronRight size={16} />
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
