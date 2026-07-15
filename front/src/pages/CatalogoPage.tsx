import { useState, useMemo } from 'react';
import { Search, Grid3X3, List, X, Save, Ruler, Upload, Printer, Plus } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';

export default function CatalogoPage() {
  const { productos, acabados, clientes, updateProducto, addProducto, categorias } = useDecor();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [finishFilter, setFinishFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Printing states
  const [printBatch, setPrintBatch] = useState<{ name: string, sku: string, count: number } | null>(null);
  const [printCount, setPrintCount] = useState<number>(1);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Add Product Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<any>({
    name: '',
    sku: '',
    type: 'Armories',
    costo_produccion: 0,
    dimensions: { width: 0, height: 0, depth: 0 },
    finishes: ['Natural'],
    prices: { 'Publico': 0 },
    image_url: null
  });

  const handleAddImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setAddForm((prev: any) => ({ ...prev, image_url: dataUrl }));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = async () => {
    if (!addForm.name || !addForm.sku) {
      alert('Por favor completa los campos de Nombre y SKU.');
      return;
    }
    const success = await addProducto(addForm);
    if (success) {
      setShowAddModal(false);
      setAddForm({
        name: '',
        sku: '',
        type: 'Armories',
        costo_produccion: 0,
        dimensions: { width: 0, height: 0, depth: 0 },
        finishes: ['Natural'],
        prices: { 'Publico': 0 },
        image_url: null
      });
    } else {
      alert('Error al guardar el producto.');
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      if (selectedId) updateProducto(selectedId, editForm);
      setIsEditing(false);
    } else {
      setEditForm(JSON.parse(JSON.stringify(productos.find(p => p.id === selectedId) || {})));
      setIsEditing(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setEditForm((prev: any) => ({ ...prev, image_url: dataUrl }));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const filtered = useMemo(() => productos.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && p.type !== catFilter) return false;
    if (finishFilter && !p.finishes?.includes(finishFilter)) return false;
    return true;
  }), [productos, search, catFilter, finishFilter]);

  const selected = selectedId ? productos.find(p => p.id === selectedId) : null;
  const types = useMemo(() => [...new Set(productos.map(p => p.type))].sort(), [productos]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-dark pl-10" placeholder="Buscar por nombre o SKU..." />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"><X size={14} /></button>}
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-dark w-full sm:w-48">
          <option value="" className="bg-zinc-900">Todas las categorías</option>
          {types.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
        </select>
        <select value={finishFilter} onChange={e => setFinishFilter(e.target.value)} className="input-dark w-full sm:w-40">
          <option value="" className="bg-zinc-900">Todos los acabados</option>
          {acabados.map(a => <option key={a} value={a} className="bg-zinc-900">{a}</option>)}
        </select>
        <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="btn-ghost shrink-0">{view === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}</button>
        <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"><Plus size={14} /> Nuevo Producto</button>
      </div>

      <p className="text-xs text-zinc-500">{filtered.length} productos</p>

      {/* Grid view */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.slice(0, 60).map(prod => (
            <button key={prod.id} onClick={() => setSelectedId(prod.id)} className="glass-card p-4 text-left hover:border-amber-500/20 transition-all space-y-2">
              <div className="w-full aspect-square bg-zinc-800/50 rounded-lg flex items-center justify-center overflow-hidden text-3xl">
                {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain" /> : '🪑'}
              </div>
              <p className="text-xs font-bold text-zinc-200 leading-tight truncate">{prod.name}</p>
              <p className="text-[10px] text-zinc-500">{prod.type}</p>
              {prod.dimensions && (
                <p className="text-[9px] text-zinc-600 flex items-center gap-0.5"><Ruler size={8} /> {prod.dimensions.width}×{prod.dimensions.height}×{prod.dimensions.depth}″</p>
              )}
              <div className="flex flex-wrap gap-0.5">
                {prod.finishes?.slice(0, 2).map(f => (
                  <span key={f} className="text-[8px] bg-amber-500/10 text-amber-400 px-1 py-0 rounded">{f}</span>
                ))}
                {(prod.finishes?.length || 0) > 2 && <span className="text-[8px] text-zinc-600">+{prod.finishes!.length - 2}</span>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-800/30 border-b border-zinc-700/30 text-[10px] font-semibold text-zinc-500 uppercase">
            <div className="col-span-4">Producto</div><div className="col-span-2">Categoría</div><div className="col-span-2">Medidas</div><div className="col-span-2">Acabados</div><div className="col-span-2 text-right">SKU</div>
          </div>
          {filtered.slice(0, 80).map(prod => (
            <button key={prod.id} onClick={() => setSelectedId(prod.id)} className="w-full grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors items-center text-left">
              <div className="col-span-4 text-xs font-semibold text-zinc-200 truncate">{prod.name}</div>
              <div className="col-span-2 text-xs text-zinc-500">{prod.type}</div>
              <div className="col-span-2 text-[10px] text-zinc-500">{prod.dimensions ? `${prod.dimensions.width}×${prod.dimensions.height}×${prod.dimensions.depth}″` : '—'}</div>
              <div className="col-span-2 text-[10px] text-amber-400 truncate">{prod.finishes?.slice(0, 2).join(', ')}</div>
              <div className="col-span-2 text-right text-[10px] font-mono text-zinc-600">{prod.sku}</div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center sticky top-0 bg-zinc-800/90 backdrop-blur-sm">
              <h3 className="font-bold text-zinc-100 truncate pr-4">
                {isEditing ? <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="input-dark text-lg font-bold py-1 px-2 w-full" /> : selected.name}
              </h3>
              <div className="flex gap-2">
                <button onClick={handleEditToggle} className="btn-primary shrink-0 py-1 px-3 text-xs">
                  {isEditing ? <><Save size={14} /> Guardar</> : 'Editar'}
                </button>
                <button onClick={() => { setSelectedId(null); setIsEditing(false); }} className="text-zinc-500 hover:text-zinc-300 shrink-0"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="w-full aspect-video bg-zinc-800/50 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group">
                {(isEditing ? editForm.image_url : selected.image_url) ? (
                  <img src={isEditing ? editForm.image_url : selected.image_url} alt={selected.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-6xl">🪑</span>
                )}
                {isEditing && (
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="text-zinc-200 text-sm font-semibold bg-zinc-800/80 px-4 py-2 rounded-lg flex items-center gap-2">
                      <Upload size={16} /> Cambiar Foto
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-zinc-800/40 p-3 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] mb-1">SKU</span>
                  {isEditing ? <input type="text" value={editForm.sku} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} className="input-dark py-1 text-xs w-full" /> : <span className="font-mono text-zinc-300">{selected.sku}</span>}
                </div>
                <div className="bg-zinc-800/40 p-3 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] mb-1">Categoría</span>
                  {isEditing ? (
                    <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className="input-dark py-1 text-xs w-full">
                      {types.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                    </select>
                  ) : <span className="text-zinc-300">{selected.type}</span>}
                </div>
                <div className="bg-zinc-800/40 p-3 rounded-lg">
                  <span className="text-zinc-500 block text-[10px] mb-1">Costo Prod. ($)</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      value={editForm.costo_produccion ?? ''} 
                      onChange={e => setEditForm({ ...editForm, costo_produccion: Number(e.target.value) })} 
                      onFocus={e => e.target.select()}
                      className="input-dark py-1 text-xs w-full font-bold text-amber-400" 
                      min="0"
                    />
                  ) : (
                    <span className="font-bold text-amber-400">
                      {selected.costo_produccion ? `$${selected.costo_produccion}` : '⚠️ Sin asignar'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-zinc-800/40 p-3 rounded-lg">
                <span className="text-zinc-500 text-[10px] block mb-1">Dimensiones (pulgadas)</span>
                {isEditing ? (
                  <div className="flex gap-2 text-sm font-bold text-zinc-200">
                    <div className="flex items-center gap-1">An: <input type="number" value={editForm.dimensions?.width || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, width: Number(e.target.value) } })} className="input-dark w-16 py-1 text-xs" />″</div>
                    <div className="flex items-center gap-1">Al: <input type="number" value={editForm.dimensions?.height || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, height: Number(e.target.value) } })} className="input-dark w-16 py-1 text-xs" />″</div>
                    <div className="flex items-center gap-1">Fo: <input type="number" value={editForm.dimensions?.depth || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, depth: Number(e.target.value) } })} className="input-dark w-16 py-1 text-xs" />″</div>
                  </div>
                ) : (
                  selected.dimensions && (
                    <div className="flex gap-4 text-sm font-bold text-zinc-200">
                      <span>Ancho: {selected.dimensions.width}″</span>
                      <span>Alto: {selected.dimensions.height}″</span>
                      <span>Fondo: {selected.dimensions.depth}″</span>
                    </div>
                  )
                )}
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] block mb-1">Acabados Disponibles</span>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {acabados.map(a => (
                      <label key={a} className="flex items-center gap-1 text-xs text-zinc-300 cursor-pointer">
                        <input type="checkbox" checked={editForm.finishes?.includes(a)} onChange={e => {
                          const newFinishes = e.target.checked ? [...(editForm.finishes || []), a] : (editForm.finishes || []).filter((f: string) => f !== a);
                          setEditForm({ ...editForm, finishes: newFinishes });
                        }} className="accent-amber-500" />
                        {a}
                      </label>
                    ))}
                  </div>
                ) : (
                  selected.finishes && (
                    <div className="flex flex-wrap gap-1.5">{selected.finishes.map(f => <span key={f} className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">{f}</span>)}</div>
                  )
                )}
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] block mb-2">Precios por Cliente</span>
                <div className="space-y-1">
                  {isEditing ? (
                    clientes.map(cli => (
                      <div key={cli.nombre} className="flex justify-between items-center bg-zinc-800/40 px-3 py-2 rounded-lg gap-2">
                        <span className="text-xs text-zinc-400 flex-1 truncate">{cli.nombre}</span>
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                          <input type="number" value={editForm.prices?.[cli.nombre] || 0} onChange={e => setEditForm({ ...editForm, prices: { ...editForm.prices, [cli.nombre]: Number(e.target.value) } })} className="input-dark w-full pl-6 py-1 text-xs text-right" />
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(selected.prices).map(([cli, price]) => (
                      <div key={cli} className="flex justify-between bg-zinc-800/40 px-3 py-2 rounded-lg">
                        <span className="text-xs text-zinc-400">{cli}</span>
                        <span className="text-xs font-bold text-zinc-200">${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="border-t border-zinc-700/50 pt-4 space-y-3">
                  <span className="text-zinc-500 text-[10px] block font-semibold uppercase tracking-wider">Etiquetas de Catálogo</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-zinc-800/40 px-3 py-2 rounded-lg border border-zinc-700/30 flex-1">
                      <span className="text-xs text-zinc-500 font-medium">Cantidad:</span>
                      <input 
                        type="number" 
                        value={printCount} 
                        onChange={e => setPrintCount(Math.max(1, Number(e.target.value)))}
                        className="input-dark w-16 text-center py-0.5 text-xs bg-transparent border-none focus:outline-none" 
                        min="1"
                      />
                    </div>
                    <button 
                      onClick={() => setPrintBatch({ name: selected.name, sku: selected.sku, count: printCount })}
                      className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <Printer size={14} /> Imprimir {printCount} Etiquetas
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Print Batch Modal */}
      {printBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-zinc-700/50 flex justify-between items-center bg-zinc-800/90 rounded-t-2xl">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Printer size={18} className="text-amber-400" /> Imprimir Etiquetas de Catálogo: {printBatch.name}
              </h3>
              <button onClick={() => setPrintBatch(null)} className="text-zinc-500 hover:text-zinc-300">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: printBatch.count }).map((_, idx) => (
                  <QRLabel 
                    key={idx} 
                    qrCode={printBatch.sku} 
                    productoNombre={printBatch.name} 
                    ordenId={0} 
                    clienteNombre="MUESTRARIO CATÁLOGO" 
                    acabado="Varios" 
                    size={110} 
                    showPrint={false}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-700/50 flex justify-end gap-3 bg-zinc-800/90 rounded-b-2xl">
              <button onClick={() => setPrintBatch(null)} className="btn-ghost">Cancelar</button>
              <button onClick={() => window.print()} className="btn-primary flex items-center gap-1.5">
                <Printer size={16} /> Imprimir {printBatch.count} Etiquetas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in">
            <div className="px-6 py-4 border-b border-zinc-700/50 flex justify-between items-center sticky top-0 bg-zinc-800/90 backdrop-blur-sm z-10">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Plus size={18} className="text-amber-400" /> Registrar Nuevo Producto
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Image upload */}
              <div className="w-full aspect-video bg-zinc-800/50 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group border border-dashed border-zinc-700">
                {addForm.image_url ? (
                  <img src={addForm.image_url} alt="Vista previa" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-4xl text-zinc-600">🪑</span>
                )}
                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="text-zinc-200 text-sm font-semibold bg-zinc-800/80 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Upload size={16} /> Subir Imagen/Diagrama
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAddImageUpload} />
                </label>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Nombre del Producto</label>
                  <input 
                    type="text" 
                    value={addForm.name} 
                    onChange={e => setAddForm({ ...addForm, name: e.target.value })} 
                    className="input-dark w-full text-sm py-1.5" 
                    placeholder="Ej. Trinchador Rústico 2 Puertas"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">SKU / Código</label>
                    <input 
                      type="text" 
                      value={addForm.sku} 
                      onChange={e => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })} 
                      className="input-dark w-full text-sm py-1.5 font-mono" 
                      placeholder="Ej. TRI-02"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Categoría</label>
                    <select 
                      value={addForm.type} 
                      onChange={e => setAddForm({ ...addForm, type: e.target.value })} 
                      className="input-dark w-full text-sm py-1.5"
                    >
                      {categorias.map(c => <option key={c.id} value={c.nombre} className="bg-zinc-900">{c.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Precio Venta Base (Público)</label>
                    <input 
                      type="number" 
                      value={addForm.prices['Publico'] || ''} 
                      onChange={e => setAddForm({ ...addForm, prices: { ...addForm.prices, 'Publico': Number(e.target.value) } })} 
                      className="input-dark w-full text-sm py-1.5" 
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Costo Producción (Taller)</label>
                    <input 
                      type="number" 
                      value={addForm.costo_produccion || ''} 
                      onChange={e => setAddForm({ ...addForm, costo_produccion: Number(e.target.value) })} 
                      className="input-dark w-full text-sm py-1.5" 
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                </div>

                <div className="bg-zinc-800/45 p-3 rounded-lg border border-zinc-700/30">
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-2">Dimensiones (pulgadas)</label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <span>Ancho:</span>
                      <input 
                        type="number" 
                        value={addForm.dimensions.width || ''} 
                        onChange={e => setAddForm({ ...addForm, dimensions: { ...addForm.dimensions, width: Number(e.target.value) } })} 
                        className="input-dark w-16 text-center py-1 text-xs" 
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <span>Alto:</span>
                      <input 
                        type="number" 
                        value={addForm.dimensions.height || ''} 
                        onChange={e => setAddForm({ ...addForm, dimensions: { ...addForm.dimensions, height: Number(e.target.value) } })} 
                        className="input-dark w-16 text-center py-1 text-xs" 
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <span>Fondo:</span>
                      <input 
                        type="number" 
                        value={addForm.dimensions.depth || ''} 
                        onChange={e => setAddForm({ ...addForm, dimensions: { ...addForm.dimensions, depth: Number(e.target.value) } })} 
                        className="input-dark w-16 text-center py-1 text-xs" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Acabados Disponibles</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 bg-zinc-800/25 p-3 rounded-lg border border-zinc-700/20">
                    {acabados.map(a => (
                      <label key={a} className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={addForm.finishes.includes(a)} 
                          onChange={e => {
                            const newFinishes = e.target.checked 
                              ? [...addForm.finishes, a] 
                              : addForm.finishes.filter((f: string) => f !== a);
                            setAddForm({ ...addForm, finishes: newFinishes });
                          }} 
                          className="accent-amber-500 rounded border-zinc-700" 
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 font-semibold uppercase block mb-1">Precios Especiales por Cliente</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {clientes.map(cli => (
                      <div key={cli.nombre} className="flex justify-between items-center bg-zinc-800/40 px-3 py-1.5 rounded-lg gap-2 border border-zinc-700/10">
                        <span className="text-xs text-zinc-400 flex-1 truncate">{cli.nombre}</span>
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                          <input 
                            type="number" 
                            value={addForm.prices[cli.nombre] || ''} 
                            onChange={e => setAddForm({ 
                              ...addForm, 
                              prices: { ...addForm.prices, [cli.nombre]: Number(e.target.value) } 
                            })} 
                            className="input-dark w-full pl-6 py-0.5 text-xs text-right" 
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-700/50 flex justify-end gap-3 bg-zinc-800/90 rounded-b-2xl">
              <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancelar</button>
              <button onClick={handleCreateProduct} className="btn-primary flex items-center gap-1.5">
                <Save size={16} /> Registrar Producto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
