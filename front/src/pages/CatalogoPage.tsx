import { useState, useMemo } from 'react';
import { 
  Search, Grid3X3, List, X, Save, Ruler, Upload, Printer, Plus, 
  Trash2, AlertTriangle, CheckCircle2, DollarSign, Package, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import QRLabel from '../components/QRLabel';

export default function CatalogoPage() {
  const { productos, acabados, clientes, crearProducto, actualizarProducto, eliminarProducto } = useDecor();
  
  // Filtros y Vistas
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [finishFilter, setFinishFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Impresión de etiquetas
  const [printBatch, setPrintBatch] = useState<{ name: string, sku: string, count: number } | null>(null);
  const [printCount, setPrintCount] = useState<number>(1);
  
  // Estados de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  // Estados de Nuevo Producto Modal
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  const initialNuevoForm = {
    nombre: '',
    sku: '',
    type: 'Sillas',
    origen: 'taller',
    es_pieza_unica: false,
    dimensions: { width: 0, height: 0, depth: 0 },
    finishes: [] as string[],
    precio_venta_base: 0,
    costo_produccion: 0,
    image_url: '',
    prices: {} as Record<string, number>,
  };
  const [nuevoForm, setNuevoForm] = useState(initialNuevoForm);

  // Lista de categorías únicas
  const types = useMemo(() => {
    const defaultTypes = ['Sillas', 'Mesas', 'Bancos', 'Camas', 'Cómodas', 'Escritorios', 'Libreros', 'Gabinetes', 'Cabeceras', 'Barras', 'Artesanías', 'Decoración', 'Otros'];
    const fromProds = productos.map(p => p.type).filter(Boolean);
    return Array.from(new Set([...defaultTypes, ...fromProds])).sort();
  }, [productos]);

  // Manejo de Fotos (Base64 optimizado)
  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
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
        callback(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setEditForm((prev: any) => ({ ...prev, image_url: dataUrl }));
      });
    }
  };

  const handleImageUploadNuevo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        setNuevoForm((prev) => ({ ...prev, image_url: dataUrl }));
      });
    }
  };

  // Guardar Cambios de Edición
  const handleGuardarEdicion = async () => {
    if (!selectedId) return;
    setGuardando(true);
    const res = await actualizarProducto(selectedId, {
      nombre: editForm.name,
      sku: editForm.sku,
      type: editForm.type,
      costo_produccion: editForm.costo_produccion,
      precio_venta_base: editForm.prices?.['Publico'] || editForm.prices?.['General'] || Object.values(editForm.prices || {})[0] || 0,
      dimensions: editForm.dimensions,
      finishes: editForm.finishes,
      image_url: editForm.image_url,
      prices: editForm.prices,
    });
    setGuardando(false);
    if (res.ok) {
      setIsEditing(false);
      setAlerta({ tipo: 'success', mensaje: 'Producto actualizado correctamente' });
      setTimeout(() => setAlerta(null), 3500);
    } else {
      setAlerta({ tipo: 'error', mensaje: res.message || 'Error al actualizar producto' });
    }
  };

  // Toggle Modo Edición
  const handleEditToggle = () => {
    if (isEditing) {
      handleGuardarEdicion();
    } else {
      const prod = productos.find(p => p.id === selectedId);
      if (prod) {
        setEditForm(JSON.parse(JSON.stringify(prod)));
        setIsEditing(true);
      }
    }
  };

  // Guardar Nuevo Producto
  const handleCrearProductoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.nombre.trim()) {
      setAlerta({ tipo: 'error', mensaje: 'El nombre del producto es obligatorio.' });
      return;
    }

    setGuardando(true);
    setAlerta(null);

    const payload = {
      nombre: nuevoForm.nombre.trim(),
      sku: nuevoForm.sku.trim() || undefined,
      type: nuevoForm.type,
      origen: nuevoForm.origen,
      es_pieza_unica: nuevoForm.es_pieza_unica,
      dimension_ancho: nuevoForm.dimensions.width,
      dimension_alto: nuevoForm.dimensions.height,
      dimension_largo: nuevoForm.dimensions.depth,
      precio_venta_base: Number(nuevoForm.precio_venta_base) || 0,
      precio_costo_base: Number(nuevoForm.costo_produccion) || 0,
      finishes: nuevoForm.finishes,
      image_url: nuevoForm.image_url || undefined,
      prices: {
        'Publico': Number(nuevoForm.precio_venta_base) || 0,
        ...nuevoForm.prices
      }
    };

    const res = await crearProducto(payload);
    setGuardando(false);

    if (res.ok) {
      setShowModalNuevo(false);
      setNuevoForm(initialNuevoForm);
      setAlerta({ tipo: 'success', mensaje: '¡Producto creado y agregado al catálogo con éxito!' });
      if (res.id) setSelectedId(res.id);
      setTimeout(() => setAlerta(null), 4000);
    } else {
      setAlerta({ tipo: 'error', mensaje: res.message || 'Error al crear producto' });
    }
  };

  // Eliminar o Dar de Baja Producto
  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas dar de baja o eliminar "${nombre}" del catálogo?`)) {
      return;
    }

    setGuardando(true);
    const res = await eliminarProducto(id);
    setGuardando(false);

    if (res.ok) {
      setSelectedId(null);
      setIsEditing(false);
      setAlerta({ 
        tipo: 'success', 
        mensaje: res.accion === 'desactivado'
          ? `El producto "${nombre}" fue desactivado del catálogo para proteger el historial contable.`
          : `El producto "${nombre}" fue eliminado permanentemente.`
      });
      setTimeout(() => setAlerta(null), 4500);
    } else {
      setAlerta({ tipo: 'error', mensaje: res.message || 'Error al procesar la baja del producto' });
    }
  };

  // Paginación de catálogo
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(60);

  // Filtrado de productos
  const filtered = useMemo(() => productos.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && p.type !== catFilter) return false;
    if (finishFilter && !p.finishes?.includes(finishFilter)) return false;
    return true;
  }), [productos, search, catFilter, finishFilter]);

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / (porPagina === -1 ? filtered.length || 1 : porPagina)));
  const paginatedProds = useMemo(() => {
    if (porPagina === -1) return filtered;
    const start = (paginaActual - 1) * porPagina;
    return filtered.slice(start, start + porPagina);
  }, [filtered, paginaActual, porPagina]);

  const selected = selectedId ? productos.find(p => p.id === selectedId) : null;

  return (
    <div className="space-y-5 text-left">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Package size={22} className="text-[#0d9488]" /> Catálogo de Productos y Diseños
          </h2>
          <p className="text-xs text-stone-500">
            Gestiona fichas técnicas, dimensiones, acabados, precios de lista y altas de nuevos modelos ({productos.length} modelos en catálogo).
          </p>
        </div>

        <button
          onClick={() => {
            setNuevoForm(initialNuevoForm);
            setShowModalNuevo(true);
          }}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} />
          <span>+ Nuevo Producto</span>
        </button>
      </div>

      {/* ALERTA GLOBAL DE FEEDBACK */}
      {alerta && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 shadow-md animate-scale-in ${
          alerta.tipo === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {alerta.tipo === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertTriangle size={18} className="text-rose-600" />}
            <span>{alerta.mensaje}</span>
          </div>
          <button onClick={() => setAlerta(null)} className="text-stone-400 hover:text-stone-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPaginaActual(1); }} 
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488] shadow-sm" 
            placeholder="Buscar por nombre o SKU (ej. DCR-0001)..." 
          />
          {search && (
            <button onClick={() => { setSearch(''); setPaginaActual(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select 
          value={catFilter} 
          onChange={e => { setCatFilter(e.target.value); setPaginaActual(1); }} 
          className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#0d9488] shadow-sm w-full sm:w-48"
        >
          <option value="">Todas las categorías</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select 
          value={finishFilter} 
          onChange={e => { setFinishFilter(e.target.value); setPaginaActual(1); }} 
          className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#0d9488] shadow-sm w-full sm:w-40"
        >
          <option value="">Todos los acabados</option>
          {acabados.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 shrink-0">
          <button 
            onClick={() => setView('grid')} 
            className={`p-2 rounded-lg text-xs font-bold transition-all ${view === 'grid' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
            title="Vista de Cuadrícula"
          >
            <Grid3X3 size={16} />
          </button>
          <button 
            onClick={() => setView('list')} 
            className={`p-2 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
            title="Vista de Lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-stone-500 font-medium">
        <span>Mostrando <strong className="text-stone-900">{paginatedProds.length}</strong> de <strong className="text-stone-900">{filtered.length}</strong> modelos filtrados ({productos.length} en catálogo completo)</span>
        
        <div className="flex items-center gap-2">
          <span>Mostrar:</span>
          <select
            value={porPagina}
            onChange={e => { setPorPagina(Number(e.target.value)); setPaginaActual(1); }}
            className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
          >
            <option value={30}>30 por pág</option>
            <option value={60}>60 por pág</option>
            <option value={120}>120 por pág</option>
            <option value={250}>250 por pág</option>
            <option value={-1}>Todos ({filtered.length})</option>
          </select>
        </div>
      </div>

      {/* VISTA CUADRÍCULA */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedProds.map(prod => (
            <button 
              key={prod.id} 
              onClick={() => { setSelectedId(prod.id); setIsEditing(false); }} 
              className="bg-white border border-stone-200 hover:border-teal-500/60 p-3.5 rounded-2xl text-left shadow-sm hover:shadow-md transition-all space-y-2.5 group"
            >
              <div className="w-full aspect-square bg-stone-50 rounded-xl flex items-center justify-center overflow-hidden text-3xl border border-stone-100 group-hover:scale-[1.02] transition-transform">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="opacity-80">🪑</span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900 leading-tight truncate group-hover:text-teal-700 transition-colors">
                  {prod.name}
                </p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-stone-500 font-mono">SKU: {prod.sku}</span>
                  <span className="font-black text-teal-700">
                    ${(prod.prices?.['Publico'] || Object.values(prod.prices || {})[0] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              {prod.dimensions && (
                <p className="text-[9px] text-stone-500 flex items-center gap-1 font-mono">
                  <Ruler size={10} className="text-stone-400" /> {prod.dimensions.width}×{prod.dimensions.height}×{prod.dimensions.depth}″
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {prod.finishes?.slice(0, 2).map(f => (
                  <span key={f} className="text-[8px] bg-teal-50 text-teal-800 border border-teal-200/60 px-1.5 py-0.5 rounded font-bold">{f}</span>
                ))}
                {(prod.finishes?.length || 0) > 2 && (
                  <span className="text-[8px] text-stone-400 font-bold">+{prod.finishes!.length - 2}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* VISTA LISTA / TABLA */
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-500 uppercase tracking-wider">
            <div className="col-span-4">Producto</div>
            <div className="col-span-2">Categoría</div>
            <div className="col-span-2">Medidas (Pulgadas)</div>
            <div className="col-span-2">Precio Base</div>
            <div className="col-span-2 text-right">SKU</div>
          </div>
          {paginatedProds.map(prod => (
            <button 
              key={prod.id} 
              onClick={() => { setSelectedId(prod.id); setIsEditing(false); }} 
              className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-stone-100 hover:bg-stone-50 transition-colors items-center text-left"
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {prod.image_url ? <img src={prod.image_url} alt="" className="w-full h-full object-cover" /> : '🪑'}
                </div>
                <span className="text-xs font-bold text-stone-900 truncate">{prod.name}</span>
              </div>
              <div className="col-span-2 text-xs text-stone-600 font-medium">{prod.type}</div>
              <div className="col-span-2 text-[11px] text-stone-500 font-mono">
                {prod.dimensions ? `${prod.dimensions.width}×${prod.dimensions.height}×${prod.dimensions.depth}″` : '—'}
              </div>
              <div className="col-span-2 text-xs font-black text-teal-700">
                ${(prod.prices?.['Publico'] || Object.values(prod.prices || {})[0] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </div>
              <div className="col-span-2 text-right text-[11px] font-mono text-stone-500 font-bold">{prod.sku}</div>
            </button>
          ))}
        </div>
      )}

      {/* CONTROLES DE PAGINACIÓN */}
      {porPagina !== -1 && totalPaginas > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs text-stone-500 font-bold">
            Página <strong className="text-stone-900">{paginaActual}</strong> de <strong className="text-stone-900">{totalPaginas}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPaginas > 5 && paginaActual > 3) {
                  pageNum = Math.min(paginaActual - 2 + i, totalPaginas - 4 + i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPaginaActual(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      paginaActual === pageNum
                        ? 'bg-[#0d9488] text-white shadow-xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual >= totalPaginas}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              <span>Siguiente</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / EDICIÓN DE PRODUCTO */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-stone-50 z-10">
              <h3 className="font-black text-stone-900 truncate pr-4 text-base">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                    className="bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-sm font-black text-stone-900 w-full focus:outline-none focus:border-[#0d9488]" 
                  />
                ) : (
                  selected.name
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleEditToggle} 
                  disabled={guardando}
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white shrink-0 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isEditing ? <><Save size={14} /> Guardar</> : 'Editar'}
                </button>
                <button 
                  onClick={() => { setSelectedId(null); setIsEditing(false); }} 
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-left">
              {/* Imagen */}
              <div className="w-full aspect-video bg-stone-50 rounded-2xl border border-stone-200 flex flex-col items-center justify-center relative overflow-hidden group">
                {(isEditing ? editForm.image_url : selected.image_url) ? (
                  <img 
                    src={isEditing ? editForm.image_url : selected.image_url} 
                    alt={selected.name} 
                    className="w-full h-full object-contain p-2" 
                  />
                ) : (
                  <span className="text-6xl opacity-70">🪑</span>
                )}
                {isEditing && (
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <div className="text-white text-xs font-bold bg-stone-900/80 px-4 py-2 rounded-xl flex items-center gap-2">
                      <Upload size={16} /> Cambiar Foto
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadEdit} />
                  </label>
                )}
              </div>

              {/* SKU, Categoría y Costo */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold mb-1">SKU</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editForm.sku} 
                      onChange={e => setEditForm({ ...editForm, sku: e.target.value })} 
                      className="bg-white border border-stone-200 rounded-lg py-1 px-2 text-xs font-mono font-bold text-stone-900 w-full" 
                    />
                  ) : (
                    <span className="font-mono font-bold text-stone-800">{selected.sku}</span>
                  )}
                </div>
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold mb-1">Categoría</span>
                  {isEditing ? (
                    <select 
                      value={editForm.type} 
                      onChange={e => setEditForm({ ...editForm, type: e.target.value })} 
                      className="bg-white border border-stone-200 rounded-lg py-1 px-2 text-xs font-bold text-stone-900 w-full"
                    >
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <span className="font-bold text-stone-800">{selected.type}</span>
                  )}
                </div>
                <div className="bg-stone-50 border border-stone-200 p-3 rounded-xl">
                  <span className="text-stone-500 block text-[10px] uppercase font-bold mb-1">Costo Prod. ($)</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      value={editForm.costo_produccion ?? ''} 
                      onChange={e => setEditForm({ ...editForm, costo_produccion: Number(e.target.value) })} 
                      className="bg-white border border-stone-200 rounded-lg py-1 px-2 text-xs font-mono font-black text-amber-700 w-full" 
                      min="0"
                    />
                  ) : (
                    <span className="font-black text-amber-700 font-mono">
                      {selected.costo_produccion ? `$${selected.costo_produccion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Dimensiones */}
              <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                <span className="text-stone-500 text-[10px] block uppercase font-bold mb-1.5">Dimensiones (Pulgadas)</span>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold text-stone-800">
                    <div>Ancho (″): <input type="number" value={editForm.dimensions?.width || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, width: Number(e.target.value) } })} className="bg-white border border-stone-200 rounded-lg w-full py-1 px-2 text-xs font-mono" /></div>
                    <div>Alto (″): <input type="number" value={editForm.dimensions?.height || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, height: Number(e.target.value) } })} className="bg-white border border-stone-200 rounded-lg w-full py-1 px-2 text-xs font-mono" /></div>
                    <div>Fondo (″): <input type="number" value={editForm.dimensions?.depth || 0} onChange={e => setEditForm({ ...editForm, dimensions: { ...editForm.dimensions, depth: Number(e.target.value) } })} className="bg-white border border-stone-200 rounded-lg w-full py-1 px-2 text-xs font-mono" /></div>
                  </div>
                ) : (
                  selected.dimensions && (
                    <div className="flex gap-4 text-xs font-bold font-mono text-stone-800">
                      <span>Ancho: {selected.dimensions.width}″</span>
                      <span>Alto: {selected.dimensions.height}″</span>
                      <span>Fondo: {selected.dimensions.depth}″</span>
                    </div>
                  )
                )}
              </div>

              {/* Acabados */}
              <div>
                <span className="text-stone-500 text-[10px] block uppercase font-bold mb-1.5">Acabados Disponibles</span>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {acabados.map(a => (
                      <label key={a} className="flex items-center gap-1.5 text-xs text-stone-800 cursor-pointer bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
                        <input 
                          type="checkbox" 
                          checked={editForm.finishes?.includes(a)} 
                          onChange={e => {
                            const newFinishes = e.target.checked 
                              ? [...(editForm.finishes || []), a] 
                              : (editForm.finishes || []).filter((f: string) => f !== a);
                            setEditForm({ ...editForm, finishes: newFinishes });
                          }} 
                          className="accent-[#0d9488]" 
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                ) : (
                  selected.finishes && (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.finishes.map(f => (
                        <span key={f} className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          {f}
                        </span>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Precios */}
              <div>
                <span className="text-stone-500 text-[10px] block uppercase font-bold mb-2">Precios de Venta</span>
                <div className="space-y-1.5">
                  {isEditing ? (
                    clientes.map(cli => (
                      <div key={cli.nombre} className="flex justify-between items-center bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl gap-2">
                        <span className="text-xs text-stone-700 font-semibold flex-1 truncate">{cli.nombre}</span>
                        <div className="relative w-32">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono">$</span>
                          <input 
                            type="number" 
                            value={editForm.prices?.[cli.nombre] || 0} 
                            onChange={e => setEditForm({ ...editForm, prices: { ...editForm.prices, [cli.nombre]: Number(e.target.value) } })} 
                            className="bg-white border border-stone-200 rounded-lg w-full pl-6 pr-2 py-1 text-xs font-mono text-right font-black text-teal-700" 
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(selected.prices || {}).map(([cli, price]) => (
                      <div key={cli} className="flex justify-between items-center bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl">
                        <span className="text-xs text-stone-700 font-medium">{cli}</span>
                        <span className="text-xs font-black font-mono text-teal-700">
                          ${(Number(price) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Acciones Inferiores (Impresión y Baja) */}
              {!isEditing && (
                <div className="border-t border-stone-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 flex-1">
                      <span className="text-xs text-stone-500 font-medium">Etiquetas:</span>
                      <input 
                        type="number" 
                        value={printCount} 
                        onChange={e => setPrintCount(Math.max(1, Number(e.target.value)))}
                        className="w-14 text-center py-0.5 text-xs font-bold text-stone-900 bg-white border border-stone-200 rounded" 
                        min="1"
                      />
                    </div>
                    <button 
                      onClick={() => setPrintBatch({ name: selected.name, sku: selected.sku, count: printCount })}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
                    >
                      <Printer size={14} /> Imprimir {printCount} Etiquetas
                    </button>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex justify-end">
                    <button
                      onClick={() => handleEliminar(selected.id, selected.name)}
                      disabled={guardando}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 size={14} />
                      <span>Dar de Baja / Eliminar del Catálogo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO */}
      {showModalNuevo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0d9488]/10 text-[#0d9488] flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-sm">Registrar Nuevo Producto</h3>
                  <p className="text-[10px] text-stone-500">Agrega un modelo al catálogo general de Decor</p>
                </div>
              </div>
              <button onClick={() => setShowModalNuevo(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearProductoSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-left">
              {/* Foto y Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <label className="text-[11px] font-bold text-stone-600 block mb-1.5">Foto del Mueble</label>
                  <div className="aspect-square bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-[#0d9488] transition-colors">
                    {nuevoForm.image_url ? (
                      <img src={nuevoForm.image_url} alt="Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2 text-stone-400 space-y-1">
                        <Upload size={24} className="mx-auto text-stone-400" />
                        <span className="text-[10px] font-bold block">Subir Imagen</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-white text-[11px] font-bold bg-black/60 px-3 py-1.5 rounded-lg">
                        {nuevoForm.image_url ? 'Cambiar' : 'Seleccionar'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadNuevo} />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      Nombre del Producto <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={nuevoForm.nombre}
                      onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })}
                      placeholder="Ej. Silla Colonial Santa Fe"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 font-bold placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488] shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Código SKU</label>
                      <input 
                        type="text" 
                        value={nuevoForm.sku}
                        onChange={e => setNuevoForm({ ...nuevoForm, sku: e.target.value })}
                        placeholder="Auto (Ej. DCR-0001)"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#0d9488]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Categoría</label>
                      <select
                        value={nuevoForm.type}
                        onChange={e => setNuevoForm({ ...nuevoForm, type: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
                      >
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Origen</label>
                      <select
                        value={nuevoForm.origen}
                        onChange={e => setNuevoForm({ ...nuevoForm, origen: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#0d9488]"
                      >
                        <option value="taller">Taller Propio</option>
                        <option value="compra_externa">Proveedor Externo</option>
                        <option value="artesania">Artesano / Productor</option>
                        <option value="pieza_unica">Pieza Única / Muestra</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={nuevoForm.es_pieza_unica}
                          onChange={e => setNuevoForm({ ...nuevoForm, es_pieza_unica: e.target.checked })}
                          className="accent-[#0d9488]"
                        />
                        <span>¿Es pieza única?</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Precios (Venta y Costo) */}
              <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Precio de Venta Base ($ MXN) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={nuevoForm.precio_venta_base || ''}
                      onChange={e => setNuevoForm({ ...nuevoForm, precio_venta_base: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-black text-teal-700 focus:outline-none focus:border-[#0d9488]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    Costo Estimado de Producción ($ MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      value={nuevoForm.costo_produccion || ''}
                      onChange={e => setNuevoForm({ ...nuevoForm, costo_produccion: Number(e.target.value) })}
                      placeholder="0.00"
                      className="w-full bg-white border border-stone-200 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-black text-amber-700 focus:outline-none focus:border-[#0d9488]"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensiones */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 block">Dimensiones en Pulgadas (Ancho × Alto × Fondo)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="number" 
                    placeholder="Ancho (″)" 
                    value={nuevoForm.dimensions.width || ''} 
                    onChange={e => setNuevoForm({ ...nuevoForm, dimensions: { ...nuevoForm.dimensions, width: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                  <input 
                    type="number" 
                    placeholder="Alto (″)" 
                    value={nuevoForm.dimensions.height || ''} 
                    onChange={e => setNuevoForm({ ...nuevoForm, dimensions: { ...nuevoForm.dimensions, height: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                  <input 
                    type="number" 
                    placeholder="Fondo (″)" 
                    value={nuevoForm.dimensions.depth || ''} 
                    onChange={e => setNuevoForm({ ...nuevoForm, dimensions: { ...nuevoForm.dimensions, depth: Number(e.target.value) } })}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#0d9488]"
                  />
                </div>
              </div>

              {/* Acabados disponibles */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 block">Acabados Permitidos</label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-stone-50 border border-stone-200 rounded-xl">
                  {acabados.map(a => (
                    <label key={a} className="flex items-center gap-1.5 text-xs text-stone-800 cursor-pointer bg-white border border-stone-200 px-2.5 py-1 rounded-lg">
                      <input 
                        type="checkbox"
                        checked={nuevoForm.finishes.includes(a)}
                        onChange={e => {
                          const newFinishes = e.target.checked 
                            ? [...nuevoForm.finishes, a]
                            : nuevoForm.finishes.filter(f => f !== a);
                          setNuevoForm({ ...nuevoForm, finishes: newFinishes });
                        }}
                        className="accent-[#0d9488]"
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowModalNuevo(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Producto en Catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPRESIÓN POR LOTES */}
      {printBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50 rounded-t-3xl">
              <h3 className="font-bold text-stone-900 flex items-center gap-2 text-sm">
                <Printer size={18} className="text-[#0d9488]" /> Imprimir Etiquetas de Catálogo: {printBatch.name}
              </h3>
              <button onClick={() => setPrintBatch(null)} className="text-stone-400 hover:text-stone-700">
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
            <div className="p-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50 rounded-b-3xl">
              <button onClick={() => setPrintBatch(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200">
                Cancelar
              </button>
              <button onClick={() => window.print()} className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Printer size={16} /> Imprimir {printBatch.count} Etiquetas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
