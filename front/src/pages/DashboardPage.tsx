import { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Hammer, PackageSearch, Truck, AlertTriangle, Package, 
  Timer, DollarSign, BarChart2, ShoppingBag, TrendingUp, Calendar, Store, 
  Printer, Receipt, Wallet, CreditCard, Landmark, Eye, X, CheckCircle2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useDecor } from '../store/StoreContext';
import type { VentaBackend } from '../store/useStore';

// Paleta Santa Fe para Gráficas
const PIE_COLORS = ['#0d9488', '#d97706', '#6366f1', '#10b981', '#f43f5e'];

export default function DashboardPage() {
  const { 
    workOrders, materiaPrima, terminados, embarques, empleados, 
    pedidos, productos, tiendas, ventasRealizadas, fetchVentas 
  } = useDecor();

  const totalCostoManoObra = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.costo_mano_obra || 0) + (wo.costo_acabado || 0), 0);
  }, [workOrders]);

  const nominaSemanaActual = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diff = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(diff);
    inicioSemana.setHours(0, 0, 0, 0);
    
    const inicioStr = inicioSemana.toISOString().split('T')[0];
    const finStr = new Date().toISOString().split('T')[0];

    return workOrders.reduce((sum, wo) => {
      if (wo.estatus === 'listo_embarque' && wo.fecha_termino && wo.fecha_termino >= inicioStr && wo.fecha_termino <= finStr) {
        return sum + (wo.costo_mano_obra || 0) + (wo.costo_acabado || 0);
      }
      return sum;
    }, 0);
  }, [workOrders]);

  // Cálculos de Margen y Rentabilidad Financiera
  const totalVentas = useMemo(() => {
    return pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
  }, [pedidos]);

  const totalCostoCatalogo = useMemo(() => {
    return pedidos.reduce((sum, p) => {
      return sum + p.items.reduce((itemSum, item) => {
        const prod = productos.find(pr => pr.id === item.producto_id);
        const cost = prod?.costo_produccion || 0;
        return itemSum + (cost * item.cantidad);
      }, 0);
    }, 0);
  }, [pedidos, productos]);

  const utilidadEstimada = useMemo(() => {
    return Math.max(0, totalVentas - totalCostoManoObra);
  }, [totalVentas, totalCostoManoObra]);

  const margenUtilidadPct = useMemo(() => {
    return totalVentas > 0 ? Math.round((utilidadEstimada / totalVentas) * 100) : 0;
  }, [utilidadEstimada, totalVentas]);

  const topProductosRentables = useMemo(() => {
    const productSales = new Map<number, { qty: number, revenue: number, name: string }>();
    pedidos.forEach(p => {
      p.items.forEach(item => {
        if (!productSales.has(item.producto_id)) {
          productSales.set(item.producto_id, { qty: 0, revenue: 0, name: item.producto_nombre });
        }
        const data = productSales.get(item.producto_id)!;
        data.qty += item.cantidad;
        data.revenue += item.subtotal;
      });
    });

    return Array.from(productSales.entries()).map(([prodId, sales]) => {
      const prod = productos.find(pr => pr.id === prodId);
      const costoUnitario = prod?.costo_produccion || 0;
      const totalCost = costoUnitario * sales.qty;
      const profit = sales.revenue - totalCost;
      return {
        id: prodId,
        name: sales.name.split(' ').slice(0, 2).join(' '),
        fullName: sales.name,
        'Ventas': sales.revenue,
        'Costos': totalCost,
        'Ganancia': profit
      };
    })
    .sort((a, b) => b['Ganancia'] - a['Ganancia'])
    .slice(0, 5);
  }, [pedidos, productos]);

  const [graficoMetrica, setGraficoMetrica] = useState<'productividad' | 'carga'>('productividad');

  // Filtros para el reporte de ventas por sucursal
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [tiendaFiltroId, setTiendaFiltroId] = useState<string | number>('todas');
  const [ventaDetalleModal, setVentaDetalleModal] = useState<VentaBackend | null>(null);

  useEffect(() => {
    fetchVentas({
      tienda_id: tiendaFiltroId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    });
  }, [tiendaFiltroId, fechaInicio, fechaFin, fetchVentas]);

  // Lógica del Reporte de Ventas con Datos Reales de BD
  const reporteVentas = useMemo(() => {
    const ventasFiltradas = ventasRealizadas;
    const totalVendido = ventasFiltradas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
    const totalTransacciones = ventasFiltradas.length;
    const ticketPromedio = totalTransacciones > 0 ? totalVendido / totalTransacciones : 0;
    
    let totalPiezasVendidas = 0;
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalTransferencia = 0;
    const productCounts = new Map<number, { qty: number, subtotal: number, name: string, sku: string }>();

    ventasFiltradas.forEach(v => {
      (v.pagos || []).forEach(p => {
        const m = Number(p.monto) || 0;
        if (p.metodo === 'efectivo') totalEfectivo += m;
        else if (p.metodo === 'tarjeta') totalTarjeta += m;
        else if (p.metodo === 'transferencia') totalTransferencia += m;
      });

      (v.items || []).forEach(item => {
        const qty = Number(item.cantidad) || 1;
        totalPiezasVendidas += qty;
        
        if (!productCounts.has(item.producto_id)) {
          productCounts.set(item.producto_id, {
            qty: 0,
            subtotal: 0,
            name: item.producto_nombre,
            sku: item.codigo_sku
          });
        }
        const prodData = productCounts.get(item.producto_id)!;
        prodData.qty += qty;
        prodData.subtotal += (Number(item.precio_unitario) * qty);
      });
    });

    const topProductosReporte = Array.from(productCounts.entries())
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      ventasFiltradas,
      totalVendido,
      totalTransacciones,
      ticketPromedio,
      totalPiezasVendidas,
      totalEfectivo,
      totalTarjeta,
      totalTransferencia,
      topProductosReporte
    };
  }, [ventasRealizadas]);

  const handlePrintReport = () => {
    const tiendaNombre = tiendaFiltroId === 'todas' 
      ? 'Todas las Sucursales' 
      : tiendas.find(t => t.id === Number(tiendaFiltroId))?.nombre || 'Sucursal';
      
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html>
        <head>
          <title>Reporte de Ventas - ${tiendaNombre}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1c1917; }
            h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #0d9488; }
            .filters { font-size: 12px; color: #57534e; margin-bottom: 20px; border-bottom: 1px solid #e7e5e4; padding-bottom: 10px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #e7e5e4; padding: 15px; border-radius: 12px; text-align: center; background: #fafaf9; }
            .kpi-label { font-size: 10px; text-transform: uppercase; color: #78716c; margin-bottom: 5px; font-weight: bold; }
            .kpi-val { font-size: 18px; font-weight: 900; color: #0d9488; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e7e5e4; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f4; font-weight: bold; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Reporte de Ventas por Sucursal - Decor Mueblería</h1>
          <div class="filters">
            <strong>Sucursal:</strong> ${tiendaNombre}<br/>
            <strong>Período:</strong> ${fechaInicio || 'Inicio'} al ${fechaFin || 'Fin'}<br/>
            <strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-MX')}
          </div>
          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Total Vendido</div>
              <div class="kpi-val">$${Math.round(reporteVentas.totalVendido).toLocaleString('es-MX')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Transacciones</div>
              <div class="kpi-val">${reporteVentas.totalTransacciones}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Ticket Promedio</div>
              <div class="kpi-val">$${Math.round(reporteVentas.ticketPromedio).toLocaleString('es-MX')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Piezas Vendidas</div>
              <div class="kpi-val">${reporteVentas.totalPiezasVendidas}</div>
            </div>
          </div>
          
          <h2>Top Productos más Vendidos</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th class="right">Cantidad</th>
                <th class="right">Ingresos Totales</th>
              </tr>
            </thead>
            <tbody>
              ${reporteVentas.topProductosReporte.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.sku}</td>
                  <td class="right">${item.qty}</td>
                  <td class="right">$${Math.round(item.subtotal).toLocaleString('es-MX')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const chartData = useMemo(() => {
    return empleados
      .filter(emp => emp.activo)
      .map(emp => {
        const piezasActivas = workOrders.reduce((sum, wo) => {
          const isCarpenterActive = wo.empleado_id === emp.id && (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion');
          const isFinisherActive = wo.empleado_acabado_id === emp.id && wo.estatus === 'acabados';
          if (isCarpenterActive || isFinisherActive) return sum + wo.cantidad;
          return sum;
        }, 0);

        const piezasTerminadas = workOrders.reduce((sum, wo) => {
          if ((wo.empleado_id === emp.id || wo.empleado_acabado_id === emp.id) && wo.estatus === 'listo_embarque') {
            return sum + wo.cantidad;
          }
          return sum;
        }, 0);

        const rechazosEnTaller = workOrders.reduce((sum, wo) => {
          if (wo.empleado_id === emp.id || wo.empleado_acabado_id === emp.id) {
            return sum + (wo.rechazos || 0);
          }
          return sum;
        }, 0);

        let rechazosEnEntrega = 0;
        embarques.forEach(emb => {
          emb.items.forEach(item => {
            if (item.estado_recepcion === 'dañado' || item.estado_recepcion === 'danado') {
              const parts = item.qr_code.split('-');
              if (parts[0] === 'DCR' && parts.length >= 3) {
                const woId = Number(parts[2]);
                const wo = workOrders.find(w => w.id === woId);
                if (wo && (wo.empleado_id === emp.id || wo.empleado_acabado_id === emp.id)) {
                  rechazosEnEntrega += 1;
                }
              }
            }
          });
        });

        const rechazos = rechazosEnTaller + rechazosEnEntrega;

        return {
          nombre: emp.nombre.split(' ')[0] + ' ' + (emp.nombre.split(' ')[1] ? emp.nombre.split(' ')[1][0] + '.' : ''),
          nombreCompleto: emp.nombre,
          rol: emp.rol,
          'Piezas Asignadas': piezasActivas,
          'Piezas Terminadas': piezasTerminadas,
          'Rechazos': rechazos,
        };
      });
  }, [empleados, workOrders, embarques]);

  const filteredChartData = useMemo(() => {
    if (graficoMetrica === 'carga') {
      return chartData
        .filter(d => d['Piezas Asignadas'] > 0)
        .sort((a, b) => b['Piezas Asignadas'] - a['Piezas Asignadas']);
    } else {
      return chartData
        .filter(d => d['Piezas Terminadas'] > 0 || d['Rechazos'] > 0)
        .sort((a, b) => b['Piezas Terminadas'] - a['Piezas Terminadas']);
    }
  }, [chartData, graficoMetrica]);

  const orderStats = useMemo(() => ({
    pendientes: workOrders.filter(wo => wo.estatus === 'pendiente').length,
    en_produccion: workOrders.filter(wo => wo.estatus === 'en_produccion').length,
    acabados: workOrders.filter(wo => wo.estatus === 'acabados').length,
    listos: workOrders.filter(wo => wo.estatus === 'listo_embarque').length,
    total: workOrders.length,
  }), [workOrders]);

  const ordenesNuevas = useMemo(() => {
    const groups = new Map<number, typeof workOrders>();
    workOrders.forEach(wo => {
      if (!groups.has(wo.orden_id)) groups.set(wo.orden_id, []);
      groups.get(wo.orden_id)!.push(wo);
    });
    
    return Array.from(groups.values()).filter(items => items.every(wo => wo.estatus === 'pendiente'));
  }, [workOrders]);

  const mpCritica = useMemo(() =>
    materiaPrima.filter(mp => mp.cantidad <= mp.minimo), [materiaPrima]);

  const terminadosStats = useMemo(() => {
    const total = terminados.length;
    const valor = terminados.reduce((s, t) => s + t.precio_estimado, 0);
    const costo = terminados.reduce((s, t) => {
      const prod = productos.find(p => p.id === t.producto_id);
      return s + (prod?.costo_produccion || 0);
    }, 0);
    const hoy = new Date();
    const antiguos = terminados.filter(t => {
      const dias = Math.floor((hoy.getTime() - new Date(t.fecha_listo).getTime()) / 86400000);
      return dias > 7;
    }).length;
    return { total, valor, costo, antiguos };
  }, [terminados, productos]);

  const embarquesActivos = useMemo(() => {
    return embarques.filter(e => e.estatus !== 'entregado');
  }, [embarques]);

  const pieData = useMemo(() => [
    { name: 'Pendientes', value: orderStats.pendientes },
    { name: 'En Producción', value: orderStats.en_produccion },
    { name: 'Acabados', value: orderStats.acabados },
    { name: 'Listos', value: orderStats.listos },
  ].filter(d => d.value > 0), [orderStats]);

  const kpis = [
    { label: 'Órdenes Activas', value: orderStats.total, sub: `${orderStats.pendientes} pendientes · ${orderStats.en_produccion} en taller`, icon: <ClipboardList size={20} />, iconColor: 'text-[#0d9488]', bgIcon: 'bg-teal-50 border border-teal-200' },
    { label: 'Mano de Obra Taller', value: `$${totalCostoManoObra.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `$${nominaSemanaActual.toLocaleString('es-MX', { maximumFractionDigits: 0 })} esta semana`, icon: <DollarSign size={20} />, iconColor: 'text-[#0d9488]', bgIcon: 'bg-teal-50 border border-teal-200' },
    { label: 'Utilidad Bruta Est.', value: `$${utilidadEstimada.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `${margenUtilidadPct}% margen s/pedidos`, icon: <TrendingUp size={20} />, iconColor: 'text-emerald-700', bgIcon: 'bg-emerald-50 border border-emerald-200' },
    { label: 'Materia Prima Crítica', value: mpCritica.length, sub: mpCritica.length > 0 ? mpCritica.map(m => m.nombre).join(', ') : 'Inventario óptimo', icon: <AlertTriangle size={20} />, iconColor: mpCritica.length > 0 ? 'text-rose-700' : 'text-emerald-700', bgIcon: mpCritica.length > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200' },
    { label: 'Terminados en Espera', value: terminadosStats.total, sub: `Venta: $${Math.round(terminadosStats.valor).toLocaleString('es-MX')}`, icon: <Package size={20} />, iconColor: terminadosStats.antiguos > 0 ? 'text-amber-700' : 'text-[#0d9488]', bgIcon: terminadosStats.antiguos > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-teal-50 border border-teal-200' },
    { label: 'Embarques en Ruta', value: embarquesActivos.length, sub: embarquesActivos.length > 0 ? `${embarquesActivos.length} en tránsito` : 'Sin envíos en curso', icon: <Truck size={20} />, iconColor: 'text-indigo-700', bgIcon: 'bg-indigo-50 border border-indigo-200' },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* KPIS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bgIcon} ${kpi.iconColor}`}>{kpi.icon}</div>
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 tracking-tight">{kpi.value}</p>
              <p className="text-[10px] font-medium text-stone-500 mt-0.5 truncate">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ALERTAS OPERATIVAS */}
      {ordenesNuevas.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <h3 className="text-xs font-black text-rose-900 uppercase tracking-wide">¡Nuevas Órdenes Asignadas para Fabricación!</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ordenesNuevas.map(items => {
              const fWo = items[0];
              return (
                <div key={fWo.orden_id} className="bg-white rounded-xl p-3 border border-rose-200 flex justify-between items-center shadow-xs">
                  <div>
                    <p className="text-xs font-black text-rose-900">Orden #{fWo.orden_id}</p>
                    <p className="text-[10px] text-stone-600 font-medium">{fWo.cliente_nombre}</p>
                  </div>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">{items.length} pzas</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mpCritica.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <h3 className="text-xs font-black text-rose-900">⚠ Materia Prima bajo nivel mínimo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {mpCritica.map(mp => (
              <div key={mp.id} className="bg-white rounded-xl p-2.5 border border-rose-200 shadow-xs">
                <p className="text-xs font-bold text-stone-900">{mp.nombre}</p>
                <p className="text-[10px] font-bold text-rose-700">{mp.cantidad} {mp.unidad} (mín: {mp.minimo})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN DE 3 COLUMNAS: ESTADOS / MATERIA PRIMA / TERMINADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Órdenes por Estado */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Hammer size={16} className="text-[#0d9488]" />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Órdenes por Estado</h3>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 12, color: '#1c1917', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-bold text-stone-700">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-stone-400 py-12">Sin órdenes activas</p>
          )}
        </div>

        {/* Materia Prima */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <PackageSearch size={16} className="text-[#0d9488]" />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Materia Prima en Taller</h3>
          </div>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {materiaPrima.map(mp => {
              const pct = Math.min(100, (mp.cantidad / (mp.minimo * 3)) * 100);
              const isCritical = mp.cantidad <= mp.minimo;
              return (
                <div key={mp.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: mp.color || '#0d9488' }} />
                      {mp.nombre}
                    </span>
                    <span className={`font-mono font-bold ${isCritical ? 'text-rose-700' : 'text-stone-600'}`}>{mp.cantidad} {mp.unidad}</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                    <div className={`h-full rounded-full transition-all ${isCritical ? 'bg-rose-500' : 'bg-[#0d9488]'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Listos para Embarcar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#0d9488]" />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Listos para Embarque</h3>
          </div>
          {terminados.length === 0 ? (
            <p className="text-center text-xs text-stone-400 py-12">Sin piezas pendientes de envío</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {Object.values(terminados.reduce((acc, t) => {
                const key = `${t.orden_id}`;
                if (!acc[key]) acc[key] = { orden_id: t.orden_id, cliente_nombre: t.cliente_nombre, count: 0, minDate: t.fecha_listo };
                acc[key].count += 1;
                if (new Date(t.fecha_listo) < new Date(acc[key].minDate)) acc[key].minDate = t.fecha_listo;
                return acc;
              }, {} as Record<string, any>))
              .sort((a: any, b: any) => new Date(a.minDate).getTime() - new Date(b.minDate).getTime())
              .slice(0, 10).map((t: any) => {
                const dias = Math.floor((Date.now() - new Date(t.minDate).getTime()) / 86400000);
                return (
                  <div key={`${t.orden_id}`} className="bg-stone-50 rounded-xl p-2.5 border border-stone-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-stone-900">Orden #{t.orden_id}</p>
                      <p className="text-[10px] text-stone-500 font-medium">{t.cliente_nombre} · {t.count} piezas listas</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${dias > 7 ? 'bg-rose-100 text-rose-800' : dias > 3 ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'}`}>
                      {dias}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICA DE CARGA Y PRODUCTIVIDAD */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-[#0d9488]" />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
              {graficoMetrica === 'productividad' ? 'Productividad Histórica por Carpintero' : 'Carga de Trabajo Activa en Taller'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setGraficoMetrica('productividad')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  graficoMetrica === 'productividad' ? 'bg-[#0d9488] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setGraficoMetrica('carga')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  graficoMetrica === 'carga' ? 'bg-[#0d9488] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                En Vivo (Carga)
              </button>
            </div>

            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg font-bold">
              {graficoMetrica === 'carga' 
                ? `${filteredChartData.reduce((sum, d) => sum + d['Piezas Asignadas'], 0)} piezas activas`
                : `${filteredChartData.reduce((sum, d) => sum + d['Piezas Terminadas'], 0)} piezas terminadas`}
            </span>
          </div>
        </div>

        {filteredChartData.length > 0 ? (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
                <XAxis type="number" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis dataKey="nombre" type="category" stroke="#78716c" fontSize={11} tickLine={false} width={110} />
                <Tooltip 
                  cursor={{ fill: '#fafaf9' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 12, color: '#1c1917', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value, name) => [`${value} piezas`, name]}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#57534e', fontWeight: 'bold' }} />
                {graficoMetrica === 'carga' ? (
                  <Bar dataKey="Piezas Asignadas" name="Piezas Asignadas (Carga)" fill="#d97706" radius={[0, 4, 4, 0]} barSize={14} />
                ) : (
                  <>
                    <Bar dataKey="Piezas Terminadas" name="Piezas Terminadas" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="Rechazos" name="Rechazos por Calidad" fill="#e11d48" radius={[0, 4, 4, 0]} barSize={12} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-xs text-stone-400 py-16">Sin datos registrados para esta métrica</p>
        )}
      </div>

      {/* RENTABILIDAD TOP PRODUCTOS */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-[#0d9488]" />
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">Márgenes y Rentabilidad de Modelos Clave</h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
            Ingresos vs. Costos
          </span>
        </div>

        {topProductosRentables.length > 0 ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductosRentables} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="name" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip 
                  cursor={{ fill: '#fafaf9' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 12, color: '#1c1917', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`]}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#57534e', fontWeight: 'bold' }} />
                <Bar dataKey="Ventas" name="Ingresos por Ventas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Costos" name="Costos de Fabricación" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ganancia" name="Utilidad Bruta" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-xs text-stone-400 py-16">Sin datos de ventas registrados</p>
        )}
      </div>

      {/* REPORTE DE VENTAS POR SUCURSAL */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-stone-200">
          <div>
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Store size={18} className="text-[#0d9488]" /> Reporte Transaccional de Ventas por Sucursal
            </h3>
            <p className="text-xs text-stone-500">Consulta ventas en tiempo real, desglose de métodos de pago e historial de tickets.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs">
              <Calendar size={14} className="text-stone-500" />
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={e => setFechaInicio(e.target.value)} 
                className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800"
              />
              <span className="text-stone-400">a</span>
              <input 
                type="date" 
                value={fechaFin} 
                onChange={e => setFechaFin(e.target.value)} 
                className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800"
              />
            </div>

            <select
              value={tiendaFiltroId}
              onChange={e => setTiendaFiltroId(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            >
              <option value="todas">Todas las Sucursales</option>
              {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>

            <button
              onClick={handlePrintReport}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Printer size={14} /> Exportar Reporte
            </button>
          </div>
        </div>

        {/* Micro KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Total Vendido</span>
            <span className="text-xl font-black text-teal-700">${reporteVentas.totalVendido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Tickets Emitidos</span>
            <span className="text-xl font-black text-stone-900">{reporteVentas.totalTransacciones}</span>
          </div>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Ticket Promedio</span>
            <span className="text-xl font-black text-amber-700">${reporteVentas.ticketPromedio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Piezas Despachadas</span>
            <span className="text-xl font-black text-indigo-700">{reporteVentas.totalPiezasVendidas}</span>
          </div>
        </div>

        {/* Desglose por Método de Pago */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800"><Wallet size={18} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-600">Efectivo en Caja</p>
                <p className="text-sm font-black text-emerald-900">${reporteVentas.totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-800">
              {reporteVentas.totalVendido > 0 ? `${Math.round((reporteVentas.totalEfectivo / reporteVentas.totalVendido) * 100)}%` : '0%'}
            </span>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-800"><CreditCard size={18} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-600">Tarjeta (TPV)</p>
                <p className="text-sm font-black text-teal-900">${reporteVentas.totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <span className="text-xs font-black text-teal-800">
              {reporteVentas.totalVendido > 0 ? `${Math.round((reporteVentas.totalTarjeta / reporteVentas.totalVendido) * 100)}%` : '0%'}
            </span>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800"><Landmark size={18} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-600">Transferencias</p>
                <p className="text-sm font-black text-indigo-900">${reporteVentas.totalTransferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-800">
              {reporteVentas.totalVendido > 0 ? `${Math.round((reporteVentas.totalTransferencia / reporteVentas.totalVendido) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Tabla de Historial */}
        <div>
          <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span>Historial Transaccional de Ventas</span>
            <span className="text-xs font-bold text-[#0d9488]">{ventasRealizadas.length} registros</span>
          </h4>

          {ventasRealizadas.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-black border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Fecha y Hora</th>
                    <th className="py-3 px-4">Sucursal</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Cajero</th>
                    <th className="py-3 px-4">Método(s)</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ventasRealizadas.map(v => (
                    <tr key={v.venta_id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">#{String(v.venta_id).padStart(6, '0')}</td>
                      <td className="py-3 px-4 text-stone-700">{new Date(v.fecha_venta).toLocaleString('es-MX')}</td>
                      <td className="py-3 px-4 text-stone-900 font-bold">{v.tienda_nombre}</td>
                      <td className="py-3 px-4 text-stone-700">{v.cliente_nombre || 'Público General'}</td>
                      <td className="py-3 px-4 text-stone-500">{v.cajero_nombre || 'Caja 1'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {v.pagos.map((p, idx) => (
                            <span 
                              key={idx} 
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                p.metodo === 'efectivo' 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : p.metodo === 'tarjeta' 
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                              }`}
                            >
                              {p.metodo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-teal-700 text-sm">
                        ${Number(v.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setVentaDetalleModal(v)}
                          className="p-1.5 rounded-xl bg-stone-100 hover:bg-[#0d9488] hover:text-white text-stone-700 transition-colors shadow-xs"
                          title="Ver ticket de venta"
                        >
                          <Receipt size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
              <Receipt size={32} className="mx-auto mb-2 text-stone-400" />
              <p className="text-xs font-bold text-stone-700">No hay transacciones registradas en el período seleccionado</p>
              <p className="text-[10px] text-stone-400">Las ventas realizadas en el Punto de Venta aparecerán automáticamente aquí.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETALLE DE VENTA Y TICKET */}
      {ventaDetalleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-[#0d9488]" />
                <span className="text-xs font-black text-stone-900">Comprobante de Venta #{String(ventaDetalleModal.venta_id).padStart(6, '0')}</span>
              </div>
              <button onClick={() => setVentaDetalleModal(null)} className="p-1 rounded-xl text-stone-400 hover:text-stone-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs text-left">
              <div className="space-y-1 text-stone-700">
                <div className="flex justify-between"><span>Sucursal:</span><span className="font-bold text-stone-900">{ventaDetalleModal.tienda_nombre}</span></div>
                <div className="flex justify-between"><span>Fecha:</span><span>{new Date(ventaDetalleModal.fecha_venta).toLocaleString('es-MX')}</span></div>
                <div className="flex justify-between"><span>Cliente:</span><span className="font-bold text-stone-900">{ventaDetalleModal.cliente_nombre || 'Público General'}</span></div>
                <div className="flex justify-between"><span>Cajero:</span><span>{ventaDetalleModal.cajero_nombre || 'Caja 1'}</span></div>
              </div>

              <div className="border-b border-dashed border-stone-200 my-2" />

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="text-left py-1">Cant</th>
                    <th className="text-left py-1">Descripción</th>
                    <th className="text-right py-1">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ventaDetalleModal.items.map(i => (
                    <tr key={i.id}>
                      <td className="py-1 font-bold text-stone-900">{i.cantidad}</td>
                      <td className="py-1 truncate max-w-[150px] text-stone-800">{i.producto_nombre}</td>
                      <td className="py-1 text-right font-black text-stone-900">${(Number(i.precio_unitario) * Number(i.cantidad)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-b border-dashed border-stone-200 my-2" />

              <div className="flex justify-between text-base font-black">
                <span>TOTAL:</span>
                <span className="text-[#0d9488]">${Number(ventaDetalleModal.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="space-y-1 text-[11px] pt-1 text-stone-600">
                <p className="font-bold text-stone-800">Métodos de Pago:</p>
                {ventaDetalleModal.pagos.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="uppercase">{p.metodo}:</span>
                    <span className="font-bold">${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {p.referencia ? `(${p.referencia})` : ''}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (!w) return;
                    w.document.write(`
                      <html><head><title>Ticket #${ventaDetalleModal.venta_id}</title>
                      <style>
                        @page { margin: 0; size: 80mm auto; }
                        body { font-family: 'Courier New', Courier, monospace; width: 72mm; margin: 0 auto; padding: 4mm; color: #000; font-size: 11px; }
                        .center { text-align: center; }
                        .bold { font-weight: bold; }
                        .line { border-bottom: 1px dashed #000; margin: 8px 0; }
                        .line-solid { border-bottom: 2px solid #000; margin: 8px 0; }
                        .flex { display: flex; justify-content: space-between; }
                        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                        th { border-bottom: 1px solid #000; padding-bottom: 4px; text-align: left; }
                        td { padding: 4px 0; }
                      </style></head>
                      <body>
                        <div class="center bold">DECOR MUEBLERÍA</div>
                        <div class="center">${ventaDetalleModal.tienda_nombre}</div>
                        <div class="line-solid"></div>
                        <div class="flex"><span>Fecha:</span><span>${new Date(ventaDetalleModal.fecha_venta).toLocaleString('es-MX')}</span></div>
                        <div class="flex"><span>Ticket #:</span><span class="bold">#${String(ventaDetalleModal.venta_id).padStart(6, '0')}</span></div>
                        <div class="flex"><span>Cliente:</span><span>${ventaDetalleModal.cliente_nombre || 'Público General'}</span></div>
                        <div class="flex"><span>Cajero:</span><span>${ventaDetalleModal.cajero_nombre || 'Caja 1'}</span></div>
                        <div class="line"></div>
                        <table>
                          <thead><tr><th>Cant</th><th>Desc</th><th style="text-align:right;">Total</th></tr></thead>
                          <tbody>
                            ${ventaDetalleModal.items.map(i => `<tr><td>${i.cantidad}</td><td>${i.producto_nombre}</td><td style="text-align:right;">$${(i.precio_unitario * i.cantidad).toFixed(2)}</td></tr>`).join('')}
                          </tbody>
                        </table>
                        <div class="line-solid"></div>
                        <div class="flex bold"><span>TOTAL:</span><span>$${Number(ventaDetalleModal.total).toFixed(2)}</span></div>
                        <div class="line"></div>
                        <div class="center">*** GRACIAS POR SU COMPRA ***</div>
                        <script>window.onload=function(){window.print()}</script>
                      </body></html>
                    `);
                    w.document.close();
                  }}
                  className="px-4 py-2 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} /> Imprimir Ticket
                </button>
                <button
                  onClick={() => setVentaDetalleModal(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold border border-stone-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
