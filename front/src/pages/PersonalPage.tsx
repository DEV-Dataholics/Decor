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
    
    empleados.forEach(emp => {
      map.set(emp.id, { total: 0, count: 0, completedCount: 0, activePieces: 0 });
    });

    workOrders.forEach(wo => {
      // Carpintero
      if (wo.empleado_id) {
        const stats = map.get(wo.empleado_id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
        
        if (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion') {
          stats.activePieces += wo.cantidad;
        }

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
        
        if (wo.estatus === 'acabados') {
          stats.activePieces += wo.cantidad;
        }

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
    <div className="space-y-5 text-left">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Personal Activo</p>
            <p className="text-xl font-black text-stone-900 mt-0.5">{totalEmpleadosActivos} artesanos</p>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Gasto Mano de Obra (Período)</p>
            <p className="text-xl font-black text-teal-700 font-mono mt-0.5">${totalGastoManoObra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">Plantilla Total</p>
            <p className="text-xl font-black text-stone-900 mt-0.5">{empleados.length} registrados</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]" 
            placeholder="Buscar artesano por nombre o especialidad..." 
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        <select 
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value)} 
          className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488] w-full sm:w-48"
        >
          <option value="">Todos los puestos</option>
          {rolesDisponibles.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>

        <button 
          onClick={handleOpenCreate} 
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus size={16} /> Registrar Empleado
        </button>
      </div>

      {/* Date Range Period Filter */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#0d9488]" size={16} />
            <span className="text-xs font-bold text-stone-900">Período de Prenómina:</span>
            <span className="text-xs text-stone-500 font-mono font-medium">({startDate} al {endDate})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button 
              type="button"
              onClick={() => handlePeriodChange('semana')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${periodType === 'semana' ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'}`}
            >
              Esta Semana
            </button>
            <button 
              type="button"
              onClick={() => handlePeriodChange('quincena')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${periodType === 'quincena' ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'}`}
            >
              Esta Quincena
            </button>
            <button 
              type="button"
              onClick={() => handlePeriodChange('mes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${periodType === 'mes' ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'}`}
            >
              Este Mes
            </button>
            <button 
              type="button"
              onClick={() => setPeriodType('personalizado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${periodType === 'personalizado' ? 'bg-[#0d9488] border-[#0d9488] text-white shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'}`}
            >
              Personalizado
            </button>
          </div>
        </div>
        
        {periodType === 'personalizado' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-stone-100">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">Fecha Inicio</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => {
                  setStartDate(e.target.value);
                  setPeriodType('personalizado');
                }} 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]" 
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-stone-600 uppercase block mb-1">Fecha Fin</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => {
                  setEndDate(e.target.value);
                  setPeriodType('personalizado');
                }} 
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]" 
              />
            </div>
          </div>
        )}
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const stats = earningsMap.get(emp.id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
          return (
            <div key={emp.id} className={`bg-white border rounded-2xl p-5 space-y-3.5 shadow-sm hover:shadow-md transition-all ${emp.activo ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5 capitalize">
                    {emp.nombre}
                    {!emp.activo && <span className="bg-stone-100 text-stone-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-stone-200">Inactivo</span>}
                  </h3>
                  <p className="text-[10px] text-stone-500 uppercase font-black tracking-wider flex items-center gap-1 mt-0.5"><Wrench size={11} className="text-[#0d9488]" /> {emp.rol}</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <button 
                    type="button" 
                    onClick={() => setSelectedReportEmp(emp)} 
                    className="p-1 px-2.5 hover:bg-teal-100 bg-teal-50 text-teal-800 rounded-xl transition-all flex items-center gap-1 text-xs font-bold border border-teal-200 shadow-xs" 
                    title="Ver Prenómina / Detalle"
                  >
                    <Eye size={12} /> Nómina
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(emp)} 
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors border border-stone-200" 
                    title="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDelete(emp.id, emp.nombre)} 
                    className="p-1.5 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl transition-colors border border-stone-200" 
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1">
                {emp.especialidades.map(spec => (
                  <span key={spec} className="bg-stone-50 border border-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded-lg font-bold capitalize">{spec}</span>
                ))}
              </div>

              {/* Financials */}
              <div className="border-t border-stone-100 pt-3">
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex justify-between items-center">
                  <span className="text-[10px] uppercase text-stone-500 font-bold">Nómina del Período</span>
                  <span className="font-black text-teal-700 text-sm font-mono">${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/60">
                  <span className="flex items-center gap-1 font-medium"><Briefcase size={11} className="text-amber-600" /> Carga activa:</span>
                  <span className="font-mono text-amber-800 font-black">{stats.activePieces} piezas</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/60">
                  <span className="flex items-center gap-1 font-medium"><CheckCircle2 size={11} className="text-teal-600" /> Completadas en período:</span>
                  <span className="font-mono text-stone-800 font-black">{stats.completedCount} piezas</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-3 text-center text-xs text-stone-400 py-12">Ningún artesano coincide con el filtro.</p>}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in text-left flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center rounded-t-3xl">
              <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                <Users size={18} className="text-[#0d9488]" /> 
                {editingId ? 'Editar Perfil de Artesano' : 'Registrar Nuevo Artesano'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)} 
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  placeholder="Ej. Juan Pérez"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Puesto / Rol</label>
                <select 
                  value={rol} 
                  onChange={e => setRol(e.target.value)} 
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 capitalize focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="carpintero">Carpintero</option>
                  <option value="pintor">Pintor</option>
                  <option value="tapicero">Tapicero</option>
                  <option value="embalaje">Embalaje</option>
                  <option value="encargado">Encargado/Supervisor</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase mb-1 block">Especialidades</label>
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
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  placeholder="Escribe una especialidad y presiona Enter o coma..."
                />
                
                {especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                    {especialidades.map(spec => (
                      <span 
                        key={spec} 
                        className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-[10px] px-2.5 py-0.5 rounded-lg font-bold border border-teal-200 capitalize"
                      >
                        {spec}
                        <button 
                          type="button" 
                          onClick={() => setEspecialidades(prev => prev.filter(s => s !== spec))}
                          className="text-teal-600 hover:text-teal-900 ml-0.5"
                        >
                          <X size={12} />
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
                  className="accent-[#0d9488]" 
                />
                <label htmlFor="activo" className="text-xs font-bold text-stone-800 cursor-pointer">Artesano Activo en Producción</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-200">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100 flex-1">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 flex-1 shadow-sm">
                  <Save size={14} /> {editingId ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Detalle de Nómina */}
      {selectedReportEmp && (() => {
        const stats = earningsMap.get(selectedReportEmp.id) || { total: 0, count: 0, completedCount: 0, activePieces: 0 };
        
        const activeWOs = workOrders.filter(wo => 
          (wo.empleado_id === selectedReportEmp.id && (wo.estatus === 'pendiente' || wo.estatus === 'en_produccion')) ||
          (wo.empleado_acabado_id === selectedReportEmp.id && wo.estatus === 'acabados')
        );

        const completedWOs = workOrders.filter(wo => 
          ((wo.empleado_id === selectedReportEmp.id && (wo.costo_mano_obra || 0) > 0) || 
           (wo.empleado_acabado_id === selectedReportEmp.id && (wo.costo_acabado || 0) > 0)) &&
          wo.estatus === 'listo_embarque' && 
          wo.fecha_termino && wo.fecha_termino >= startDate && wo.fecha_termino <= endDate
        );

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in text-left">
              <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center rounded-t-3xl">
                <div>
                  <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                    <Users size={18} className="text-[#0d9488]" /> 
                    Detalle de Artesano: {selectedReportEmp.nombre}
                  </h3>
                  <p className="text-xs text-stone-500 capitalize mt-0.5">{selectedReportEmp.rol} • {selectedReportEmp.activo ? 'Activo en taller' : 'Inactivo'}</p>
                </div>
                <button type="button" onClick={() => setSelectedReportEmp(null)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Carga Activa actual</p>
                    <p className="text-2xl font-black text-amber-800 mt-1">{stats.activePieces} <span className="text-xs font-normal text-stone-500">piezas</span></p>
                  </div>
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Completadas en período</p>
                    <p className="text-2xl font-black text-stone-900 mt-1">{stats.completedCount} <span className="text-xs font-normal text-stone-500">piezas</span></p>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200">
                    <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Nómina del Período</p>
                    <p className="text-2xl font-black text-teal-800 font-mono mt-1">${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Carga Activa */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200 pb-2">
                      <Briefcase size={13} className="text-amber-600" /> Trabajos Activos asignados ({activeWOs.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {activeWOs.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-8">Sin trabajos activos en este momento</p>
                      ) : activeWOs.map(wo => (
                        <div key={wo.id} className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-stone-900">{wo.producto_nombre}</p>
                            <p className="text-[10px] text-stone-500">Orden #{wo.orden_id} • {wo.acabado_nombre}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full capitalize border border-amber-200">{wo.estatus}</span>
                            <p className="text-[10px] text-stone-600 font-bold mt-1">{wo.cantidad} pza(s)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prenómina */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200 pb-2">
                      <CheckCircle2 size={13} className="text-teal-600" /> Piezas Terminadas en período ({completedWOs.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {completedWOs.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-8">Sin piezas terminadas en el rango de fechas</p>
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
                          <div key={wo.id} className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-stone-900">{wo.producto_nombre}</p>
                              <p className="text-[10px] text-stone-500">Orden #{wo.orden_id} • {detalleRol} • {wo.fecha_termino}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-teal-700 font-mono">${monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
                              <p className="text-[10px] text-stone-500 mt-0.5">{wo.cantidad} pza(s)</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-200 flex justify-end bg-stone-50 rounded-b-3xl">
                <button type="button" onClick={() => setSelectedReportEmp(null)} className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-200 text-stone-800 hover:bg-stone-300">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
