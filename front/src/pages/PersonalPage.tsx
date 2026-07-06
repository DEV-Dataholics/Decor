import { useState, useMemo } from 'react';
import { useDecor } from '../store/StoreContext';
import { Search, Plus, X, Edit2, Trash2, Users, DollarSign, Briefcase, Wrench, CheckCircle2, Save, Calendar, Eye } from 'lucide-react';
import type { Empleado } from '../store/useStore';

export default function PersonalPage() {
  const { empleados, workOrders, addEmpleado, updateEmpleado, deleteEmpleado } = useDecor();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('carpintero');
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [newSpecInput, setNewSpecInput] = useState('');
  const [activo, setActivo] = useState(true);

  // Report State
  const [selectedReportEmp, setSelectedReportEmp] = useState<Empleado | null>(null);

  // Date Range Period Helper
  const getPeriodDates = (type: 'semana' | 'quincena' | 'mes') => {
    const hoy = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'semana') {
      const diaSemana = hoy.getDay();
      const diff = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'quincena') {
      const dia = hoy.getDate();
      if (dia <= 15) {
        start.setDate(1);
        end.setDate(15);
      } else {
        start.setDate(16);
        end = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (type === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const [periodType, setPeriodType] = useState<'semana' | 'quincena' | 'mes' | 'personalizado'>('semana');
  const [startDate, setStartDate] = useState(() => getPeriodDates('semana').start);
  const [endDate, setEndDate] = useState(() => getPeriodDates('semana').end);

  const handlePeriodChange = (type: 'semana' | 'quincena' | 'mes') => {
    setPeriodType(type);
    const dates = getPeriodDates(type);
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  // Compute accumulated earnings for each employee
  const earningsMap = useMemo(() => {
    const map = new Map<number, { total: number; count: number; completedCount: number; activePieces: number }>();
    
    // Initialize map
    empleados.forEach(emp => {
      map.set(emp.id, { total: 0, count: 0, completedCount: 0, activePieces: 0 });
    });

    // Accumulate from work orders
    workOrders.forEach(wo => {
      // Carpintero
      if (wo.empleado_id) {
        const stats = map.get(wo.empleado_id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
        
        // Carga de trabajo en tiempo real (solo si está en producción o pendiente)
        if (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion') {
          stats.activePieces += wo.cantidad;
        }

        // Sumar pagos acumulados y piezas completadas
        if (wo.estatus === 'listo_embarque') {
          const fechaT = wo.fecha_termino || '';
          if (fechaT >= startDate && fechaT <= endDate) {
            stats.total += wo.costo_mano_obra || 0;
            stats.completedCount += wo.cantidad;
          }
        }
        
        map.set(wo.empleado_id, stats);
      }

      // Pintor/Acabador
      if (wo.empleado_acabado_id) {
        const stats = map.get(wo.empleado_acabado_id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
        
        // Carga de trabajo en tiempo real (solo si está en acabados)
        if (wo.estatus === 'acabados') {
          stats.activePieces += wo.cantidad;
        }

        // Sumar pagos acumulados y piezas completadas
        if (wo.estatus === 'listo_embarque') {
          const fechaT = wo.fecha_termino || '';
          if (fechaT >= startDate && fechaT <= endDate) {
            stats.total += wo.costo_acabado || 0;
            stats.completedCount += wo.cantidad;
          }
        }
        
        map.set(wo.empleado_acabado_id, stats);
      }
    });

    return map;
  }, [empleados, workOrders, startDate, endDate]);

  const totalGastoManoObra = useMemo(() => {
    return Array.from(earningsMap.values()).reduce((sum, item) => sum + item.total, 0);
  }, [earningsMap]);

  const totalEmpleadosActivos = useMemo(() => {
    return empleados.filter(e => e.activo).length;
  }, [empleados]);

  // Filter list
  const filtered = useMemo(() => {
    return empleados.filter(emp => {
      const matchesSearch = !search || emp.nombre.toLowerCase().includes(search.toLowerCase()) || 
        emp.especialidades.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = !roleFilter || emp.rol.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [empleados, search, roleFilter]);

  const handleOpenEdit = (emp: Empleado) => {
    setEditingId(emp.id);
    setNombre(emp.nombre);
    setRol(emp.rol);
    setEspecialidades(emp.especialidades);
    setNewSpecInput('');
    setActivo(emp.activo);
    setShowForm(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setNombre('');
    setRol('carpintero');
    setEspecialidades([]);
    setNewSpecInput('');
    setActivo(true);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    let finalSpecs = [...especialidades];
    const remainingVal = newSpecInput.trim().replace(/,/g, '');
    if (remainingVal && !finalSpecs.includes(remainingVal)) {
      finalSpecs.push(remainingVal);
    }

    const empData = {
      nombre,
      rol,
      especialidades: finalSpecs,
      activo,
    };

    if (editingId) {
      updateEmpleado(editingId, empData);
    } else {
      addEmpleado(empData);
    }

    setShowForm(false);
  };

  const handleDelete = (id: number, name: string) => {
    const stats = earningsMap.get(id);
    const hasEarnings = stats && stats.total > 0;
    
    let confirmMsg = `¿Estás seguro de eliminar a ${name}?`;
    if (hasEarnings) {
      confirmMsg = `⚠️ ADVERTENCIA: ${name} tiene un historial de pagos registrados ($${stats.total.toLocaleString('es-MX')}). Si lo eliminas, los montos ya pagados se mantendrán en las órdenes pero no podrás rastrear su perfil. ¿Deseas proceder?`;
    }

    if (confirm(confirmMsg)) {
      deleteEmpleado(id);
    }
  };

  const rolesDisponibles = useMemo(() => {
    return [...new Set(empleados.map(e => e.rol))].sort();
  }, [empleados]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg text-amber-400 bg-amber-500/15">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Personal Activo</p>
            <p className="text-xl font-bold text-zinc-100">{totalEmpleadosActivos} empleados</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg text-emerald-400 bg-emerald-500/15">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Gasto Mano de Obra</p>
            <p className="text-xl font-bold text-emerald-400">${totalGastoManoObra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg text-blue-400 bg-blue-500/15">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total Empleados</p>
            <p className="text-xl font-bold text-zinc-100">{empleados.length} registrados</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-dark pl-10" 
            placeholder="Buscar por nombre o especialidad..." 
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X size={14} /></button>}
        </div>
        <select 
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value)} 
          className="input-dark w-full sm:w-48"
        >
          <option value="" className="bg-zinc-900">Todos los puestos</option>
          {rolesDisponibles.map(r => <option key={r} value={r} className="bg-zinc-900 capitalize">{r}</option>)}
        </select>
        <button onClick={handleOpenCreate} className="btn-primary shrink-0 justify-center">
          <Plus size={16} /> Registrar Empleado
        </button>
      </div>

      {/* Date Range Period Filter */}
      <div className="glass-card p-4 space-y-3 bg-zinc-900/20 border border-zinc-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-amber-400" size={16} />
            <span className="text-xs font-semibold text-zinc-300">Rango de Prenómina:</span>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">({startDate} al {endDate})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button 
              type="button"
              onClick={() => handlePeriodChange('semana')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${periodType === 'semana' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-zinc-800/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-300'}`}
            >
              Esta Semana
            </button>
            <button 
              type="button"
              onClick={() => handlePeriodChange('quincena')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${periodType === 'quincena' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-zinc-800/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-300'}`}
            >
              Esta Quincena
            </button>
            <button 
              type="button"
              onClick={() => handlePeriodChange('mes')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${periodType === 'mes' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-zinc-800/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-300'}`}
            >
              Este Mes
            </button>
            <button 
              type="button"
              onClick={() => setPeriodType('personalizado')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${periodType === 'personalizado' ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-zinc-800/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-300'}`}
            >
              Personalizado
            </button>
          </div>
        </div>
        
        {periodType === 'personalizado' && (
          <div className="flex flex-col sm:flex-row gap-3 animate-fade-in pt-1">
            <div className="flex-1">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase block mb-1">Inicio</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setPeriodType('personalizado');
                }} 
                className="input-dark w-full text-xs" 
              />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase block mb-1">Fin</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => {
                  setEndDate(e.target.value);
                  setPeriodType('personalizado');
                }} 
                className="input-dark w-full text-xs" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(emp => {
          const stats = earningsMap.get(emp.id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
          return (
            <div key={emp.id} className={`glass-card p-5 space-y-4 border-l-4 transition-all ${emp.activo ? 'border-l-amber-500 hover:border-amber-500/20' : 'border-l-zinc-700 hover:border-zinc-700/20 opacity-60'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 capitalize">
                    {emp.nombre}
                    {!emp.activo && <span className="bg-zinc-800 text-zinc-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Inactivo</span>}
                  </h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold flex items-center gap-1 mt-0.5"><Wrench size={10} /> {emp.rol}</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <button type="button" onClick={() => setSelectedReportEmp(emp)} className="p-1 px-2 hover:bg-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold border border-emerald-500/20" title="Ver Prenómina / Detalle">
                    <Eye size={12} /> Nómina
                  </button>
                  <button onClick={() => handleOpenEdit(emp)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 rounded-lg transition-colors" title="Editar"><Edit2 size={12} /></button>
                  <button onClick={() => handleDelete(emp.id, emp.nombre)} className="p-1.5 bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-lg transition-colors" title="Eliminar"><Trash2 size={12} /></button>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1">
                {emp.especialidades.map(spec => (
                  <span key={spec} className="bg-zinc-800/60 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-medium capitalize">{spec}</span>
                ))}
              </div>

              {/* Stats & Financials */}
              <div className="border-t border-zinc-800/40 pt-3 text-xs">
                <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/50 flex justify-between items-center">
                  <span className="text-[9px] uppercase text-zinc-500 font-bold">Nómina del Período</span>
                  <span className="font-bold text-emerald-400 text-sm">${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 bg-zinc-800/20 px-3 py-1.5 rounded-lg border border-zinc-800/20">
                  <span className="flex items-center gap-1"><Briefcase size={11} className="text-amber-400" /> Carga activa:</span>
                  <span className="font-mono text-amber-400 font-bold">{stats.activePieces} piezas</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 bg-zinc-800/20 px-3 py-1.5 rounded-lg border border-zinc-800/20">
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> Completadas en período:</span>
                  <span className="font-mono text-zinc-300 font-bold">{stats.completedCount} piezas</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-3 text-center text-sm text-zinc-600 py-8">Ningún empleado coincide con el filtro.</p>}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="glass-card w-full max-w-md animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center sticky top-0 bg-zinc-800/90 backdrop-blur-sm z-10">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Users size={18} className="text-amber-400" /> 
                {editingId ? 'Editar Perfil de Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                  className="input-dark w-full"
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Puesto / Rol</label>
                <select 
                  value={rol} 
                  onChange={e => setRol(e.target.value)} 
                  className="input-dark capitalize w-full"
                >
                  <option value="carpintero" className="bg-zinc-900">Carpintero</option>
                  <option value="pintor" className="bg-zinc-900">Pintor</option>
                  <option value="tapicero" className="bg-zinc-900">Tapicero</option>
                  <option value="embalaje" className="bg-zinc-900">Embalaje</option>
                  <option value="encargado" className="bg-zinc-900">Encargado/Supervisor</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Especialidades</label>
                <input 
                  type="text" 
                  value={newSpecInput} 
                  onChange={e => setNewSpecInput(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const cleanVal = newSpecInput.trim().replace(/,/g, '');
                      if (cleanVal && !especialidades.includes(cleanVal)) {
                        setEspecialidades(prev => [...prev, cleanVal]);
                      }
                      setNewSpecInput('');
                    }
                  }}
                  className="input-dark w-full"
                  placeholder="Escribe una especialidad y presiona Enter o coma..."
                />
                
                {/* Nube de etiquetas */}
                {especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
                    {especialidades.map(spec => (
                      <span 
                        key={spec} 
                        className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-amber-500/20 capitalize animate-scale-in"
                      >
                        {spec}
                        <button 
                          type="button" 
                          onClick={() => setEspecialidades(prev => prev.filter(s => s !== spec))}
                          className="text-amber-500/60 hover:text-amber-400 font-bold ml-0.5 text-[10px] hover:scale-110 transition-transform"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="activo"
                  checked={activo} 
                  onChange={e => setActivo(e.target.checked)} 
                  className="accent-amber-500" 
                />
                <label htmlFor="activo" className="text-xs font-semibold text-zinc-300 cursor-pointer">Empleado Activo en Producción</label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-800/40">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  <Save size={14} /> {editingId ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {/* Modal de Detalle de Nómina y Carga del Empleado */}
      {selectedReportEmp && (() => {
        const stats = earningsMap.get(selectedReportEmp.id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
        
        // Filtrar órdenes activas asignadas a este empleado
        const activeWOs = workOrders.filter(wo => 
          (wo.empleado_id === selectedReportEmp.id && (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion')) ||
          (wo.empleado_acabado_id === selectedReportEmp.id && wo.estatus === 'acabados')
        );

        // Filtrar órdenes completadas en este período asignadas a este empleado
        const completedWOs = workOrders.filter(wo => 
          ((wo.empleado_id === selectedReportEmp.id && (wo.costo_mano_obra || 0) > 0) || 
           (wo.empleado_acabado_id === selectedReportEmp.id && (wo.costo_acabado || 0) > 0)) &&
          wo.estatus === 'listo_embarque' && 
          wo.fecha_termino && wo.fecha_termino >= startDate && wo.fecha_termino <= endDate
        );

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card w-full max-w-3xl max-h-[85vh] flex flex-col animate-scale-in">
              <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center bg-zinc-800/90 backdrop-blur-sm z-10 rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                    <Users size={18} className="text-amber-400" /> 
                    Detalle de Empleado: {selectedReportEmp.nombre}
                  </h3>
                  <p className="text-[10px] text-zinc-400 capitalize mt-0.5">{selectedReportEmp.rol} • {selectedReportEmp.activo ? 'Activo en producción' : 'Inactivo'}</p>
                </div>
                <button type="button" onClick={() => setSelectedReportEmp(null)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Métricas destacadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Carga Activa actual</p>
                    <p className="text-2xl font-black text-amber-400 mt-1">{stats.activePieces} <span className="text-xs font-normal text-zinc-500">piezas</span></p>
                  </div>
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Completadas en período</p>
                    <p className="text-2xl font-black text-zinc-100 mt-1">{stats.completedCount} <span className="text-xs font-normal text-zinc-500">piezas</span></p>
                  </div>
                  <div className="bg-zinc-900/40 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">Nómina del Período</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Carga Activa Detallada */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                      <Briefcase size={12} className="text-amber-400" /> Trabajos Activos asignados ({activeWOs.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {activeWOs.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-8">Sin trabajos activos en este momento</p>
                      ) : activeWOs.map(wo => (
                        <div key={wo.id} className="bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-zinc-200">{wo.producto_nombre}</p>
                            <p className="text-[9px] text-zinc-500">Orden #{wo.orden_id} • {wo.acabado_nombre}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full capitalize">{wo.estatus}</span>
                            <p className="text-[9px] text-zinc-400 mt-1">{wo.cantidad} pza(s)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prenómina Detallada */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                      <CheckCircle2 size={12} className="text-emerald-400" /> Piezas Terminadas en período ({completedWOs.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {completedWOs.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-8">Sin piezas terminadas en el rango de fechas</p>
                      ) : completedWOs.map(wo => {
                        const esCarpintero = wo.empleado_id === selectedReportEmp.id;
                        const esAcabador = wo.empleado_acabado_id === selectedReportEmp.id;
                        let monto = 0;
                        let detalleRol = '';
                        if (esCarpintero) {
                          monto += wo.costo_mano_obra || 0;
                          detalleRol += '🔨 Carpintería';
                        }
                        if (esAcabador) {
                          monto += wo.costo_acabado || 0;
                          detalleRol += (detalleRol ? ' + ' : '') + '🎨 Acabados';
                        }
                        return (
                          <div key={wo.id} className="bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-zinc-200">{wo.producto_nombre}</p>
                              <p className="text-[9px] text-zinc-500">Orden #{wo.orden_id} • {detalleRol} • Finalizado: {wo.fecha_termino}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-emerald-400">${monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                              <p className="text-[9px] text-zinc-400 mt-0.5">{wo.cantidad} pza(s)</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-zinc-700/50 flex justify-end bg-zinc-800/90 rounded-b-2xl">
                <button type="button" onClick={() => setSelectedReportEmp(null)} className="btn-ghost px-5">Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
