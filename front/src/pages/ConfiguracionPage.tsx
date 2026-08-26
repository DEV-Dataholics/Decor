import { useState, useMemo } from 'react';
import { 
  Settings, Store, Users, Paintbrush, RotateCcw, Plus, Edit2, Trash2, 
  X, Check, BookOpen, Search, ArrowRight, CheckCircle2, Printer, 
  Layers, Hammer, Truck, Wallet, ShoppingCart, BarChart2, Info, 
  AlertTriangle, ChevronRight, Sparkles, PackagePlus, ShieldCheck, FileText
} from 'lucide-react';
import { useDecor } from '../store/StoreContext';

type ActiveTab = 'manuales' | 'acabados' | 'tiendas' | 'clientes' | 'sistema';

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { key: 'manuales', label: 'Manual del ERP', icon: <BookOpen size={14} /> },
  { key: 'acabados', label: 'Acabados', icon: <Paintbrush size={14} /> },
  { key: 'tiendas', label: 'Tiendas', icon: <Store size={14} /> },
  { key: 'clientes', label: 'Clientes', icon: <Users size={14} /> },
  { key: 'sistema', label: 'Sistema', icon: <Settings size={14} /> },
];

export default function ConfiguracionPage() {
  const { 
    acabados, addAcabado, updateAcabado, deleteAcabado,
    tiendas, addTienda, updateTienda, deleteTienda,
    clientes, addCliente, updateCliente, deleteCliente,
    productos, materiaPrima, resetDemo
  } = useDecor();
  
  const [tab, setTab] = useState<ActiveTab>('manuales');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [generando, setGenerando] = useState(false);

  // Form states
  const [acabadoName, setAcabadoName] = useState('');
  const [tiendaForm, setTiendaForm] = useState({ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true });
  const [clienteForm, setClienteForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', ciudad: '', limite_credito: 0, saldo_pendiente: 0, tipo: 'Mayorista', credito_activo: true });

  // Estados para el Manual del ERP
  const [manualSeleccionadoId, setManualSeleccionadoId] = useState<string>('inventario-manual');
  const [busquedaManual, setBusquedaManual] = useState<string>('');
  const [filtroRol, setFiltroRol] = useState<string>('Todos');
  const [checklistEstado, setChecklistEstado] = useState<Record<string, boolean>>({});

  const toggleChecklist = (id: string) => {
    setChecklistEstado(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const MANUALES_ERP = [
    {
      id: 'inventario-manual',
      codigo: 'MAN-001',
      titulo: 'Captura Manual y Entrada Inicial de Inventario en Tienda',
      modulo: 'Inventario Tienda',
      rol: 'Almacén / Tienda',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icono: <PackagePlus size={18} className="text-[#0d9488]" />,
      resumen: 'Procedimiento para registrar existencias físicas que ya se encuentran en piso de venta, compras directas a terceros o artesanías locales sin pasar por órdenes de taller.',
      objetivo: 'Alimentar y sincronizar el inventario disponible de cada sucursal en la base de datos MySQL con costo, precio sugerido y origen del stock.',
      diagrama: ['Recepción Física en Tienda', 'Modal de Captura Manual', 'Búsqueda por SKU / Catálogo', 'Definición de Origen & Cantidad', 'Ajuste Atómico en MySQL'],
      pasos: [
        {
          paso: 1,
          titulo: 'Ingresar al módulo de Inventario',
          ruta: 'Menú lateral > Inventario',
          descripcion: 'Accede a la vista de inventario. Verifica que la sucursal seleccionada en el selector superior sea la tienda correcta donde se encuentra la mercancía.',
          tips: 'Puedes verificar las existencias actuales de cada SKU antes de realizar cualquier ajuste.'
        },
        {
          paso: 2,
          titulo: 'Abrir el asistente de captura táctil',
          ruta: 'Botón superior "+ Entrada Manual / Conteo"',
          descripcion: 'Haz clic en el botón de captura manual. Se desplegará el modal interactivo de entrada o conteo físico de mercancía.',
          tips: 'Este modal está optimizado para su uso tanto en computadoras de escritorio como en tablets táctiles de mostrador.'
        },
        {
          paso: 3,
          titulo: 'Buscar y seleccionar el artículo',
          ruta: 'Buscador en vivo del modal',
          descripcion: 'Escribe el código SKU (ej. DCR-0001) o parte del nombre del mueble (ej. FANCY TIN NIGHTSTAND). El catálogo autocompletará las dimensiones y precios base.',
          tips: 'Si el artículo es nuevo y no existe en catálogo, puede darse de alta con el botón "+ Nuevo Producto" en el módulo de Catálogo.'
        },
        {
          paso: 4,
          titulo: 'Especificar tipo de movimiento, cantidad y precio',
          ruta: 'Formulario de Ajuste',
          descripcion: 'Selecciona: "Entrada de Mercancía" (suma stock) o "Conteo Físico / Cuadre" (reemplaza stock absoluto). Ingresa el número de piezas y confirma el precio de venta.',
          tips: 'El sistema calcula en tiempo real: "Stock actual: X piezas -> Proyección con entrada: X + N piezas".'
        },
        {
          paso: 5,
          titulo: 'Confirmar y guardar en base de datos',
          ruta: 'Botón "Aplicar Entrada de Inventario"',
          descripcion: 'Guarda el movimiento. El sistema invoca el endpoint seguro /api/inventario/ajuste_manual.php e incrementa de forma atómica la existencia en inventario_tienda.',
          tips: 'La tabla principal de inventario se refrescará al instante reflejando la nueva disponibilidad lista para cobrarse en el Punto de Venta.'
        }
      ],
      puntosClave: [
        'No requiere crear órdenes de trabajo en taller.',
        'Permite manejar mercancía externa, artesanías y piezas únicas de exhibición.',
        'Mantiene la trazabilidad del costo unitario y origen del stock para cálculo de márgenes.'
      ],
      advertencias: [
        'Verifica siempre haber seleccionado la tienda/sucursal correcta antes de aplicar el ajuste.',
        'Los ajustes por conteo físico reemplazan el stock total; las entradas suman piezas.'
      ]
    },
    {
      id: 'produccion-logistica',
      codigo: 'MAN-002',
      titulo: 'Fabricación Kanban en Taller y Despacho Logístico',
      modulo: 'Producción & Logística',
      rol: 'Taller & Producción',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icono: <Hammer size={18} className="text-[#0d9488]" />,
      resumen: 'Flujo completo para procesar pedidos mayoristas o especiales: corte, ensamble de carpintería por destajo, acabados, generación de QR individual y entrega a tienda.',
      objetivo: 'Controlar los tiempos de fabricación, liquidar la mano de obra a carpinteros y trasladar muebles terminados con trazabilidad QR.',
      diagrama: ['Pedido en Pedidos', 'Kanban: Pendiente', 'En Taller (Carpintero)', 'Acabados & Barniz', 'Listo Envíos (QR Único)', 'Lote Transporte', 'Recepción en Tienda'],
      pasos: [
        {
          paso: 1,
          titulo: 'Generación de la orden de producción',
          ruta: 'Módulo Pedidos > Nueva Orden',
          descripcion: 'Al registrarse un pedido de catálogo o un mueble sobre diseño, el sistema crea automáticamente las tarjetas de trabajo (Work Orders) en estado Pendiente.',
          tips: 'Si es sobre diseño, se adjuntan medidas de ancho, alto, fondo y diagrama técnico.'
        },
        {
          paso: 2,
          titulo: 'Asignación de carpintero y destajo',
          ruta: 'Módulo Producción (Tablero Kanban)',
          descripcion: 'Arrastra la tarjeta a "En Taller". Selecciona al maestro carpintero asignado y define la tarifa de mano de obra pactada por pieza.',
          tips: 'El costo de mano de obra se acumula para la nómina del carpintero en el módulo de Personal.'
        },
        {
          paso: 3,
          titulo: 'Fase de lijado y aplicación de acabados',
          ruta: 'Kanban > Columna "Acabados"',
          descripcion: 'Mueve la pieza a la columna Acabados. Asigna al pintor/barnizador y selecciona el tono requerido (ej. Nogal Clásico, Santa Fe, Parota o Natural).',
          tips: 'El tiempo transcurrido en acabados se monitorea para evitar cuellos de botella en el secado.'
        },
        {
          paso: 4,
          titulo: 'Terminación y generación de etiqueta QR',
          ruta: 'Kanban > "Listo Envíos"',
          descripcion: 'Al completar el mueble, arrastra la tarjeta a "Listo Envíos". El sistema genera un código QR unitario con la fecha, modelo y folio.',
          tips: 'Pulsar el botón "Imprimir Etiquetas" para adherir el comprobante físico al mueble.'
        },
        {
          paso: 5,
          titulo: 'Creación del lote de embarque y despacho',
          ruta: 'Módulo Embarques > Nuevo Embarque',
          descripcion: 'Arma el manifiesto de carga seleccionando las piezas listas, asigna transportista, placas del vehículo y la sucursal de destino.',
          tips: 'El estado del lote pasa a "En Tránsito".'
        },
        {
          paso: 6,
          titulo: 'Recepción y alta en piso de venta',
          ruta: 'Módulo Reparto / Recepción',
          descripcion: 'El encargado de la tienda receptora escanea los QRs físicos o confirma la recepción marcando el estado como "OK".',
          tips: 'Las piezas recibidas se ingresan en automático a inventario_tienda con estatus Disponible.'
        }
      ],
      puntosClave: [
        'Control estricto de destajo y tiempos de entrega.',
        'Trazabilidad unitaria por QR desde el taller hasta la sala de exhibición.',
        'Reporte de incidencias si una pieza sufre daños en el transporte.'
      ],
      advertencias: [
        'No mover a "Listo Envíos" si el mueble no ha completado el control de calidad.',
        'Revisar que la tienda de destino coincida con la sucursal que solicitó el pedido.'
      ]
    },
    {
      id: 'caja-arqueo',
      codigo: 'MAN-003',
      titulo: 'Control de Turnos de Caja y Arqueo (Corte Z)',
      modulo: 'Punto de Venta (POS)',
      rol: 'Cajero / POS',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icono: <Wallet size={18} className="text-[#0d9488]" />,
      resumen: 'Apertura de turno, custodia del fondo inicial, registro en tiempo real de ingresos en efectivo, conteo físico de cajón y emisión de comprobante térmico.',
      objetivo: 'Garantizar el cuadre exacto del dinero en efectivo, detectar faltantes o sobrantes y cerrar formalmente el turno del cajero.',
      diagrama: ['Apertura con Fondo', 'Ventas del Turno (+)', 'Badge Efectivo en Vivo', 'Modal de Arqueo', 'Cálculo de Discrepancia', 'Cierre en BD + Ticket 80mm'],
      pasos: [
        {
          paso: 1,
          titulo: 'Verificar la caja activa al iniciar turno',
          ruta: 'Menú lateral > Punto de Venta',
          descripcion: 'En la barra superior del POS, comprueba que la caja esté identificada con su badge "Caja Activa" y el monto de fondo inicial.',
          tips: 'El fondo inicial se custodia en la tabla cajas_tienda en MySQL.'
        },
        {
          paso: 2,
          titulo: 'Monitorear el efectivo esperado',
          ruta: 'Barra superior del POS',
          descripcion: 'A medida que se cobran ventas en mostrador con método "Efectivo", el indicador "Efectivo en Cajón" suma el dinero en tiempo real.',
          tips: 'Los cobros con tarjeta TPV o transferencia SPEI no suman a este cajón de efectivo.'
        },
        {
          paso: 3,
          titulo: 'Iniciar el proceso de Corte Z al terminar turno',
          ruta: 'Botón "Corte Z / Cerrar Caja"',
          descripcion: 'Haz clic en el botón de corte en la esquina superior derecha. Se desplegará el modal seguro de arqueo.',
          tips: 'Asegúrate de haber procesado todas las ventas pendientes del turno antes de iniciar el corte.'
        },
        {
          paso: 4,
          titulo: 'Capturar el conteo físico de billetes y monedas',
          ruta: 'Campo "Efectivo Físico Contado ($)"',
          descripcion: 'Cuenta todo el dinero en efectivo del cajón físico y captura el importe total.',
          tips: 'El sistema calcula en vivo: "Cuadre Exacto ($0.00)", "Sobrante en Caja (+$X.XX)" o "Faltante en Caja (-$X.XX)".'
        },
        {
          paso: 5,
          titulo: 'Confirmar el cierre e imprimir ticket térmico',
          ruta: 'Botón "Confirmar y Cerrar Caja"',
          descripcion: 'Al confirmar, el sistema guarda el arqueo en la tabla cajas_tienda y abre la ventana para imprimir el ticket de 80mm.',
          tips: 'El ticket contiene fondo inicial, saldo esperado, saldo contado, discrepancia y espacio para firma.'
        }
      ],
      puntosClave: [
        'Cálculo automatizado de discrepancias sin margen de error manual.',
        'Comprobante térmico listo para firma y entrega a gerencia.',
        'Bloqueo de nuevas ventas en esa caja hasta abrir un nuevo turno.'
      ],
      advertencias: [
        'En caso de faltante, notificar de inmediato al encargado de sucursal antes de firmar el comprobante.',
        'No mezclar el fondo inicial de cambio con el dinero retirado para resguardo.'
      ]
    },
    {
      id: 'dashboard-finanzas',
      codigo: 'MAN-004',
      titulo: 'Dashboard Financiero, Nómina por Destajo y Ventas',
      modulo: 'Dirección & Finanzas',
      rol: 'Gerencia & Finanzas',
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
      icono: <BarChart2 size={18} className="text-[#0d9488]" />,
      resumen: 'Monitoreo de ingresos reales en sucursales, cálculo de nómina por mano de obra acumulada, rentabilidad y exportación de reportes ejecutivos.',
      objetivo: 'Proveer visibilidad en tiempo real del desempeño comercial y operativo del negocio para toma de decisiones estratégicas.',
      diagrama: ['Filtro Fecha & Tienda', 'Micro KPIs en Vivo', 'Desglose Métodos de Pago', 'Margen y Rentabilidad', 'Historial Transaccional', 'Exportar PDF / Imprimir'],
      pasos: [
        {
          paso: 1,
          titulo: 'Configurar rango de fechas y sucursal',
          ruta: 'Módulo Dashboard > Reporte de Ventas',
          descripcion: 'Establece la fecha de inicio y fin. En el selector de sucursal, elige una tienda particular o "Todas las Sucursales".',
          tips: 'El dashboard recalcula al instante todos los gráficos y métricas transaccionales.'
        },
        {
          paso: 2,
          titulo: 'Analizar los Micro-KPIs de ventas',
          ruta: 'Tarjetas superiores del reporte',
          descripcion: 'Examina: 1) Monto Total Vendido ($), 2) Número de Transacciones (Tickets), 3) Ticket Promedio ($) y 4) Total de Piezas Físicas Vendidas.',
          tips: 'Estas cifras provienen directamente de las tablas ventas_tienda y pagos_venta en MySQL.'
        },
        {
          paso: 3,
          titulo: 'Evaluar el desglose por método de pago',
          ruta: 'Tarjetas de Efectivo, Tarjeta TPV y Transferencia',
          descripcion: 'Verifica la distribución de ingresos: cuánto dinero físico ingresó a cajones de sucursal y cuánto se acreditó vía terminal bancaria o transferencias SPEI.',
          tips: 'Permite auditar el efectivo acumulado contra los cortes de caja Z de cada tienda.'
        },
        {
          paso: 4,
          titulo: 'Consultar la nómina por destajo de taller',
          ruta: 'Sección superior: Nómina y Productividad',
          descripcion: 'Revisa el total acumulado de mano de obra y acabados devengado por los artesanos en la semana según las órdenes terminadas.',
          tips: 'Facilita la dispersión de pagos semanales a los trabajadores de taller.'
        }
      ],
      puntosClave: [
        'Cero datos ficticios; todo se alimenta de transacciones reales en MySQL.',
        'Márgenes de ganancia calculados restando costos de mano de obra y producción.',
        'Capacidad de auditoría y reimpresión de comprobantes en cualquier momento.'
      ],
      advertencias: [
        'Los rangos de fecha muy amplios pueden tomar unos instantes en calcular si el volumen de ventas es masivo.',
        'Validar periódicamente que los costos base de catálogo estén actualizados para no distorsionar los márgenes.'
      ]
    }
  ];

  // Filtrado de manuales
  const manualesFiltrados = useMemo(() => {
    return MANUALES_ERP.filter(m => {
      const matchTexto = busquedaManual.trim() === '' || 
        m.titulo.toLowerCase().includes(busquedaManual.toLowerCase()) ||
        m.resumen.toLowerCase().includes(busquedaManual.toLowerCase()) ||
        m.modulo.toLowerCase().includes(busquedaManual.toLowerCase()) ||
        m.codigo.toLowerCase().includes(busquedaManual.toLowerCase()) ||
        m.pasos.some(p => p.titulo.toLowerCase().includes(busquedaManual.toLowerCase()) || p.descripcion.toLowerCase().includes(busquedaManual.toLowerCase()));
      
      const matchRol = filtroRol === 'Todos' || m.rol.toLowerCase().includes(filtroRol.toLowerCase());
      return matchTexto && matchRol;
    });
  }, [busquedaManual, filtroRol]);

  const manualActivo = useMemo(() => {
    return MANUALES_ERP.find(m => m.id === manualSeleccionadoId) || MANUALES_ERP[0];
  }, [manualSeleccionadoId]);

  const imprimirManualActual = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>${manualActivo.codigo} - ${manualActivo.titulo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #222; line-height: 1.5; font-size: 13px; }
            .header { border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 25px; }
            .company { font-size: 18px; font-weight: bold; color: #0d9488; }
            .doc-title { font-size: 22px; font-weight: bold; margin: 8px 0 4px 0; color: #111; }
            .meta { font-size: 11px; color: #666; display: flex; gap: 20px; }
            .meta span { font-weight: bold; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #0d9488; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px; }
            .diagram-box { background: #f9f9f9; border: 1px solid #e5e5e5; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; font-weight: bold; }
            .step-card { border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 15px; margin-bottom: 12px; page-break-inside: avoid; }
            .step-header { font-size: 13px; font-weight: bold; margin-bottom: 4px; color: #333; }
            .step-route { font-size: 11px; color: #0d9488; font-weight: bold; margin-bottom: 6px; }
            .step-desc { font-size: 12px; color: #444; }
            .step-tip { background: #f0fdfa; border-left: 3px solid #0d9488; padding: 6px 10px; margin-top: 8px; font-size: 11px; color: #134e4a; }
            ul { margin: 6px 0 0 20px; padding: 0; }
            li { margin-bottom: 4px; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 10px; border-radius: 4px; font-size: 11px; color: #991b1b; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">DECOR MUEBLERÍA — MANUAL OPERATIVO DEL ERP</div>
            <div class="doc-title">${manualActivo.codigo}: ${manualActivo.titulo}</div>
            <div class="meta">
              <div>Módulo: <span>${manualActivo.modulo}</span></div>
              <div>Rol Responsable: <span>${manualActivo.rol}</span></div>
              <div>Fecha de Emisión: <span>${new Date().toLocaleDateString('es-MX')}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">1. Objetivo y Resumen Operativo</div>
            <p><strong>Objetivo:</strong> ${manualActivo.objetivo}</p>
            <p>${manualActivo.resumen}</p>
          </div>
          <div class="section">
            <div class="section-title">2. Flujo del Proceso</div>
            <div class="diagram-box">${manualActivo.diagrama.join(' ➔ ')}</div>
          </div>
          <div class="section">
            <div class="section-title">3. Guía Paso a Paso</div>
            ${manualActivo.pasos.map(p => `
              <div class="step-card">
                <div class="step-header">Paso ${p.paso}: ${p.titulo}</div>
                <div class="step-route">📍 Ubicación: ${p.ruta}</div>
                <div class="step-desc">${p.descripcion}</div>
                ${p.tips ? `<div class="step-tip">💡 <strong>Consejo Práctico:</strong> ${p.tips}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <div class="section">
            <div class="section-title">4. Puntos Clave de Control</div>
            <ul>${manualActivo.puntosClave.map(k => `<li>${k}</li>`).join('')}</ul>
          </div>
          ${manualActivo.advertencias && manualActivo.advertencias.length > 0 ? `
            <div class="section">
              <div class="section-title">5. Precauciones y Advertencias</div>
              <div class="alert-box"><ul>${manualActivo.advertencias.map(a => `<li>${a}</li>`).join('')}</ul></div>
            </div>
          ` : ''}
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAcabadoName('');
    setTiendaForm({ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true });
    setClienteForm({ nombre: '', email: '', telefono: '', direccion: '', ciudad: '', limite_credito: 0, saldo_pendiente: 0, tipo: 'Mayorista', credito_activo: true });
  };

  return (
    <div className="space-y-5 text-left">
      {/* Selector de Pestañas */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 bg-white border border-stone-200 p-2 rounded-2xl shadow-sm">
        {TABS.map(t => (
          <button 
            key={t.key} 
            onClick={() => { setTab(t.key); cancelEdit(); }} 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              tab === t.key 
                ? 'bg-[#0d9488] text-white shadow-xs' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'manuales' && (
        <div className="space-y-5">
          {/* Header del Manual con Buscador y Filtro por Rol */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                  <BookOpen size={20} className="text-[#0d9488]" />
                  Manual Operativo y Flujos del ERP
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Guías interactivas paso a paso, diagramas de proceso y checklists de operación para taller, logística, almacén y mostrador.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={busquedaManual}
                    onChange={e => setBusquedaManual(e.target.value)}
                    placeholder="Buscar manual, paso o SKU..."
                    className="bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-7 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488] w-56 font-bold"
                  />
                  {busquedaManual && (
                    <button onClick={() => setBusquedaManual('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={filtroRol}
                  onChange={e => setFiltroRol(e.target.value)}
                  className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="Todos">Todos los Roles</option>
                  <option value="Almacén">Almacén / Tienda</option>
                  <option value="Taller">Taller & Producción</option>
                  <option value="Cajero">Cajero / POS</option>
                  <option value="Gerencia">Gerencia & Finanzas</option>
                </select>

                <button
                  onClick={imprimirManualActual}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                  title="Imprimir guía del manual actual para capacitación física"
                >
                  <Printer size={13} /> Imprimir Manual
                </button>
              </div>
            </div>

            {/* Selector de Manuales en Tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {manualesFiltrados.map(m => (
                <div
                  key={m.id}
                  onClick={() => setManualSeleccionadoId(m.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    manualSeleccionadoId === m.id
                      ? 'bg-teal-50/70 border-teal-400 shadow-sm ring-1 ring-teal-300'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300 hover:bg-stone-100/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-stone-500">{m.codigo}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                        {m.rol}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-white border border-stone-200 shrink-0">
                        {m.icono}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-stone-900 leading-tight">{m.titulo}</h4>
                        <p className="text-[10px] text-stone-500 line-clamp-2 mt-1 leading-normal">{m.resumen}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-[10px]">
                    <span className="text-stone-500 font-medium">{m.pasos.length} pasos</span>
                    <span className={`font-bold flex items-center gap-1 ${manualSeleccionadoId === m.id ? 'text-teal-800' : 'text-stone-600'}`}>
                      Ver guía <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle del Manual Seleccionado */}
          {manualActivo && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6 shadow-sm animate-fade-in">
              {/* Encabezado del Manual Activo */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-stone-100">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-800 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200">
                      {manualActivo.codigo}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${manualActivo.badgeColor}`}>
                      {manualActivo.rol}
                    </span>
                    <span className="text-xs text-stone-500 font-bold">Módulo: {manualActivo.modulo}</span>
                  </div>
                  <h2 className="text-lg font-black text-stone-900">{manualActivo.titulo}</h2>
                  <p className="text-xs text-stone-600 leading-relaxed max-w-3xl font-medium">{manualActivo.resumen}</p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-1 shrink-0 md:max-w-xs">
                  <p className="text-[10px] uppercase font-black text-[#0d9488] flex items-center gap-1">
                    <Sparkles size={12} /> Objetivo Operativo
                  </p>
                  <p className="text-stone-700 text-xs leading-relaxed font-medium">{manualActivo.objetivo}</p>
                </div>
              </div>

              {/* Diagrama de Flujo Visual */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                <h4 className="text-[10px] uppercase font-black text-stone-600 tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers size={13} className="text-[#0d9488]" /> Flujo Conceptual del Proceso
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {manualActivo.diagrama.map((nodo, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="px-3.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-black text-stone-900 shadow-xs flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-teal-50 text-teal-800 text-[10px] flex items-center justify-center font-black border border-teal-200">
                          {index + 1}
                        </span>
                        {nodo}
                      </div>
                      {index < manualActivo.diagrama.length - 1 && (
                        <ArrowRight size={14} className="text-stone-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Pasos Interactivos con Checklist */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    Instrucciones Paso a Paso (Checklist de Ejecución)
                  </h4>
                  <span className="text-xs text-stone-500 font-bold">
                    {Object.values(checklistEstado).filter(Boolean).length} de {manualActivo.pasos.length} pasos completados
                  </span>
                </div>

                <div className="space-y-3">
                  {manualActivo.pasos.map(p => {
                    const checkKey = `${manualActivo.id}-paso-${p.paso}`;
                    const isChecked = Boolean(checklistEstado[checkKey]);

                    return (
                      <div
                        key={p.paso}
                        className={`p-4 rounded-2xl border transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/60 border-emerald-300' 
                            : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            onClick={() => toggleChecklist(checkKey)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white font-bold'
                                : 'border-stone-300 bg-white text-transparent hover:border-stone-500'
                            }`}
                          >
                            <Check size={14} />
                          </button>

                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h5 className={`text-xs font-black ${isChecked ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                                Paso {p.paso}: {p.titulo}
                              </h5>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-stone-200 text-teal-800 font-bold self-start sm:self-auto">
                                📍 {p.ruta}
                              </span>
                            </div>

                            <p className={`text-xs leading-relaxed font-medium ${isChecked ? 'text-stone-400' : 'text-stone-600'}`}>
                              {p.descripcion}
                            </p>

                            {p.tips && (
                              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 font-medium">
                                <Info size={14} className="text-[#0d9488] shrink-0 mt-0.5" />
                                <span><strong>Consejo Práctico:</strong> {p.tips}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Puntos Clave y Advertencias */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} /> Puntos Clave de Control
                  </h4>
                  <ul className="space-y-1.5 text-xs text-stone-700 font-medium">
                    {manualActivo.puntosClave.map((punto, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-teal-600 font-black">•</span>
                        <span>{punto}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {manualActivo.advertencias && manualActivo.advertencias.length > 0 && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-2">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={15} /> Precauciones y Advertencias
                    </h4>
                    <ul className="space-y-1.5 text-xs text-rose-900 font-medium">
                      {manualActivo.advertencias.map((adv, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-600 font-black">!</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'acabados' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Paintbrush size={18} className="text-[#0d9488]" /> Tonos y Acabados de Madera
            </h3>
            {editingId !== 'new' && (
              <button onClick={() => setEditingId('new')} className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Plus size={14} /> Nuevo Acabado
              </button>
            )}
          </div>
          
          {editingId === 'new' && (
            <div className="flex gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 animate-fade-in">
              <input 
                autoFocus 
                value={acabadoName} 
                onChange={e => setAcabadoName(e.target.value)} 
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]" 
                placeholder="Nombre del nuevo tono o acabado..." 
                onKeyDown={e => { if (e.key === 'Enter') { addAcabado(acabadoName); cancelEdit(); } }} 
              />
              <button onClick={() => { addAcabado(acabadoName); cancelEdit(); }} className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2 rounded-xl font-bold text-xs" disabled={!acabadoName.trim()}><Check size={16} /></button>
              <button onClick={cancelEdit} className="bg-stone-200 text-stone-700 px-3 py-2 rounded-xl font-bold text-xs"><X size={16} /></button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {acabados.map((a, i) => (
              <div key={i} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex justify-between items-center group shadow-xs">
                {editingId === `edit-${a}` ? (
                  <input 
                    autoFocus 
                    value={acabadoName} 
                    onChange={e => setAcabadoName(e.target.value)} 
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-teal-800" 
                    onBlur={() => { if (acabadoName.trim() && acabadoName !== a) updateAcabado(a, acabadoName); cancelEdit(); }} 
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} 
                  />
                ) : (
                  <>
                    <span className="text-xs font-bold text-stone-900">{a}</span>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button onClick={() => { setEditingId(`edit-${a}`); setAcabadoName(a); }} className="p-1 text-stone-500 hover:text-teal-700"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar acabado ${a}?`)) deleteAcabado(a); }} className="p-1 text-stone-400 hover:text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tiendas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {editingId !== 'new' && (
              <button onClick={() => setEditingId('new')} className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                <Plus size={16} /> Nueva Sucursal
              </button>
            )}
          </div>

          {(editingId === 'new' || typeof editingId === 'number') && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-sm animate-fade-in">
              <h4 className="text-sm font-black text-stone-900">{editingId === 'new' ? 'Nueva Sucursal' : 'Editar Sucursal'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Nombre</label><input value={tiendaForm.nombre} onChange={e => setTiendaForm(p => ({ ...p, nombre: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Ciudad</label><input value={tiendaForm.ciudad} onChange={e => setTiendaForm(p => ({ ...p, ciudad: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Dirección</label><input value={tiendaForm.direccion} onChange={e => setTiendaForm(p => ({ ...p, direccion: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={tiendaForm.activa} onChange={e => setTiendaForm(p => ({ ...p, activa: e.target.checked }))} className="accent-[#0d9488] w-4 h-4" />
                  <label className="text-xs font-bold text-stone-800">Sucursal Operativa</label>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={cancelEdit} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold">Cancelar</button>
                <button onClick={() => {
                  if (editingId === 'new') addTienda(tiendaForm);
                  else updateTienda(editingId as number, tiendaForm);
                  cancelEdit();
                }} className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold" disabled={!tiendaForm.nombre.trim()}>Guardar Sucursal</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiendas.map(t => (
              <div key={t.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 relative group shadow-sm hover:shadow-md transition-all">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => { setEditingId(t.id); setTiendaForm(t); }} className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg"><Edit2 size={14} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${t.nombre}?`)) deleteTienda(t.id); }} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"><Trash2 size={14} /></button>
                </div>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center"><Store size={24} /></div>
                <h3 className="text-sm font-black text-stone-900 text-center">{t.nombre}</h3>
                <p className="text-xs text-stone-600 text-center font-bold">{t.ciudad}</p>
                <p className="text-[11px] text-stone-500 text-center line-clamp-1" title={t.direccion}>{t.direccion}</p>
                <div className="text-center mt-2">
                  <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full border ${t.activa ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                    {t.activa ? 'Operativa' : 'Cerrada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><Users size={18} className="text-[#0d9488]" /> Clientes Mayoristas</h3>
            {editingId !== 'new' && (
              <button onClick={() => setEditingId('new')} className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                <Plus size={16} /> Nuevo Cliente
              </button>
            )}
          </div>

          {(editingId === 'new' || typeof editingId === 'number') && (
            <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-4 shadow-sm animate-fade-in">
              <h4 className="text-sm font-black text-stone-900">{editingId === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Nombre</label><input value={clienteForm.nombre} onChange={e => setClienteForm(p => ({ ...p, nombre: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Email</label><input type="email" value={clienteForm.email} onChange={e => setClienteForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Teléfono</label><input value={clienteForm.telefono} onChange={e => setClienteForm(p => ({ ...p, telefono: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Ciudad</label><input value={clienteForm.ciudad} onChange={e => setClienteForm(p => ({ ...p, ciudad: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Dirección</label><input value={clienteForm.direccion} onChange={e => setClienteForm(p => ({ ...p, direccion: e.target.value }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold" /></div>
                <div><label className="text-[10px] font-bold text-stone-600 uppercase mb-1 block">Límite Crédito ($)</label><input type="number" value={clienteForm.limite_credito || ''} onChange={e => setClienteForm(p => ({ ...p, limite_credito: Number(e.target.value) }))} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono" /></div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={cancelEdit} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold">Cancelar</button>
                <button onClick={() => {
                  if (editingId === 'new') addCliente(clienteForm);
                  else updateCliente(editingId as number, clienteForm);
                  cancelEdit();
                }} className="px-5 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold" disabled={!clienteForm.nombre.trim()}>Guardar Cliente</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-100">
              {clientes.map(c => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-3.5 hover:bg-stone-50/80 transition-colors group">
                  <div className="flex items-center gap-3.5 flex-1">
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center text-sm font-black">{c.nombre.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900">{c.nombre}</p>
                      <p className="text-[10px] text-stone-500">{c.email} · {c.telefono} · {c.ciudad}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-stone-800">Límite: ${c.limite_credito.toLocaleString('es-MX')}</p>
                      <p className="text-[10px] text-teal-700 font-bold">Pendiente: ${c.saldo_pendiente.toLocaleString('es-MX')}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => { setEditingId(c.id); setClienteForm(c); }} className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar cliente ${c.nombre}?`)) deleteCliente(c.id); }} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {clientes.length === 0 && <p className="text-center text-xs text-stone-400 py-10">No hay clientes registrados.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'sistema' && (
        <div className="space-y-4 max-w-md">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-sm">
            <h3 className="text-sm font-black text-stone-900">Información del Sistema</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100"><span className="text-stone-500 font-medium">Versión</span><span className="text-stone-900 font-mono font-bold">v1.0.0 — Producción</span></div>
              <div className="flex justify-between py-1.5 border-b border-stone-100"><span className="text-stone-500 font-medium">Modo Base de Datos</span><span className="text-teal-800 font-bold">MySQL Relacional (Laragon)</span></div>
              <div className="flex justify-between py-1.5 border-b border-stone-100"><span className="text-stone-500 font-medium">Productos en Catálogo</span><span className="text-stone-900 font-bold">{productos.length}</span></div>
              <div className="flex justify-between py-1.5"><span className="text-stone-500 font-medium">Materias Primas</span><span className="text-stone-900 font-bold">{materiaPrima.length} tipos</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
