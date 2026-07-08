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
    productos, materiaPrima, resetDemo
  } = useDecor();
  
  const [tab, setTab] = useState<ActiveTab>('acabados');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [generando, setGenerando] = useState(false);

  const generarDatosSimulacion = () => {
    setGenerando(true);
    setTimeout(() => {
      try {
        const activeProducts = productos.length > 0 ? productos : [];
        if (activeProducts.length === 0) {
          alert('No hay productos en el catálogo para simular ventas.');
          setGenerando(false);
          return;
        }
        
        const activeClientes = clientes.length > 0 ? clientes : [];
        const activeTiendas = tiendas.length > 0 ? tiendas : [];
        const activeEmpleados = [
          'Víctor Manuel López', 
          'José García Ramírez', 
          'Miguel Hernández Soto', 
          'Carlos Martínez Ruiz', 
          'Roberto Sánchez Díaz', 
          'Fernando Torres Luna', 
          'Alberto Morales Cruz', 
          'Pedro Jiménez Flores'
        ];

        const generatedPedidos = [];
        const generatedWorkOrders = [];
        const generatedTerminados = [];
        const generatedVentas = [];

        const hoy = new Date();
        
        // Simular 400 pedidos
        for (let i = 0; i < 400; i++) {
          const diasAtras = Math.floor(Math.random() * 365);
          const fecha = new Date();
          fecha.setDate(hoy.getDate() - diasAtras);
          const fechaCortaStr = fecha.toISOString().split('T')[0];

          const pId = 2000 + i;
          const cli = activeClientes[Math.floor(Math.random() * activeClientes.length)] || { id: 1, nombre: 'Distribuidora Decor' };
          
          const qtyItems = Math.floor(Math.random() * 3) + 1;
          const items = [];
          let total = 0;
          let totalItems = 0;

          for (let j = 0; j < qtyItems; j++) {
            const prod = activeProducts[Math.floor(Math.random() * activeProducts.length)];
            const qty = Math.floor(Math.random() * 4) + 1;
            const price = Object.values(prod.prices)[0] || 150;
            const sub = qty * price;
            total += sub;
            totalItems += qty;

            const acabado = acabados[Math.floor(Math.random() * acabados.length)] || 'Santa Fe';

            items.push({
              id: Date.now() + Math.random(),
              producto_id: prod.id,
              producto_nombre: prod.name,
              codigo_sku: prod.sku,
              cantidad: qty,
              precio_unitario: price,
              subtotal: sub,
              tipo_pedido: 'linea',
              acabado: acabado
            });

            const isCompleted = diasAtras > 30;
            const woEstatus = isCompleted ? 'listo_embarque' : ['pendiente', 'en_produccion', 'acabados'][Math.floor(Math.random() * 3)];
            
            const carpinteroName = activeEmpleados[Math.floor(Math.random() * 4)];
            const pintorName = activeEmpleados[4 + Math.floor(Math.random() * 2)];
            
            const costUnitario = prod.costo_produccion || Math.round(price * 0.25);

            const wo: any = {
              id: Date.now() + Math.random() + Math.random(),
              orden_id: pId,
              producto_id: prod.id,
              producto_nombre: prod.name,
              codigo_sku: prod.sku,
              cantidad: qty,
              estatus: woEstatus,
              fecha_asignacion: fechaCortaStr,
              acabado_nombre: acabado,
              cliente_nombre: cli.nombre,
            };

            if (woEstatus !== 'pendiente') {
              wo.empleado_id = 2; 
              wo.empleado_nombre = carpinteroName;
              wo.costo_mano_obra_unitario = costUnitario;
              wo.costo_mano_obra = costUnitario * qty;
            }

            if (woEstatus === 'acabados' || woEstatus === 'listo_embarque') {
              wo.empleado_acabado_id = 5; 
              wo.empleado_acabado_nombre = pintorName;
              wo.costo_acabado_unitario = 320;
              wo.costo_acabado = 320 * qty;
            }

            if (woEstatus === 'listo_embarque') {
              const diasFabricacion = Math.floor(Math.random() * 5) + 2;
              const fechaTermino = new Date(fecha);
              fechaTermino.setDate(fecha.getDate() + diasFabricacion);
              wo.fecha_termino = fechaTermino.toISOString().split('T')[0];

              for (let k = 0; k < qty; k++) {
                generatedTerminados.push({
                  id: Date.now() + Math.random(),
                  qr_code: `DCR-${fechaTermino.getTime()}-${wo.id}-${k}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                  producto_id: prod.id,
                  producto_nombre: prod.name,
                  codigo_sku: prod.sku,
                  orden_id: pId,
                  cliente_nombre: cli.nombre,
                  acabado: acabado,
                  fecha_listo: wo.fecha_termino,
                  precio_estimado: price
                });
              }
            }

            generatedWorkOrders.push(wo);
          }

          generatedPedidos.push({
            id: pId,
            fecha_creacion: fechaCortaStr,
            estatus: diasAtras > 30 ? 'entregado' : 'produccion',
            tipo_orden: 'cliente_mayorista',
            cliente_id: cli.id,
            cliente_nombre: cli.nombre,
            cliente_email: cli.email || 'mayorista@decor.com',
            total: total,
            total_items: totalItems,
            items: items,
            notas: 'Simulado para stress test'
          });
        }

        // Simular 1500 ventas POS
        for (let i = 0; i < 1500; i++) {
          const diasAtras = Math.floor(Math.random() * 365);
          const fecha = new Date();
          fecha.setDate(hoy.getDate() - diasAtras);
          const fechaStr = fecha.toISOString();

          const tienda = activeTiendas[Math.floor(Math.random() * activeTiendas.length)] || { id: 1, nombre: 'Sucursal Norte' };
          const qtyItems = Math.floor(Math.random() * 2) + 1;
          const items = [];
          let total = 0;

          for (let j = 0; j < qtyItems; j++) {
            const prod = activeProducts[Math.floor(Math.random() * activeProducts.length)];
            const qty = Math.floor(Math.random() * 2) + 1;
            const price = Object.values(prod.prices)[0] || 150;
            const sub = qty * price;
            total += sub;

            items.push({
              id: Date.now() + Math.random(),
              producto_id: prod.id,
              producto_nombre: prod.name,
              codigo_sku: prod.sku,
              qr_code: `DCR-POS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              precio_unitario: price
            });
          }

          generatedVentas.push({
            id: 3000 + i,
            tienda_id: tienda.id,
            fecha_venta: fechaStr,
            total: total,
            items: items
          });
        }

        // NOTA: Los datos operativos ahora vienen del backend API.
        // La simulación local ya no aplica. Usar el backend para insertar datos reales.
        alert(`⚠️ Simulación deshabilitada.\n\nLos datos de producción ahora se gestionan desde la base de datos en vivo.\nUsa los módulos de Pedidos y Producción para crear órdenes reales.`);
        // window.location.href = window.location.pathname.startsWith('/decor') ? '/decor/' : '/';
      } catch (err) {
        alert('Error en simulación: ' + err);
      } finally {
        setGenerando(false);
      }
    }, 100);
  };
  
  // Form states
  const [acabadoName, setAcabadoName] = useState('');
  const [tiendaForm, setTiendaForm] = useState({ nombre: '', ciudad: '', direccion: '', telefono: '', activa: true });
  const [clienteForm, setClienteForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', ciudad: '', limite_credito: 0, saldo_pendiente: 0, tipo: 'Mayorista', credito_activo: true });



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
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Versión</span><span className="text-zinc-300 font-mono">v1.0.0 — Producción</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Modo</span><span className="text-amber-400 font-bold">Local (Producción)</span></div>
              <div className="flex justify-between py-1 border-b border-zinc-800/30"><span className="text-zinc-500">Productos</span><span className="text-zinc-300 font-bold">{productos.length}</span></div>
              <div className="flex justify-between py-1"><span className="text-zinc-500">Materias Primas</span><span className="text-zinc-300 font-bold">{materiaPrima.length} tipos</span></div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-4 border-amber-500/10">
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Pruebas de Estrés y Rendimiento</h3>
              <p className="text-[10px] text-zinc-500 mt-1">Genera un volumen masivo de datos para probar la fluidez del cliente frente a 1 año de operación real simulada.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={generarDatosSimulacion}
                disabled={generando}
                className="btn-primary text-xs py-2 w-full justify-center disabled:opacity-50"
              >
                {generando ? 'Generando datos...' : '⚡ Simular 1 Año de Operación'}
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Restablecer todos los datos al estado demo original? Esto borrará las ventas y órdenes simuladas.')) {
                    resetDemo();
                    window.location.href = window.location.pathname.startsWith('/decor') ? '/decor/' : '/';
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={12} /> Restablecer Demo de Fábrica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
