import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileText, Search, RefreshCw, Download, Trash2, 
  AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check,
  Calendar, Lock, ArrowUpDown
} from 'lucide-react';
import { useDecor } from '../store/StoreContext';

export interface SystemLog {
  id: number;
  nivel: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  modulo: string;
  accion: string;
  descripcion: string;
  detalles: any;
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  usuario_rol: string | null;
  ip_origen: string | null;
  creado_en: string;
}

interface LogStats {
  total_hoy: number;
  errores_hoy: number;
  warnings_hoy: number;
  info_hoy: number;
}

const MODULOS = ['TODOS', 'AUTH', 'POS', 'PEDIDOS', 'PRODUCCION', 'INVENTARIO', 'CATALOGO', 'SISTEMA'];
const NIVELES = ['TODOS', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

export default function LogsPage() {
  const { currentUser } = useDecor();

  // Estados de consulta y paginación
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(50);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filtros
  const [nivel, setNivel] = useState('TODOS');
  const [modulo, setModulo] = useState('TODOS');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [search, setSearch] = useState('');

  // Estadísticas
  const [stats, setStats] = useState<LogStats>({
    total_hoy: 0,
    errores_hoy: 0,
    warnings_hoy: 0,
    info_hoy: 0,
  });

  // UI helpers
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filaExpandida, setFilaExpandida] = useState<number | null>(null);
  const [copiadoId, setCopiadoId] = useState<number | null>(null);

  // Modal de purga
  const [modalPurga, setModalPurga] = useState(false);
  const [diasPurga, setDiasPurga] = useState(60);
  const [purgando, setPurgando] = useState(false);
  const [mensajePurga, setMensajePurga] = useState<string | null>(null);

  // Función de consulta a la API
  const fetchLogs = useCallback(async () => {
    if (!currentUser || currentUser.rol !== 'admin') return;
    setLoading(true);

    try {
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiBase = isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost/sistema_decor');

      const params = new URLSearchParams({
        page: pagina.toString(),
        limit: limite.toString(),
      });

      if (nivel !== 'TODOS') params.append('nivel', nivel);
      if (modulo !== 'TODOS') params.append('modulo', modulo);
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`${apiBase}/api/admin/logs.php?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.data) {
          setLogs(data.data.logs || []);
          setTotalLogs(data.data.paginacion?.total || 0);
          setTotalPaginas(data.data.paginacion?.total_paginas || 1);
          if (data.data.estadisticas) {
            setStats(data.data.estadisticas);
          }
        }
      }
    } catch (e) {
      console.error('Error al cargar logs:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser, pagina, limite, nivel, modulo, fechaInicio, fechaFin, search]);

  // Ejecutar carga inicial y ante cambios de filtro
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh cada 30 segundos si está activo
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  // Exportar a CSV
  const handleExportarCsv = () => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const apiBase = isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost/sistema_decor');

    const params = new URLSearchParams({ format: 'csv' });
    if (nivel !== 'TODOS') params.append('nivel', nivel);
    if (modulo !== 'TODOS') params.append('modulo', modulo);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (search.trim()) params.append('search', search.trim());

    window.open(`${apiBase}/api/admin/logs.php?${params.toString()}`, '_blank');
  };

  // Purgar logs antiguos
  const handlePurgar = async () => {
    setPurgando(true);
    setMensajePurga(null);

    try {
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiBase = isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost/sistema_decor');

      const res = await fetch(`${apiBase}/api/admin/logs.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purgar', dias: diasPurga }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMensajePurga(`Depuración exitosa: ${data.data?.registros_eliminados || 0} registros eliminados.`);
        fetchLogs();
        setTimeout(() => {
          setModalPurga(false);
          setMensajePurga(null);
        }, 2000);
      } else {
        setMensajePurga(`Error: ${data.error || 'No se pudo purgar'}`);
      }
    } catch (e: any) {
      setMensajePurga(`Error de conexión: ${e.message}`);
    } finally {
      setPurgando(false);
    }
  };

  // Copiar JSON de detalles
  const copiarDetalles = (id: number, detalles: any) => {
    navigator.clipboard.writeText(JSON.stringify(detalles, null, 2));
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  // Guard de seguridad: perfil admin requerido
  if (!currentUser || currentUser.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-stone-900 mb-2">Acceso Restringido</h2>
        <p className="text-xs text-stone-500 max-w-md font-medium">
          El módulo de Auditoría y Logs del Sistema contiene trazabilidad sensible y está reservado exclusivamente para usuarios con perfil de <strong>Administrador</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left animate-fade-in">
      {/* ── Encabezado Principal ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-stone-200 p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center shadow-xs">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-stone-900">Auditoría y Logs del Sistema</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Admin Only
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Trazabilidad operativa en tiempo real, eventos de caja, inicios de sesión y monitoreo de excepciones.
            </p>
          </div>
        </div>

        {/* Acciones globales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              autoRefresh 
                ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs' 
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
            title="Actualización automática cada 30 segundos"
          >
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin text-[#0d9488]' : ''} />
            <span>{autoRefresh ? 'Auto (30s)' : 'Auto: Off'}</span>
          </button>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleExportarCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Descargar datos en formato CSV para Excel o Auditoría"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setModalPurga(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Depurar logs antiguos para liberar espacio"
          >
            <Trash2 size={13} />
            <span>Purgar</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards de Actividad de Hoy ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Eventos Hoy</span>
            <div className="w-7 h-7 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center">
              <FileText size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">{stats.total_hoy.toLocaleString('es-MX')}</p>
          <span className="text-[10px] text-stone-400 font-medium">Operaciones registradas</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Errores Hoy</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <XCircle size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-800 mt-2">{stats.errores_hoy.toLocaleString('es-MX')}</p>
          <span className="text-[10px] text-rose-600 font-medium">Excepciones o fallos HTTP</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Advertencias</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-800 mt-2">{stats.warnings_hoy.toLocaleString('es-MX')}</p>
          <span className="text-[10px] text-amber-600 font-medium">Discrepancias o logins fallidos</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Operaciones OK</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-teal-800 mt-2">{stats.info_hoy.toLocaleString('es-MX')}</p>
          <span className="text-[10px] text-teal-700 font-medium">Ventas, turnos y producción</span>
        </div>
      </div>

      {/* ── Barra de Filtros Multicriterio ── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda libre */}
          <div className="lg:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPagina(1); }}
              placeholder="Buscar por usuario, acción o descripción..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]"
            />
          </div>

          {/* Filtro de Nivel */}
          <div>
            <select
              value={nivel}
              onChange={e => { setNivel(e.target.value); setPagina(1); }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
            >
              <option value="TODOS">Todos los Niveles</option>
              <option value="INFO">INFO (Operativo)</option>
              <option value="WARNING">WARNING (Alerta)</option>
              <option value="ERROR">ERROR (Fallo)</option>
              <option value="CRITICAL">CRITICAL (Crítico)</option>
            </select>
          </div>

          {/* Filtro de Módulo */}
          <div>
            <select
              value={modulo}
              onChange={e => { setModulo(e.target.value); setPagina(1); }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
            >
              {MODULOS.map(m => (
                <option key={m} value={m}>Módulo: {m}</option>
              ))}
            </select>
          </div>

          {/* Selector de límite */}
          <div>
            <select
              value={limite}
              onChange={e => { setLimite(Number(e.target.value)); setPagina(1); }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={200}>200 por página</option>
            </select>
          </div>
        </div>

        {/* Filtro de Rango de Fechas */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
              <Calendar size={13} /> Desde:
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => { setFechaInicio(e.target.value); setPagina(1); }}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-500">Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={e => { setFechaFin(e.target.value); setPagina(1); }}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800"
            />
          </div>

          {(fechaInicio || fechaFin || nivel !== 'TODOS' || modulo !== 'TODOS' || search) && (
            <button
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                setNivel('TODOS');
                setModulo('TODOS');
                setSearch('');
                setPagina(1);
              }}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Tabla de Logs ── */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[10px] font-black tracking-wider">
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-3">Nivel</th>
                <th className="py-3.5 px-3">Módulo</th>
                <th className="py-3.5 px-3">Acción</th>
                <th className="py-3.5 px-3">Usuario</th>
                <th className="py-3.5 px-4">Descripción</th>
                <th className="py-3.5 px-3 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0d9488]" />
                    <span>Cargando registros de auditoría...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    <FileText size={28} className="mx-auto mb-2 text-stone-300" />
                    <span>No se encontraron registros con los filtros seleccionados.</span>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const expandida = filaExpandida === log.id;

                  // Estilo de Nivel
                  let nivelBadge = 'bg-teal-50 text-teal-800 border-teal-200';
                  let nivelIcon = <Info size={12} />;
                  if (log.nivel === 'WARNING') {
                    nivelBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                    nivelIcon = <AlertTriangle size={12} />;
                  } else if (log.nivel === 'ERROR' || log.nivel === 'CRITICAL') {
                    nivelBadge = 'bg-rose-50 text-rose-800 border-rose-200';
                    nivelIcon = <XCircle size={12} />;
                  }

                  return (
                    <>
                      <tr 
                        key={log.id} 
                        className={`hover:bg-stone-50/80 transition-colors ${expandida ? 'bg-stone-50/90' : ''}`}
                      >
                        {/* Fecha */}
                        <td className="py-3 px-4 text-stone-500 whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.creado_en).toLocaleString('es-MX', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>

                        {/* Nivel */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${nivelBadge}`}>
                            {nivelIcon}
                            <span>{log.nivel}</span>
                          </span>
                        </td>

                        {/* Módulo */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-black uppercase text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                            {log.modulo}
                          </span>
                        </td>

                        {/* Acción */}
                        <td className="py-3 px-3 text-stone-900 font-bold whitespace-nowrap">
                          {log.accion}
                        </td>

                        {/* Usuario */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.usuario_nombre ? (
                            <div>
                              <p className="text-xs font-bold text-stone-900">{log.usuario_nombre}</p>
                              <p className="text-[10px] text-stone-400">{log.usuario_rol || log.usuario_email}</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">Sistema / Anónimo</span>
                          )}
                        </td>

                        {/* Descripción */}
                        <td className="py-3 px-4 text-stone-700 max-w-xs md:max-w-md truncate" title={log.descripcion}>
                          {log.descripcion || '—'}
                        </td>

                        {/* Ver detalles */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {log.detalles ? (
                            <button
                              onClick={() => setFilaExpandida(expandida ? null : log.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                expandida 
                                  ? 'bg-[#0d9488] text-white border-teal-700' 
                                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                              }`}
                              title={expandida ? 'Ocultar detalles' : 'Ver detalles JSON'}
                            >
                              {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <span className="text-[10px] text-stone-300 font-bold">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Fila expandida con JSON formateado */}
                      {expandida && log.detalles && (
                        <tr className="bg-stone-900 text-stone-100 animate-fade-in">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                                <div className="flex items-center gap-2 text-xs font-mono text-teal-400">
                                  <span>ID #{log.id}</span>
                                  <span>·</span>
                                  <span>IP: {log.ip_origen || 'No detectada'}</span>
                                  {log.usuario_email && (
                                    <>
                                      <span>·</span>
                                      <span>Email: {log.usuario_email}</span>
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => copiarDetalles(log.id, log.detalles)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded-md text-[10px] font-mono text-stone-300 transition-colors"
                                >
                                  {copiadoId === log.id ? <Check size={12} className="text-teal-400" /> : <Copy size={12} />}
                                  <span>{copiadoId === log.id ? '¡Copiado!' : 'Copiar JSON'}</span>
                                </button>
                              </div>

                              <pre className="p-3 bg-black/40 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-300 leading-relaxed max-h-60 scrollbar-thin">
                                {JSON.stringify(log.detalles, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Paginador ── */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 font-bold">
          <div>
            Mostrando {logs.length} de {totalLogs.toLocaleString('es-MX')} registros totales (Página {pagina} de {totalPaginas})
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white shadow-xs transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 bg-white border border-stone-200 rounded-xl font-mono">
              {pagina} / {totalPaginas}
            </span>

            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white shadow-xs transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Purga de Logs ── */}
      {modalPurga && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Depurar Logs del Sistema</h3>
                <p className="text-xs text-stone-500 font-medium">Mantenimiento y retención de almacenamiento</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 font-medium leading-relaxed">
              Esta acción eliminará de forma permanente los registros de auditoría más antiguos para optimizar el tamaño de la base de datos.
            </p>

            <div>
              <label className="text-[11px] font-bold text-stone-600 uppercase block mb-1">
                Conservar historial de los últimos:
              </label>
              <select
                value={diasPurga}
                onChange={e => setDiasPurga(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900"
              >
                <option value={30}>30 días (Eliminar anteriores a 1 mes)</option>
                <option value={60}>60 días (Eliminar anteriores a 2 meses)</option>
                <option value={90}>90 días (Eliminar anteriores a 3 meses)</option>
                <option value={180}>180 días (Eliminar anteriores a 6 meses)</option>
              </select>
            </div>

            {mensajePurga && (
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-800">
                {mensajePurga}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                disabled={purgando}
                onClick={() => setModalPurga(false)}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                disabled={purgando}
                onClick={handlePurgar}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                {purgando ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{purgando ? 'Purgando...' : 'Confirmar Depuración'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
