import { useState } from 'react';
import { Settings, Store, Users, Paintbrush, RotateCcw, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useDecor } from '../store/StoreContext';

type ActiveTab = 'acabados' | 'tiendas' | 'clientes' | 'sistema';

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
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
    resetDemo, productos, materiaPrima 
  } = useDecor();
  
  const [tab, setTab] = useState<ActiveTab>('acabados');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  
  // Form states
  const [acabadoName, setAcabadoName] = useState('');
  const [tiendaForm, setTiendaForm] = useState({ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true });
  const [clienteForm, setClienteForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', ciudad: '', limite_credito: 0, saldo_pendiente: 0, tipo: 'Mayorista', credito_activo: true });

  const handleReset = () => {
    if (confirm('¿Restaurar TODOS los datos de la demo al estado inicial? Esta acción no se puede deshacer.')) resetDemo();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAcabadoName('');
    setTiendaForm({ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true });
    setClienteForm({ nombre: '', email: '', telefono: '', direccion: '', ciudad: '', limite_credito: 0, saldo_pendiente: 0, tipo: 'Mayorista', credito_activo: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); cancelEdit(); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.key ? 'bg-amber-500/15 text-amber-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab === 'acabados' && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Paintbrush size={16} className="text-amber-400" /> Acabados</h3>
            {editingId !== 'new' && <button onClick={() => setEditingId('new')} className="btn-primary text-xs py-1.5"><Plus size={14} /> Nuevo</button>}
          </div>
          
          {editingId === 'new' && (
            <div className="flex gap-2 mb-4">
              <input autoFocus value={acabadoName} onChange={e => setAcabadoName(e.target.value)} className="input-dark flex-1" placeholder="Nombre del acabado..." onKeyDown={e => { if (e.key === 'Enter') { addAcabado(acabadoName); cancelEdit(); } }} />
              <button onClick={() => { addAcabado(acabadoName); cancelEdit(); }} className="btn-primary" disabled={!acabadoName.trim()}><Check size={16} /></button>
              <button onClick={cancelEdit} className="btn-ghost"><X size={16} /></button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {acabados.map((a, i) => (
              <div key={i} className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30 flex justify-between items-center group">
                {editingId === `edit-${a}` ? (
                  <input autoFocus value={acabadoName} onChange={e => setAcabadoName(e.target.value)} className="w-full bg-transparent outline-none text-xs text-amber-400" onBlur={() => { if (acabadoName.trim() && acabadoName !== a) updateAcabado(a, acabadoName); cancelEdit(); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                ) : (
                  <>
                    <span className="text-xs font-semibold text-zinc-200">{a}</span>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(`edit-${a}`); setAcabadoName(a); }} className="p-1 text-zinc-500 hover:text-amber-400"><Edit2 size={12} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar acabado ${a}?`)) deleteAcabado(a); }} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
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
            {editingId !== 'new' && <button onClick={() => setEditingId('new')} className="btn-primary text-xs py-1.5"><Plus size={14} /> Nueva Tienda</button>}
          </div>

          {(editingId === 'new' || typeof editingId === 'number') && (
            <div className="glass-card p-5 space-y-4 animate-fade-in border-amber-500/30">
              <h4 className="text-sm font-bold text-zinc-200">{editingId === 'new' ? 'Nueva Tienda' : 'Editar Tienda'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Nombre</label><input value={tiendaForm.nombre} onChange={e => setTiendaForm(p => ({ ...p, nombre: e.target.value }))} className="input-dark" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Ciudad</label><input value={tiendaForm.ciudad} onChange={e => setTiendaForm(p => ({ ...p, ciudad: e.target.value }))} className="input-dark" /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Dirección</label><input value={tiendaForm.direccion} onChange={e => setTiendaForm(p => ({ ...p, direccion: e.target.value }))} className="input-dark" /></div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={tiendaForm.activa} onChange={e => setTiendaForm(p => ({ ...p, activa: e.target.checked }))} className="accent-amber-500 w-4 h-4" />
                  <label className="text-xs text-zinc-300">Tienda Operativa</label>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={cancelEdit} className="btn-ghost text-xs">Cancelar</button>
                <button onClick={() => {
                  if (editingId === 'new') addTienda(tiendaForm);
                  else updateTienda(editingId as number, tiendaForm);
                  cancelEdit();
                }} className="btn-primary text-xs" disabled={!tiendaForm.nombre.trim()}>Guardar Tienda</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiendas.map(t => (
              <div key={t.id} className="glass-card p-5 space-y-2 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => { setEditingId(t.id); setTiendaForm(t); }} className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg"><Edit2 size={12} /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar ${t.nombre}?`)) deleteTienda(t.id); }} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg"><Trash2 size={12} /></button>
                </div>
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center"><Store size={24} /></div>
                <h3 className="text-sm font-bold text-zinc-100 text-center">{t.nombre}</h3>
                <p className="text-xs text-zinc-400 text-center">{t.ciudad}</p>
                <p className="text-[10px] text-zinc-500 text-center line-clamp-1" title={t.direccion}>{t.direccion}</p>
                <div className="text-center mt-2">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${t.activa ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{t.activa ? 'Operativa' : 'Cerrada'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Users size={16} className="text-amber-400" /> Clientes Mayoristas</h3>
            {editingId !== 'new' && <button onClick={() => setEditingId('new')} className="btn-primary text-xs py-1.5"><Plus size={14} /> Nuevo Cliente</button>}
          </div>

          {(editingId === 'new' || typeof editingId === 'number') && (
            <div className="glass-card p-5 space-y-4 animate-fade-in border-amber-500/30">
              <h4 className="text-sm font-bold text-zinc-200">{editingId === 'new' ? 'Nuevo Cliente' : 'Editar Cliente'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Nombre</label><input value={clienteForm.nombre} onChange={e => setClienteForm(p => ({ ...p, nombre: e.target.value }))} className="input-dark" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Email</label><input type="email" value={clienteForm.email} onChange={e => setClienteForm(p => ({ ...p, email: e.target.value }))} className="input-dark" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Teléfono</label><input value={clienteForm.telefono} onChange={e => setClienteForm(p => ({ ...p, telefono: e.target.value }))} className="input-dark" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Ciudad</label><input value={clienteForm.ciudad} onChange={e => setClienteForm(p => ({ ...p, ciudad: e.target.value }))} className="input-dark" /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Dirección</label><input value={clienteForm.direccion} onChange={e => setClienteForm(p => ({ ...p, direccion: e.target.value }))} className="input-dark" /></div>
                <div><label className="text-[10px] font-semibold text-zinc-500 uppercase mb-1 block">Límite Crédito ($)</label><input type="number" value={clienteForm.limite_credito || ''} onChange={e => setClienteForm(p => ({ ...p, limite_credito: Number(e.target.value) }))} className="input-dark" /></div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={cancelEdit} className="btn-ghost text-xs">Cancelar</button>
                <button onClick={() => {
                  if (editingId === 'new') addCliente(clienteForm);
                  else updateCliente(editingId as number, clienteForm);
                  cancelEdit();
                }} className="btn-primary text-xs" disabled={!clienteForm.nombre.trim()}>Guardar Cliente</button>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-zinc-800/20">
              {clientes.map(c => (
                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-3 hover:bg-zinc-800/20 transition-colors group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center text-sm font-bold">{c.nombre.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200">{c.nombre}</p>
                      <p className="text-[10px] text-zinc-500">{c.email} · {c.telefono} · {c.ciudad}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-200">Límite: ${c.limite_credito.toLocaleString('es-MX')}</p>
                      <p className="text-[10px] text-zinc-500">Pendiente: ${c.saldo_pendiente.toLocaleString('es-MX')}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => { setEditingId(c.id); setClienteForm(c); }} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => { if (confirm(`¿Eliminar cliente ${c.nombre}?`)) deleteCliente(c.id); }} className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {clientes.length === 0 && <p className="text-center text-sm text-zinc-500 py-6">No hay clientes registrados.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'sistema' && (
        <div className="space-y-4 max-w-md">
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-zinc-200">Información del Sistema</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Versión</span><span className="text-zinc-300 font-mono">Demo v3.1 — Configurador</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Modo</span><span className="text-amber-400 font-bold">Standalone (sin backend)</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Productos</span><span className="text-zinc-300 font-bold">{productos.length}</span></div>
              <div className="flex justify-between py-1"><span className="text-zinc-500">Materias Primas</span><span className="text-zinc-300 font-bold">{materiaPrima.length} tipos</span></div>
            </div>
          </div>
          <div className="glass-card p-5 space-y-3 border-red-500/20">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-2"><RotateCcw size={16} /> Zona de Peligro</h3>
            <p className="text-xs text-zinc-500">Restaurar todos los datos a su estado inicial. Se perderán órdenes, embarques y cambios de configuración de esta sesión.</p>
            <button onClick={handleReset} className="btn-danger w-full justify-center"><RotateCcw size={14} /> Restaurar Datos de Fábrica</button>
          </div>
        </div>
      )}
    </div>
  );
}
