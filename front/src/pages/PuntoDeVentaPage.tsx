import { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, CheckCircle2, XCircle, Search, Camera, X, 
  ArrowLeft, CreditCard, Wallet, Landmark, RefreshCw, 
  Mail, ChevronRight, Store, ArrowRight, Printer 
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useDecor } from '../store/StoreContext';
import type { Venta } from '../store/useStore';

interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  sku: string;
  qrs: string[]; // Lista de códigos QR escaneados/generados para este item
}

export default function PuntoDeVentaPage() {
  const { registrarVentaCarrito, tiendas, embarques, terminados, inventario, productos } = useDecor();
  
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

    // Validar y agregar al carrito
    if (productoEncontrado && isStoreValid) {
      // Verificar stock disponible
      const inv = inventario.find(i => i.tienda_id === tiendaId && i.producto_id === prodId);
      const cantidadEnCarrito = carrito.find(i => i.productoId === prodId)?.qrs.length || 0;
      const stockDisponible = inv ? inv.cantidad_disponible : 0;

      if (stockDisponible > cantidadEnCarrito) {
        // Agregar al carrito
        setCarrito(prev => {
          const idx = prev.findIndex(item => item.productoId === prodId);
          if (idx > -1) {
            // Ya existe en el carrito, añadir el QR a la lista
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              qrs: [...updated[idx].qrs, trimmed]
            };
            return updated;
          } else {
            // Es un artículo nuevo en el carrito
            return [...prev, {
              productoId: prodId,
              nombre: productoEncontrado!.nombre,
              precio: productoEncontrado!.precio,
              sku: productoEncontrado!.sku,
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
        : 'Código QR no encontrado en el catálogo o sistema.'
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
    if (stockDisponible > item.qrs.length) {
      // Generamos un QR de reposición temporal al vuelo para la pieza adicional
      const nuevoQr = `DCR-REC-${tiendaId}-${productoId}-${Date.now()}-${item.qrs.length}`;
      setCarrito(prev => prev.map(c => 
        c.productoId === productoId 
          ? { ...c, qrs: [...c.qrs, nuevoQr] } 
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
        updatedQrs.pop(); // Remover el último código QR
        return { ...c, qrs: updatedQrs };
      }
      return c;
    }).filter(c => c.qrs.length > 0)); // Eliminar del carrito si llega a 0
  };

  const handleRemoveProduct = (productoId: number) => {
    setCarrito(prev => prev.filter(c => c.productoId !== productoId));
  };

  // Calcular totales
  const totalArticulos = carrito.reduce((sum, item) => sum + item.qrs.length, 0);
  const totalPagar = carrito.reduce((sum, item) => sum + (item.precio * item.qrs.length), 0);

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

  const handleCobrar = () => {
    if (tiendaId === null || carrito.length === 0 || !canConfirmPayment) return;

    const allQrs = carrito.flatMap(c => c.qrs);
    const venta = registrarVentaCarrito(tiendaId, allQrs);
    if (venta) {
      setUltimaVenta(venta);
      setStep(3); // Avanzar a pantalla de éxito/ticket
      setEmailEnviado(false);
      setEmailCliente('');
    } else {
      triggerError('Ocurrió un error al registrar la venta en la base de datos.');
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
        <div className="glass-card p-8 text-center space-y-6 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Store size={44} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Configuración de Caja</h2>
            <p className="text-xs text-zinc-400">Selecciona la sucursal física en la que opera esta tablet</p>
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Sucursal</label>
              <select 
                defaultValue="" 
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) {
                    setTiendaId(id);
                    localStorage.setItem('decor_pos_tienda_id', id.toString());
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                <option value="" disabled className="text-zinc-600">-- Selecciona una sucursal --</option>
                {tiendasActivas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.ciudad})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-zinc-600 border-t border-zinc-800/60 pt-4">
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
      <div className="flex flex-col sm:flex-row justify-between items-center bg-zinc-900/40 border border-zinc-850 px-4 py-2.5 rounded-xl gap-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Caja Activa:</span>
          <span className="text-xs font-semibold text-zinc-100">{sucursalActiva?.nombre} ({sucursalActiva?.ciudad})</span>
        </div>
        <button 
          onClick={() => {
            if (confirm('¿Seguro que deseas cambiar de sucursal? Se limpiará el carrito de la venta actual.')) {
              localStorage.removeItem('decor_pos_tienda_id');
              setTiendaId(null);
              setCarrito([]);
              setStep(1);
            }
          }}
          className="text-[10px] text-zinc-500 hover:text-amber-400 font-bold transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-850"
        >
          <RefreshCw size={10} /> Cambiar Sucursal
        </button>
      </div>

      {/* STEPPER SUPERIOR DEL WIZARD */}
      <div className="glass-card py-4 px-6 md:px-12 flex justify-between items-center relative border border-zinc-800/40">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 z-0 hidden sm:block" />
        
        {/* Step 1 */}
        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-1 z-10 rounded-full sm:rounded-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= 1 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
            1
          </div>
          <span className={`text-xs font-black tracking-wide hidden md:inline ${step === 1 ? 'text-amber-400' : 'text-zinc-500'}`}>Registro</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-1 z-10 rounded-full sm:rounded-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= 2 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
            2
          </div>
          <span className={`text-xs font-black tracking-wide hidden md:inline ${step === 2 ? 'text-amber-400' : 'text-zinc-500'}`}>Método de Pago</span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-3 bg-zinc-950 px-4 py-1 z-10 rounded-full sm:rounded-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= 3 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
            3
          </div>
          <span className={`text-xs font-black tracking-wide hidden md:inline ${step === 3 ? 'text-amber-400' : 'text-zinc-500'}`}>Cierre</span>
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {result === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-scale-in flex items-center gap-3 shadow-lg shadow-red-500/5">
          <XCircle size={22} className="text-red-400 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-bold text-red-300">Error en Operación</p>
            <p className="text-[10px] text-red-400">{errorMessage || 'QR no encontrado o producto agotado.'}</p>
          </div>
        </div>
      )}

      {/* --- STEP 1: CAPTURA DE PRODUCTOS --- */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Captura (Lado Izquierdo) */}
          <div className="lg:col-span-5 glass-card p-6 space-y-6 text-center border-amber-500/5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-200">Registro de Artículos</h3>
              <p className="text-[10px] text-zinc-500">Usa la cámara táctil o introduce el SKU/QR manualmente</p>
            </div>

            {/* Selector de cámara */}
            {showCamera ? (
              <div className="relative max-w-sm mx-auto overflow-hidden rounded-xl border-2 border-amber-500/50 shadow-2xl">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) handleScan(result[0].rawValue);
                  }}
                  onError={(error) => console.error(error?.message)}
                />
                <button onClick={() => setShowCamera(false)} className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/90 rounded-full text-white backdrop-blur-md transition-colors">
                  <X size={18} />
                </button>
                <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white bg-black/60 p-1.5 backdrop-blur-md tracking-wide uppercase font-bold">
                  Escaneando código QR
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCamera(true)} className="w-full max-w-xs mx-auto aspect-video bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 transition-all group shadow-inner">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-115 transition-transform shadow-inner">
                  <Camera size={26} />
                </div>
                <span className="text-xs font-bold text-zinc-300">Activar Cámara de la Tablet</span>
              </button>
            )}

            {/* Input manual con auto-focus continuo */}
            <div className="relative max-w-xs mx-auto space-y-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-center font-mono text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-colors shadow-inner"
                  placeholder="Escanea con pistola o escribe QR"
                  autoFocus
                />
              </div>
              <div className="flex justify-center items-center gap-1.5 text-[9px] text-zinc-550 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Escáner de pistola listo para capturar
              </div>
            </div>

            {/* Alerta de éxito de escaneo corta */}
            {result === 'success' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 inline-flex items-center gap-2 animate-scale-in text-[10px] text-emerald-400 font-bold">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ¡Artículo agregado!
              </div>
            )}
          </div>

          {/* Carrito de Compras (Lado Derecho) */}
          <div className="lg:col-span-7 glass-card overflow-hidden border-zinc-800/40 shadow-xl flex flex-col min-h-[400px]">
            <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/40 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber-400" /> Carrito de Venta
              </h3>
              <span className="text-[10px] font-black uppercase bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                {totalArticulos} artículos
              </span>
            </div>

            {carrito.length === 0 ? (
              <div className="flex-1 p-10 flex flex-col items-center justify-center text-center space-y-3 text-zinc-550">
                <ShoppingBag size={48} className="stroke-[1] opacity-40" />
                <p className="text-xs font-semibold">El carrito está vacío</p>
                <p className="text-[10px] max-w-xs">Usa el escáner para comenzar a agregar muebles al cobro de esta sucursal.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Listado de items */}
                <div className="divide-y divide-zinc-850 max-h-[350px] overflow-y-auto p-4 space-y-2.5">
                  {carrito.map((item, i) => (
                    <div key={item.productoId} className="flex justify-between items-center py-2.5 bg-zinc-900/20 px-3 rounded-xl border border-zinc-850/40">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-200">{item.nombre}</p>
                        <p className="text-[9px] font-bold font-mono text-zinc-550 uppercase tracking-wider">SKU: {item.sku}</p>
                      </div>
                      
                      {/* Controles táctiles gigantes */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                          <button 
                            onClick={() => handleDecreaseQty(item.productoId)}
                            className="w-10 h-10 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center text-lg active:scale-95 transition-transform"
                          >
                            -
                          </button>
                          <span className="w-10 text-center text-xs font-black text-zinc-100">{item.qrs.length}</span>
                          <button 
                            onClick={() => handleIncreaseQty(item.productoId)}
                            className="w-10 h-10 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center text-lg active:scale-95 transition-transform"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right w-24">
                          <p className="text-xs font-black text-amber-400">${(item.precio * item.qrs.length).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] text-zinc-500">${item.precio.toLocaleString('es-MX')} c/u</p>
                        </div>

                        <button 
                          onClick={() => handleRemoveProduct(item.productoId)}
                          className="text-zinc-650 hover:text-red-400 p-2 active:scale-90 transition-transform"
                          title="Eliminar de la lista"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal y botón de avanzar */}
                <div className="p-5 border-t border-zinc-850 bg-zinc-900/40 flex justify-between items-center rounded-b-2xl">
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1 uppercase font-bold tracking-wider">Total a cobrar:</span>
                    <span className="text-2xl font-black text-amber-400">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button 
                    onClick={() => setStep(2)}
                    className="btn-primary py-3 px-6 shadow-xl shadow-amber-500/10 text-xs font-black flex items-center gap-2"
                  >
                    Proceder al Pago <ArrowRight size={14} />
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
            <div className="glass-card p-6 border-amber-500/5 text-center space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Total a Cobrar</span>
              <p className="text-4xl font-black text-amber-400 tracking-tight">${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              <span className="text-[10px] bg-zinc-900 text-zinc-550 px-3 py-1 rounded-full inline-block font-mono">
                {totalArticulos} artículos a liquidar
              </span>
            </div>

            {/* Selector de método de pago */}
            <div className="glass-card p-5 space-y-4 border-zinc-850">
              <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Selecciona Método de Pago</h3>
              <div className="space-y-3">
                {/* Efectivo */}
                <button
                  onClick={() => { setMetodoPago('efectivo'); handleNumpadClear(); }}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'efectivo' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${metodoPago === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Wallet size={18} />
                    </div>
                    <span className="text-xs font-black">Efectivo</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                {/* Tarjeta */}
                <button
                  onClick={() => { setMetodoPago('tarjeta'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'tarjeta' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${metodoPago === 'tarjeta' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      <CreditCard size={18} />
                    </div>
                    <span className="text-xs font-black">Tarjeta de Crédito / Débito</span>
                  </div>
                  <ChevronRight size={16} />
                </button>

                {/* Transferencia */}
                <button
                  onClick={() => { setMetodoPago('transferencia'); setMontoRecibido(totalPagar.toString()); }}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all active:scale-98 ${metodoPago === 'transferencia' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 text-zinc-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${metodoPago === 'transferencia' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Landmark size={18} />
                    </div>
                    <span className="text-xs font-black">Transferencia Interbancaria</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Panel Numérico o Instrucciones (Lado Derecho) */}
          <div className="lg:col-span-7 glass-card p-6 border-zinc-850 shadow-xl min-h-[380px] flex flex-col justify-between">
            {metodoPago === null ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center space-y-2 text-zinc-550">
                <Wallet size={48} className="stroke-[1] opacity-40 animate-pulse" />
                <p className="text-xs font-bold">Esperando selección de pago</p>
                <p className="text-[10px] max-w-xs">Selecciona a la izquierda cómo liquidará la cuenta el cliente en el mostrador.</p>
              </div>
            ) : metodoPago === 'efectivo' ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Cifras de cobro */}
                  <div className="space-y-4 bg-zinc-950/60 p-4 rounded-xl border border-zinc-850/60">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block">Total a Cobrar</span>
                      <span className="text-xl font-bold text-zinc-300">${totalPagar.toLocaleString('es-MX')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block">Monto Recibido</span>
                      <span className="text-2xl font-black text-zinc-100">${numMontoRecibido.toLocaleString('es-MX')}</span>
                    </div>
                    <div className="border-t border-zinc-800/60 pt-2.5">
                      {numMontoRecibido >= totalPagar ? (
                        <div>
                          <span className="text-[9px] text-emerald-500 uppercase font-black tracking-wider block">Cambio a Entregar</span>
                          <span className="text-2xl font-black text-emerald-400">${cambioEntregar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] text-red-500 uppercase font-black tracking-wider block">Falta por Cobrar</span>
                          <span className="text-2xl font-black text-red-400">${faltaCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Teclado Billetes Rápidos */}
                  <div className="space-y-3">
                    <span className="text-[9px] text-zinc-500 uppercase font-black tracking-wider block">Billetes Rápidos (MXN)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleQuickCash(50)} 
                        className="py-3 px-4 rounded-xl bg-pink-900/20 hover:bg-pink-950/30 border border-pink-900/30 text-pink-400 font-black text-xs active:scale-95 transition-transform"
                      >
                        $50.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(100)} 
                        className="py-3 px-4 rounded-xl bg-red-900/20 hover:bg-red-950/30 border border-red-900/30 text-red-400 font-black text-xs active:scale-95 transition-transform"
                      >
                        $100.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(200)} 
                        className="py-3 px-4 rounded-xl bg-emerald-900/20 hover:bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 font-black text-xs active:scale-95 transition-transform"
                      >
                        $200.00
                      </button>
                      <button 
                        onClick={() => handleQuickCash(500)} 
                        className="py-3 px-4 rounded-xl bg-blue-900/20 hover:bg-blue-950/30 border border-blue-900/30 text-blue-400 font-black text-xs active:scale-95 transition-transform"
                      >
                        $500.00
                      </button>
                    </div>
                    <button 
                      onClick={() => handleQuickCash(totalPagar)} 
                      className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs active:scale-95 transition-transform"
                    >
                      Paga Exacto (${totalPagar.toLocaleString('es-MX')})
                    </button>
                  </div>
                </div>

                {/* Teclado Numérico Numpad */}
                <div className="max-w-xs mx-auto">
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(val => (
                      <button 
                        key={val} 
                        onClick={() => handleNumpadPress(val)}
                        className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold text-sm text-zinc-200 active:scale-95 transition-all"
                      >
                        {val}
                      </button>
                    ))}
                    <button 
                      onClick={() => handleNumpadPress('.')}
                      className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold text-sm text-zinc-200 active:scale-95 transition-all"
                    >
                      .
                    </button>
                    <button 
                      onClick={() => handleNumpadPress('0')}
                      className="py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold text-sm text-zinc-200 active:scale-95 transition-all"
                    >
                      0
                    </button>
                    <button 
                      onClick={handleNumpadDelete}
                      className="py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl font-bold text-xs text-amber-500 active:scale-95 transition-all"
                    >
                      ⌫
                    </button>
                  </div>
                  <button 
                    onClick={handleNumpadClear}
                    className="w-full mt-2 py-2 border border-zinc-800 text-[10px] text-zinc-500 hover:text-zinc-300 font-bold rounded-xl active:scale-95 transition-all"
                  >
                    Limpiar Monto Recibido
                  </button>
                </div>
              </div>
            ) : (
              // Tarjeta o Transferencia
              <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 p-4">
                <div className={`p-4 rounded-full ${metodoPago === 'tarjeta' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                  {metodoPago === 'tarjeta' ? <CreditCard size={36} /> : <Landmark size={36} />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">Instrucción para Cajero</h4>
                  <p className="text-xs text-zinc-450 max-w-sm">
                    {metodoPago === 'tarjeta' 
                      ? `Inserta la tarjeta del cliente en la Terminal Bancaria y procesa la transacción física por $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`
                      : `Verifica que se haya recibido la transferencia bancaria SPEI por la cantidad de $${totalPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en el portal bancario.`
                    }
                  </p>
                </div>
                <div className="bg-zinc-950/40 px-4 py-2 border border-zinc-850 rounded-lg text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
                  Pago Autorizado Externamente
                </div>
              </div>
            )}

            {/* Acciones de Flujo Inferior */}
            <div className="border-t border-zinc-850 pt-4 mt-6 flex justify-between gap-4">
              <button 
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-xl border border-zinc-850 hover:bg-zinc-900 text-zinc-400 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowLeft size={14} /> Volver a Artículos
              </button>
              
              <button 
                onClick={handleCobrar}
                disabled={!canConfirmPayment}
                className={`flex-1 py-3 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all ${canConfirmPayment ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-emerald-500/10' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed shadow-none'}`}
              >
                Cobrar y Generar Ticket <CheckCircle2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: COMPLETADO Y TICKET --- */}
      {step === 3 && ultimaVenta && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
          
          {/* Banner animado de éxito */}
          <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-300">¡Venta Procesada con Éxito!</h3>
              <p className="text-[10px] text-emerald-400/80">El inventario físico ha sido actualizado. Ticket generado.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-left">
            
            {/* Previsualización del Ticket (Lado Izquierdo) */}
            <div className="glass-card p-5 bg-white text-zinc-950 border-none rounded-2xl shadow-xl flex flex-col font-mono text-[10px] space-y-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 flex overflow-hidden">
                {/* Efecto borde dentado del ticket */}
                {Array.from({ length: 25 }).map((_, idx) => (
                  <div key={idx} className="w-4 h-4 bg-zinc-950 -translate-y-2 rotate-45 shrink-0" />
                ))}
              </div>

              <div className="text-center pt-2">
                <h4 className="text-xs font-black uppercase">DECOR MUEBLERÍA</h4>
                <p className="font-bold text-[9px]">{sucursalActiva?.nombre}</p>
                <p className="text-[8px] text-zinc-550">{sucursalActiva?.direccion}</p>
                <p className="text-[8px] text-zinc-550">RFC: DEC-000101-AAA</p>
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
                <p className="text-zinc-650">Conserve este ticket para cualquier cambio.</p>
              </div>
            </div>

            {/* Acciones Finales (Lado Derecho) */}
            <div className="space-y-5">
              
              {/* Opción Email */}
              <div className="glass-card p-5 border-zinc-850 space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={14} className="text-amber-400" /> Enviar Ticket Digital
                </h4>
                
                {emailEnviado ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center space-y-2 animate-scale-in">
                    <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-emerald-300">¡Correo Enviado!</p>
                    <p className="text-[10px] text-emerald-450">El ticket de compra se envió a: <strong>{emailCliente}</strong></p>
                  </div>
                ) : (
                  <form onSubmit={handleSendEmail} className="space-y-3">
                    <input 
                      type="email"
                      required
                      value={emailCliente}
                      onChange={e => setEmailCliente(e.target.value)}
                      placeholder="correo@cliente.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500/40 text-zinc-100"
                    />
                    <button 
                      type="submit" 
                      disabled={enviandoEmail}
                      className="w-full btn-secondary py-2 text-xs font-bold flex justify-center items-center gap-2"
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
                  className="w-full btn-secondary py-3.5 rounded-xl border border-zinc-850 hover:bg-zinc-900 text-zinc-200 font-bold text-xs flex justify-center items-center gap-2 active:scale-98 transition-all"
                >
                  <Printer size={16} className="text-zinc-400" /> Imprimir Ticket Físico (80mm)
                </button>

                <button 
                  onClick={handleNewSale}
                  className="w-full btn-primary py-4 rounded-xl shadow-xl shadow-amber-500/10 text-xs font-black flex justify-center items-center gap-2 active:scale-98 transition-all"
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
