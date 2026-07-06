import { useMemo } from 'react';
import { ClipboardList, Hammer, PackageSearch, Truck, AlertTriangle, Package, Timer, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useDecor } from '../store/StoreContext';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

export default function DashboardPage() {
  const { workOrders, materiaPrima, terminados, embarques, empleados } = useDecor();

  const totalCostoManoObra = useMemo(() => {
    return workOrders.reduce((sum, wo) => sum + (wo.costo_mano_obra || 0), 0);
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
        return sum + (wo.costo_mano_obra || 0);
      }
      return sum;
    }, 0);
  }, [workOrders]);

  const chartCargaTrabajoData = useMemo(() => {
    return empleados
      .filter(emp => emp.activo)
      .map(emp => {
        const piezasActivas = workOrders.reduce((sum, wo) => {
          if (wo.empleado_id === emp.id && (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion' || wo.estatus === 'acabados')) {
            return sum + wo.cantidad;
          }
          return sum;
        }, 0);
        return {
          nombre: emp.nombre.split(' ')[0] + ' ' + (emp.nombre.split(' ')[1] ? emp.nombre.split(' ')[1][0] + '.' : ''),
          nombreCompleto: emp.nombre,
          'Piezas Asignadas': piezasActivas,
        };
      })
      .filter(d => d['Piezas Asignadas'] > 0)
      .sort((a, b) => b['Piezas Asignadas'] - a['Piezas Asignadas']);
  }, [empleados, workOrders]);


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
    const hoy = new Date();
    const antiguos = terminados.filter(t => {
      const dias = Math.floor((hoy.getTime() - new Date(t.fecha_listo).getTime()) / 86400000);
      return dias > 7;
    }).length;
    return { total, valor, antiguos };
  }, [terminados]);

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
    { label: 'Gasto Mano de Obra', value: `$${totalCostoManoObra.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, sub: `$${nominaSemanaActual.toLocaleString('es-MX', { maximumFractionDigits: 0 })} esta semana`, icon: <DollarSign size={20} />, color: 'text-emerald-400 bg-emerald-500/15' },
    { label: 'Materia Prima Crítica', value: mpCritica.length, sub: mpCritica.length > 0 ? mpCritica.map(m => m.nombre).join(', ') : 'Todo bien', icon: <AlertTriangle size={20} />, color: mpCritica.length > 0 ? 'text-red-400 bg-red-500/15' : 'text-emerald-400 bg-emerald-500/15' },
    { label: 'Terminados sin Embarcar', value: terminadosStats.total, sub: `$${Math.round(terminadosStats.valor).toLocaleString('es-MX')} capital parado`, icon: <Package size={20} />, color: terminadosStats.antiguos > 0 ? 'text-amber-400 bg-amber-500/15' : 'text-purple-400 bg-purple-500/15' },
    { label: 'Embarques Activos', value: embarquesActivos.length, sub: embarquesActivos.length > 0 ? `${embarquesActivos.length} en tránsito/preparando` : 'Sin envíos en curso', icon: <Truck size={20} />, color: 'text-purple-400 bg-purple-500/15' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      {/* Carga de Trabajo por Carpintero */}
      <div className="grid grid-cols-1 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hammer size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-300">Carga de Trabajo por Carpintero (Piezas Activas)</h3>
            </div>
            <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold">
              {chartCargaTrabajoData.reduce((sum, d) => sum + d['Piezas Asignadas'], 0)} piezas en total
            </span>
          </div>
          {chartCargaTrabajoData.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartCargaTrabajoData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis dataKey="nombre" type="category" stroke="#71717a" fontSize={11} tickLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.3 }}
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }}
                    formatter={(value) => [`${value} piezas`, 'Carga de trabajo']}
                  />
                  <Bar dataKey="Piezas Asignadas" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-600 py-12">No hay piezas activas asignadas a carpinteros</p>
          )}
        </div>
      </div>
    </div>
  );
}
