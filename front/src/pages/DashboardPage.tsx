import { useState, useMemo } from 'react';
import { ClipboardList, Hammer, PackageSearch, Truck, AlertTriangle, Package, Timer, DollarSign, BarChart2, ShoppingBag, TrendingUp, Calendar, Store, Printer } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useDecor } from '../store/StoreContext';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

export default function DashboardPage() {
  const { workOrders, materiaPrima, terminados, embarques, empleados, pedidos, productos, ventas, tiendas } = useDecor();

  const totalCostoManoObra = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.costo_mano_obra || 0) + (wo.costo_acabado || 0), 0);
  }, [workOrders]);

  const nominaSemanaActual = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 es domingo, 1 es lunes, etc.
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
  }, [pedidos, productos, workOrders]);

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

  // Lógica del Reporte de Ventas por Sucursal
  const reporteVentas = useMemo(() => {
    const inicio = fechaInicio ? new Date(fechaInicio + 'T00:00:00') : null;
    const fin = fechaFin ? new Date(fechaFin + 'T23:59:59') : null;

    const ventasFiltradas = ventas.filter(v => {
      if (tiendaFiltroId !== 'todas' && v.tienda_id !== Number(tiendaFiltroId)) {
        return false;
      }
      const fVenta = new Date(v.fecha_venta);
      if (inicio && fVenta < inicio) return false;
      if (fin && fVenta > fin) return false;
      return true;
    });

    const totalVendido = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
    const totalTransacciones = ventasFiltradas.length;
    const ticketPromedio = totalTransacciones > 0 ? totalVendido / totalTransacciones : 0;
    
    let totalPiezasVendidas = 0;
    const productCounts = new Map<number, { qty: number, subtotal: number, name: string, sku: string }>();

    ventasFiltradas.forEach(v => {
      v.items.forEach(item => {
        const qty = item.cantidad || 1;
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
        prodData.subtotal += (item.precio_unitario * qty);
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
      topProductosReporte
    };
  }, [ventas, fechaInicio, fechaFin, tiendaFiltroId]);

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
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .filters { font-size: 12px; color: #666; margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
            .kpi-label { font-size: 10px; text-transform: uppercase; color: #777; margin-bottom: 5px; }
            .kpi-val { font-size: 18px; font-weight: bold; color: #222; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Reporte de Ventas por Sucursal</h1>
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
          if (isCarpenterActive || isFinisherActive) {
            return sum + wo.cantidad;
          }
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

  // Órdenes consideradas "Nuevas" (todas sus piezas están en 'pendiente')
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
    { label: 'Órdenes Activas', value: orderStats.total, sub: `${orderStats.pendientes} pendientes · ${orderStats.en_produccion} en producción`, icon: <ClipboardList size={20} />, color: ordenesNuevas.length > 0 ? 'text-red-400 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : 'text-blue-400 bg-blue-500/15' },
    { label: 'Gasto Mano de Obra', value: `$${totalCostoManoObra.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `$${nominaSemanaActual.toLocaleString('es-MX', { maximumFractionDigits: 0 })} esta semana`, icon: <DollarSign size={20} />, color: 'text-[#c2703e] bg-[#c2703e]/15' },
    { label: 'Utilidad Bruta Est.', value: `$${utilidadEstimada.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `${margenUtilidadPct}% margen s/ventas`, icon: <DollarSign size={20} />, color: 'text-emerald-400 bg-emerald-500/15' },
    { label: 'Materia Prima Crítica', value: mpCritica.length, sub: mpCritica.length > 0 ? mpCritica.map(m => m.nombre).join(', ') : 'Todo bien', icon: <AlertTriangle size={20} />, color: mpCritica.length > 0 ? 'text-red-400 bg-red-500/15' : 'text-emerald-400 bg-emerald-500/15' },
    { label: 'Terminados sin Embarcar', value: terminadosStats.total, sub: `Venta: $${Math.round(terminadosStats.valor).toLocaleString('es-MX')} · Costo: $${Math.round(terminadosStats.costo).toLocaleString('es-MX')}`, icon: <Package size={20} />, color: terminadosStats.antiguos > 0 ? 'text-amber-400 bg-amber-500/15' : 'text-purple-400 bg-purple-500/15' },
    { label: 'Embarques Activos', value: embarquesActivos.length, sub: embarquesActivos.length > 0 ? `${embarquesActivos.length} en tránsito/preparando` : 'Sin envíos en curso', icon: <Truck size={20} />, color: 'text-purple-400 bg-purple-500/15' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-2xl font-bold text-zinc-100 mt-2">{kpi.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{kpi.sub}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.color}`}>{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {ordenesNuevas.length > 0 && (
        <div className="glass-card p-4 border-red-500/40 bg-red-500/10 animate-pulse-slow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ClipboardList size={80} />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <h3 className="text-lg font-black text-red-400 tracking-wide uppercase">¡Nuevas Órdenes Asignadas!</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
            {ordenesNuevas.map(items => {
              const fWo = items[0];
              return (
                <div key={fWo.orden_id} className="bg-red-900/40 rounded-lg p-3 border border-red-500/30 flex justify-between items-center hover:bg-red-900/60 transition-colors cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-red-300">Orden #{fWo.orden_id}</p>
                    <p className="text-[10px] text-red-200/70">{fWo.cliente_nombre}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-1 rounded-full">{items.length} pzas</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mpCritica.length > 0 && (
        <div className="glass-card p-4 border-red-500/20 bg-red-500/5 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-red-400 shrink-0" />
            <h3 className="text-sm font-bold text-red-300">⚠ Materia Prima bajo mínimo</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {mpCritica.map(mp => (
              <div key={mp.id} className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                <p className="text-xs font-bold text-red-300">{mp.nombre}</p>
                <p className="text-[10px] text-red-400">{mp.cantidad} {mp.unidad} (mín: {mp.minimo})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {terminadosStats.antiguos > 0 && (
        <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5 flex items-center gap-3 animate-fade-in">
          <Timer size={20} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-300">{terminadosStats.antiguos} piezas llevan +7 días sin embarcar</p>
            <p className="text-xs text-amber-400/70">Riesgo de deterioro por acumulamiento (A-04)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie chart - Orders by status */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Hammer size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Órdenes por Estado</h3>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] text-zinc-400">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-zinc-600 py-12">Sin órdenes activas</p>
          )}
        </div>

        {/* Materia Prima overview */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PackageSearch size={16} className="text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Materia Prima</h3>
          </div>
          <div className="space-y-2">
            {materiaPrima.map(mp => {
              const pct = Math.min(100, (mp.cantidad / (mp.minimo * 3)) * 100);
              const isCritical = mp.cantidad <= mp.minimo;
              return (
                <div key={mp.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: mp.color }} />
                      {mp.nombre}
                    </span>
                    <span className={`text-xs font-bold ${isCritical ? 'text-red-400' : 'text-zinc-400'}`}>{mp.cantidad} {mp.unidad}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Terminados sin embarcar */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-300">Listos para Embarcar</h3>
          </div>
          {terminados.length === 0 ? (
            <p className="text-center text-sm text-zinc-600 py-12">Sin piezas pendientes</p>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto scrollbar-hide">
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
                  <div key={`${t.orden_id}`} className="bg-zinc-800/40 rounded-lg p-2.5 border border-zinc-700/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-200 leading-tight">Orden #{t.orden_id}</p>
                        <p className="text-[9px] text-zinc-500">{t.cliente_nombre} · {t.count} piezas listas</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${dias > 7 ? 'bg-red-500/20 text-red-400' : dias > 3 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                        {dias}d
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Carga de Trabajo / Productividad por Carpintero */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-300">
                {graficoMetrica === 'productividad' 
                  ? 'Productividad Histórica por Carpintero' 
                  : 'Carga de Trabajo Activa (En Vivo)'}
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Selector de Métrica */}
              <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setGraficoMetrica('productividad')}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                    graficoMetrica === 'productividad'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Histórico (Productividad)
                </button>
                <button
                  onClick={() => setGraficoMetrica('carga')}
                  className={`px-3 py-1 text-[11px] font-bold rounded transition-all ${
                    graficoMetrica === 'carga'
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  En Vivo (Carga)
                </button>
              </div>

              <span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded-full font-bold">
                {graficoMetrica === 'carga' 
                  ? `${filteredChartData.reduce((sum, d) => sum + d['Piezas Asignadas'], 0)} piezas activas`
                  : `${filteredChartData.reduce((sum, d) => sum + d['Piezas Terminadas'], 0)} piezas terminadas`}
              </span>
            </div>
          </div>

          {filteredChartData.length > 0 ? (
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis dataKey="nombre" type="category" stroke="#71717a" fontSize={11} tickLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.3 }}
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }}
                    formatter={(value, name) => [`${value} piezas`, name]}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  {graficoMetrica === 'carga' ? (
                    <Bar dataKey="Piezas Asignadas" name="Piezas Asignadas (Carga)" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
                  ) : (
                    <>
                      <Bar dataKey="Piezas Terminadas" name="Piezas Terminadas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                      <Bar dataKey="Rechazos" name="Rechazos por Calidad" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-650 py-16">
              {graficoMetrica === 'carga' 
                ? 'No hay piezas activas asignadas a los carpinteros actualmente.'
                : 'No se registran piezas finalizadas ni incidencias en el histórico todavía.'}
            </p>
          )}
        </div>
      </div>

      {/* Análisis de Rentabilidad por Producto */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-300">Rentabilidad y Márgenes de los Top 5 Productos más Vendidos</h3>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Análisis Costo vs. Precio
            </span>
          </div>

          {topProductosRentables.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductosRentables} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.2 }}
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }}
                    formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`]}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Bar dataKey="Ventas" name="Ingresos por Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Costos" name="Costos de Fabricación (Est. + M.O.)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ganancia" name="Utilidad Neta Estimada" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-650 py-16">
              Sin datos de pedidos o ventas registrados para analizar rentabilidad.
            </p>
          )}
        </div>
      </div>

      {/* Reporte de Ventas por Sucursal con Filtros */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Store size={16} className="text-amber-400" />
                Reporte de Ventas por Sucursal
              </h3>
              <p className="text-[10px] text-zinc-500">Consulta las ventas de sucursal (POS) en un rango de fechas determinado.</p>
            </div>
            
            {/* Controles de Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1">
                  <Calendar size={12} /> Rango:
                </span>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={e => setFechaInicio(e.target.value)} 
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-amber-500/50"
                />
                <span className="text-zinc-650 text-xs">a</span>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={e => setFechaFin(e.target.value)} 
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Sucursal:</span>
                <select
                  value={tiendaFiltroId}
                  onChange={e => setTiendaFiltroId(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-[11px] font-bold text-zinc-300 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="todas">Todas las Sucursales</option>
                  {tiendas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrintReport}
                className="px-3 py-1 bg-zinc-800 hover:bg-[#c2703e]/10 hover:text-[#c2703e] text-zinc-300 border border-zinc-700/50 rounded text-[11px] font-bold transition-all flex items-center gap-1.5"
              >
                <Printer size={12} /> Exportar PDF
              </button>
            </div>
          </div>

          {/* Micro KPIs de Ventas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40 text-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Monto Total Vendido</span>
              <span className="text-lg font-black text-[#10b981]">${Math.round(reporteVentas.totalVendido).toLocaleString('es-MX')}</span>
            </div>
            <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40 text-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Transacciones (POS)</span>
              <span className="text-lg font-black text-blue-400">{reporteVentas.totalTransacciones}</span>
            </div>
            <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40 text-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Ticket Promedio</span>
              <span className="text-lg font-black text-amber-400">${Math.round(reporteVentas.ticketPromedio).toLocaleString('es-MX')}</span>
            </div>
            <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/40 text-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Piezas Físicas Vendidas</span>
              <span className="text-lg font-black text-purple-400">{reporteVentas.totalPiezasVendidas}</span>
            </div>
          </div>

          {/* Top de Productos del Reporte */}
          <div>
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider mb-3">Artículos de Mayor Rotación en el Período</h4>
            {reporteVentas.topProductosReporte.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {reporteVentas.topProductosReporte.map((item, index) => (
                  <div key={item.id} className="bg-zinc-950/20 p-3 rounded-lg border border-zinc-850 flex flex-col justify-between hover:border-zinc-800 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                          #{index + 1}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500">{item.sku}</span>
                      </div>
                      <p className="text-xs font-bold text-zinc-200 line-clamp-2 leading-tight min-h-[32px]">{item.name}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-zinc-800/40 flex justify-between items-baseline">
                      <span className="text-[10px] text-zinc-500">{item.qty} pzas</span>
                      <span className="text-xs font-black text-zinc-100">${Math.round(item.subtotal).toLocaleString('es-MX')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-zinc-650 py-10">
                No hay productos vendidos en este período y sucursal.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
