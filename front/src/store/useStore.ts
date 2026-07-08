import { useState, useCallback, useEffect } from 'react';

// --- Importar datos JSON iniciales (solo catálogos como fallback) ---
import productosData from '../data/productos.json';
import categoriasData from '../data/categorias.json';
import clientesData from '../data/clientes.json';
import empleadosData from '../data/empleados.json';
import tiendasData from '../data/tiendas.json';
import materiaPrimaData from '../data/materia-prima.json';
import acabadosData from '../data/acabados.json';

// --- Tipos ---
export type Rol = 'admin' | 'gerente_tienda' | 'encargado_taller' | 'repartidor';

export interface Usuario {
  id: number; nombre: string; email: string; password: string; rol: Rol; avatar: string;
}

export interface Producto {
  id: number; name: string; type: string; sku: string;
  prices: Record<string, number>;
  dimensions: { width: number; height: number; depth: number };
  finishes: string[];
  image_url: string | null;
  costo_produccion?: number;
}

export interface Categoria { id: number; nombre: string; icon: string; }

export interface Cliente {
  id: number; nombre: string; tipo: string; email: string; telefono: string; direccion: string; ciudad: string;
  credito_activo: boolean; limite_credito: number; saldo_pendiente: number;
}

export interface Empleado {
  id: number; nombre: string; rol: string; especialidades: string[]; activo: boolean;
  tarifa_base?: number;
}

export interface Tienda {
  id: number; nombre: string; ciudad: string; direccion: string; telefono: string; activa: boolean;
}

export interface InventarioItem {
  id: number; tienda_id: number; producto_id: number; cantidad_disponible: number;
  cantidad_reservada: number; origen_stock: string; costo_unitario: number; precio_venta: number;
}

export interface MateriaPrima {
  id: number; nombre: string; unidad: string; cantidad: number; minimo: number; color: string;
}

export type WOStatus = 'pendiente' | 'en_produccion' | 'acabados' | 'listo_embarque';

export interface WorkOrder {
  id: number; orden_id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  cantidad: number; estatus: WOStatus; fecha_asignacion: string;
  acabado_nombre: string; cliente_nombre: string;
  empleado_id?: number;
  empleado_nombre?: string;
  costo_mano_obra?: number;
  costo_mano_obra_unitario?: number;
  empleado_acabado_id?: number;
  empleado_acabado_nombre?: string;
  costo_acabado?: number;
  costo_acabado_unitario?: number;
  fecha_termino?: string;
  rechazos?: number;
}

export type TipoPedido = 'linea' | 'linea_especial' | 'orden_especial';

export interface PedidoItem {
  id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  cantidad: number; precio_unitario: number; subtotal: number;
  tipo_pedido: TipoPedido;
  medidas?: { ancho: number; alto: number; fondo: number };
  acabado?: string;
  notas?: string;
  diagrama_url?: string; // base64 image for demo
}

export interface Pedido {
  id: number; fecha_creacion: string; estatus: string; tipo_orden: string;
  cliente_id: number; cliente_nombre: string; cliente_email: string;
  total: number; total_items: number; items: PedidoItem[]; notas: string;
}

export interface TerminadoSinEmbarcar {
  id: number; qr_code: string;
  producto_id: number; producto_nombre: string; codigo_sku: string;
  orden_id: number; cliente_nombre: string;
  acabado: string; fecha_listo: string;
  precio_estimado: number;
}

export interface EmbarqueItem {
  id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  qr_code: string; precio_unitario: number;
  embarcado: boolean; recibido_en_tienda: boolean;
  estado_recepcion?: 'ok' | 'faltante' | 'danado' | 'dañado' | 'pendiente';
  original_terminado?: TerminadoSinEmbarcar;
  tienda_destino_id: number;
  cliente_nombre: string;
}

export interface Devolucion {
  id: number;
  origen: 'venta_tienda' | 'orden_produccion';
  referencia_id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  motivo: string;
  estatus: 'recibida' | 'en_reparacion' | 'reintegrada_inventario' | 'descartada_merma';
  tienda_id: number;
  fecha: string;
}

export interface Embarque {
  id: number; orden_id: number; ruta_viaje: string;
  fecha_embarque: string; placas_trailer: string; transportista: string;
  estatus: string; items: EmbarqueItem[]; cliente_nombre: string;
  tienda_destino_id?: number;
}

export interface VentaItem {
  id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  qr_code: string; precio_unitario: number;
  cantidad?: number;
}

export interface Venta {
  id: number; tienda_id: number; fecha_venta: string;
  total: number; items: VentaItem[];
}

export interface DecorStore {
  // Auth
  currentUser: Usuario | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchCatalogos: () => Promise<void>;
  fetchOperativos: () => Promise<void>;
  productos: Producto[];
  categorias: Categoria[];
  clientes: Cliente[];
  empleados: Empleado[];
  tiendas: Tienda[];
  acabados: string[];
  inventario: InventarioItem[];
  materiaPrima: MateriaPrima[];
  workOrders: WorkOrder[];
  pedidos: Pedido[];
  terminados: TerminadoSinEmbarcar[];
  embarques: Embarque[];
  ventas: Venta[];
  devoluciones: Devolucion[];
  // Mutations
  moveWorkOrder: (id: number, newStatus: WOStatus, assignment?: { empleado_id: number; empleado_nombre: string; costo_mano_obra: number; cantidad_asignada?: number; costo_mano_obra_unitario?: number }) => Promise<void>;
  crearPedido: (pedido: Omit<Pedido, 'id'>) => Promise<void>;
  editarPedido: (id: number, pedidoData: Omit<Pedido, 'id' | 'fecha_creacion'>) => Promise<boolean>;
  eliminarPedido: (id: number) => Promise<boolean>;
  crearEmbarque: (embarque: Omit<Embarque, 'id'>) => Embarque;
  cancelarEmbarque: (id: number) => void;
  updateEmbarqueStatus: (id: number, newStatus: string) => void;
  confirmarRecepcion: (embarqueId: number, items: EmbarqueItem[]) => void;
  registrarVentaQR: (qrCode: string, tiendaId: number) => boolean;
  registrarVentaCarrito: (tiendaId: number, qrCodes: string[]) => Venta | null;
  updateMateriaPrima: (id: number, delta: number) => void;
  addCliente: (cli: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: number, cli: Partial<Cliente>) => void;
  deleteCliente: (id: number) => void;
  addEmpleado: (emp: Omit<Empleado, 'id'>) => void;
  updateEmpleado: (id: number, emp: Partial<Empleado>) => void;
  deleteEmpleado: (id: number) => void;
  addTienda: (tienda: Omit<Tienda, 'id'>) => void;
  updateTienda: (id: number, tienda: Partial<Tienda>) => void;
  deleteTienda: (id: number) => void;
  addAcabado: (acabado: string) => void;
  updateAcabado: (oldAcabado: string, newAcabado: string) => void;
  deleteAcabado: (acabado: string) => void;
  guardarComoProducto: (item: PedidoItem) => Producto;
  updateProducto: (id: number, prod: Partial<Producto>) => void;
  // Utils
  resetDemo: () => void;
  isInitialized: boolean;
}

// --- Storage helpers ---
const STORAGE_PREFIX = 'decor_prod_';

function saveToStorage<T>(key: string, data: T): void {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data)); } catch { /* */ }
}

function loadFromStorage<T>(key: string): T | null {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function clearStorage(): void {
  Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX)).forEach(k => localStorage.removeItem(k));
}

function getOrInit<T>(key: string, initial: T): T {
  const stored = loadFromStorage<T>(key);
  if (stored !== null) return stored;
  saveToStorage(key, initial);
  return initial;
}

// --- Generate initial work orders mapped to new statuses ---
function migrateWorkOrders(): WorkOrder[] {
  return []; // En producción empezamos sin órdenes de trabajo
}

function generateInitialTerminados(_wos: WorkOrder[]): TerminadoSinEmbarcar[] {
  return []; // En producción empezamos sin piezas terminadas
}

// --- Hook ---
export function useStore(): DecorStore {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => loadFromStorage<Usuario>('currentUser'));

  const [productos, setProductos] = useState<Producto[]>(() => {
    const rawProds = getOrInit('productos', productosData as Producto[]);
    let updated = false;
    const mapped = rawProds.map(p => {
      if (p.costo_produccion === undefined) {
        updated = true;
        if (p.id <= 3) {
          return { ...p, costo_produccion: 0 };
        }
        const firstPrice = Object.values(p.prices || {})[0] || 150;
        return { ...p, costo_produccion: Math.round(firstPrice * 0.25) };
      }
      return p;
    });
    if (updated) {
      saveToStorage('productos', mapped);
      return mapped;
    }
    return rawProds;
  });
  const [categorias] = useState<Categoria[]>(() => categoriasData as Categoria[]);
  const [clientes, setClientes] = useState<Cliente[]>(() => getOrInit('clientes', clientesData as Cliente[]));
  const [empleados, setEmpleados] = useState<Empleado[]>(() => getOrInit('empleados', empleadosData as Empleado[]));
  const [tiendas, setTiendas] = useState<Tienda[]>(() => getOrInit('tiendas', tiendasData as Tienda[]));
  const [acabados, setAcabados] = useState<string[]>(() => getOrInit('acabados', acabadosData as string[]));
  
  // ── Datos operativos: inicializan vacíos, se cargan del API al login ──
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [materiaPrima, setMateriaPrima] = useState<MateriaPrima[]>(() => {
    const initialMp = (materiaPrimaData as MateriaPrima[]).map(mp => ({ ...mp, cantidad: 0 }));
    return getOrInit('materiaPrima', initialMp);
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [terminados, setTerminados] = useState<TerminadoSinEmbarcar[]>([]);
  const [embarques, setEmbarques] = useState<Embarque[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);

  // Persist — solo catálogos (cache offline); datos operativos vienen del API
  useEffect(() => { saveToStorage('productos', productos); }, [productos]);
  useEffect(() => { saveToStorage('clientes', clientes); }, [clientes]);
  useEffect(() => { saveToStorage('tiendas', tiendas); }, [tiendas]);
  useEffect(() => { saveToStorage('acabados', acabados); }, [acabados]);
  useEffect(() => { saveToStorage('materiaPrima', materiaPrima); }, [materiaPrima]);
  useEffect(() => { saveToStorage('empleados', empleados); }, [empleados]);

  // ── Helper para construir URLs ──
  const apiBase = useCallback(() => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    return isProduction ? '' : 'http://localhost/sistema_decor';
  }, []);

  const apiFetch = useCallback((url: string, opts?: RequestInit) => {
    return fetch(url, { credentials: 'include', ...opts });
  }, []);

  // ── Auth ──
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiFetch(`${apiBase()}/api/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data: any = {};
      try { const text = await res.text(); if (text) data = JSON.parse(text); } catch { /* */ }
      if (res.ok && data.ok && data.user) {
        setCurrentUser(data.user);
        saveToStorage('currentUser', data.user);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error en login:', e);
      return false;
    }
  }, [apiBase, apiFetch]);

  const logout = useCallback(async () => {
    try { await apiFetch(`${apiBase()}/api/auth/logout.php`, { method: 'POST' }); } catch { /* */ }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_PREFIX + 'currentUser');
  }, [apiBase, apiFetch]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase()}/api/auth/me.php`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          setCurrentUser(data.user);
          saveToStorage('currentUser', data.user);
        }
      }
    } catch { /* */ }
  }, [apiBase, apiFetch]);

  const fetchCatalogos = useCallback(async () => {
    try {
      const base = apiBase();
      const [resProd, resCli, resEmp, resTie, resAca] = await Promise.all([
        apiFetch(`${base}/api/productos/list.php`),
        apiFetch(`${base}/api/clientes/list.php`),
        apiFetch(`${base}/api/empleados/list.php`),
        apiFetch(`${base}/api/tiendas/list.php`),
        apiFetch(`${base}/api/acabados/list.php`),
      ]);
      if (resProd.ok) { 
        const d = await resProd.json(); 
        if (d.data?.productos) {
          const mappedProds = d.data.productos.map((bp: any) => ({
            id: bp.id,
            name: bp.nombre,
            type: bp.categoria_nombre || 'Otros',
            sku: bp.sku || bp.codigo_sku,
            prices: { "Publico": parseFloat(bp.precio_venta_base || '0') },
            dimensions: {
              width: bp.dimension_ancho ? parseFloat(bp.dimension_ancho) : 0,
              height: bp.dimension_alto ? parseFloat(bp.dimension_alto) : 0,
              depth: bp.dimension_largo ? parseFloat(bp.dimension_largo) : 0
            },
            finishes: bp.acabados ? bp.acabados.map((a:any) => a.nombre) : [],
            image_url: (bp.foto_url && bp.foto_url.length > 0) ? bp.foto_url[0] : null,
            costo_produccion: parseFloat(bp.precio_produccion_base || '0')
          }));
          setProductos(mappedProds);
        }
      }
      if (resCli.ok) { const d = await resCli.json(); if(d.data?.items) setClientes(d.data.items); }
      if (resEmp.ok) { const d = await resEmp.json(); if(d.data?.items) setEmpleados(d.data.items); }
      if (resTie.ok) { const d = await resTie.json(); if(d.data?.items) setTiendas(d.data.items); }
      if (resAca.ok) { const d = await resAca.json(); if(d.data?.items) setAcabados(d.data.items.map((a: any) => a.nombre)); }
    } catch (e) { console.error('Error fetching catalogos:', e); }
  }, [apiBase, apiFetch]);

  const fetchOperativos = useCallback(async () => {
    try {
      const base = apiBase();
      const [resPed, resWo, resInv] = await Promise.all([
        apiFetch(`${base}/api/pedidos/ordenes.php`),
        apiFetch(`${base}/api/produccion/work_orders.php`),
        apiFetch(`${base}/api/inventario/list_tienda.php?tienda_id=1`),
      ]);
      if (resPed.ok) { const d = await resPed.json(); if(d.data) setPedidos(d.data); }
      if (resWo.ok) {
        const d = await resWo.json();
        if (d.data) {
          const allWo = (Array.isArray(d.data) ? d.data : (d.data.items || [])) as WorkOrder[];
          // Separar WOs activas de terminadas/listas para embarque
          const terminadoStatuses = ['listo_embarque', 'terminado'];
          setWorkOrders(allWo.filter((w: WorkOrder) => !terminadoStatuses.includes(w.estatus)));
          setTerminados(allWo.filter((w: WorkOrder) => terminadoStatuses.includes(w.estatus)).map((w: WorkOrder) => ({
            id: w.id, orden_id: w.orden_id || 0, producto_id: w.producto_id || 0,
            producto_nombre: w.producto_nombre || '', codigo_sku: w.codigo_sku || '',
            acabado: w.acabado_nombre || '', qr_code: `QR-${w.id}`, cantidad: w.cantidad || 1,
            cliente_nombre: w.cliente_nombre || '', fecha_listo: w.fecha_termino || '',
            precio_estimado: 0,
          })));
        }
      }
      if (resInv.ok) {
        const d = await resInv.json();
        if (d.data?.items) {
          const mapped: InventarioItem[] = d.data.items.map((item: any) => ({
            id: item.inventario_tienda_id || item.producto_id,
            tienda_id: item.tienda_id || 1,
            producto_id: item.producto_id,
            cantidad_disponible: item.cantidad_disponible || 0,
            cantidad_reservada: item.cantidad_reservada || 0,
            origen_stock: item.origen_stock || 'embarque_taller',
            costo_unitario: item.costo_unitario || 0,
            precio_venta: item.precio_venta || 0,
          }));
          setInventario(mapped);
        }
      }
    } catch (e) { console.error('Error fetching operativos:', e); }
  }, [apiBase, apiFetch]);

  // Auto-cargar datos al loguearse
  useEffect(() => {
    if (currentUser) {
      fetchCatalogos();
      fetchOperativos();
    }
  }, [currentUser, fetchCatalogos, fetchOperativos]);


  const moveWorkOrder = useCallback(async (
    id: number, 
    newStatus: WOStatus, 
    assignment?: { 
      empleado_id: number; 
      empleado_nombre: string; 
      costo_mano_obra: number; 
      cantidad_asignada?: number; 
      costo_mano_obra_unitario?: number;
    }
  ) => {
    try {
      const base = apiBase();
      const payload = { id, estatus: newStatus, assignment };
      const res = await apiFetch(`${base}/api/produccion/mover_wo.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al mover WO');

      // Recargar datos operativos del backend (WOs + terminados + inventario)
      await fetchOperativos();
    } catch (e) {
      console.error(e);
      alert('Error moviendo estatus en el servidor.');
    }
  }, [workOrders, apiBase, apiFetch, fetchOperativos]);

  const crearPedido = useCallback(async (pedido: Omit<Pedido, 'id'>) => {
    try {
      const base = apiBase();
      const payload = {
        cliente_id: pedido.cliente_id,
        tienda_origen_id: 1,
        tipo_orden: pedido.tipo_orden,
        notas: pedido.notas || '',
        items: pedido.items.map(it => ({
          producto_id: it.producto_id,
          acabado_nombre: it.acabado || '',
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario || 0
        }))
      };

      const res = await apiFetch(`${base}/api/pedidos/crear.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Error al crear pedido en servidor');
      }
      
      // Recargar operativos para actualizar pedidos y work orders desde la DB
      await fetchOperativos();
    } catch (e) {
      console.error('Error al crear pedido:', e);
      alert('Error al crear el pedido. Revisa tu conexión.');
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const editarPedido = useCallback(async (id: number, pedidoData: Omit<Pedido, 'id' | 'fecha_creacion'>): Promise<boolean> => {
    const relatedWOs = workOrders.filter(wo => wo.orden_id === id);
    if (relatedWOs.some(wo => wo.estatus !== 'pendiente')) {
        alert("No se puede editar: algunas órdenes ya están en producción.");
        return false;
    }

    try {
      const base = apiBase();
      const payload = {
        id: id,
        cliente_id: pedidoData.cliente_id,
        tienda_origen_id: 1,
        tipo_orden: pedidoData.tipo_orden,
        notas: pedidoData.notas || '',
        estatus: pedidoData.estatus,
        items: pedidoData.items.map(it => ({
          producto_id: it.producto_id,
          acabado_nombre: it.acabado || '',
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario || 0
        }))
      };

      const res = await apiFetch(`${base}/api/ordenes/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Error al editar pedido');

      await fetchOperativos();
      return true;
    } catch (e) {
      console.error(e);
      alert('Error al editar el pedido.');
      return false;
    }
  }, [workOrders, apiBase, apiFetch, fetchOperativos]);

  const eliminarPedido = useCallback(async (id: number): Promise<boolean> => {
    const relatedWOs = workOrders.filter(wo => wo.orden_id === id);
    if (relatedWOs.some(wo => wo.estatus !== 'pendiente')) {
      alert("No se puede eliminar: algunas órdenes ya están en producción.");
      return false;
    }
    
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/pedidos/eliminar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Error al eliminar');

      await fetchOperativos();
      return true;
    } catch (e) {
      console.error(e);
      alert('Error al eliminar el pedido.');
      return false;
    }
  }, [workOrders, apiBase, apiFetch, fetchOperativos]);

  const crearEmbarque = useCallback((embarque: Omit<Embarque, 'id'>): Embarque => {
    const newEmbarque = { ...embarque, id: Date.now() } as Embarque;
    setEmbarques(prev => [newEmbarque, ...prev]);
    // Remove items from terminados
    const qrCodes = new Set(embarque.items.map(i => i.qr_code));
    setTerminados(prev => prev.filter(t => !qrCodes.has(t.qr_code)));
    return newEmbarque;
  }, []);

  const cancelarEmbarque = useCallback((id: number) => {
    const emb = embarques.find(e => e.id === id);
    if (emb) {
      const restored = emb.items.map(i => i.original_terminado).filter(Boolean) as TerminadoSinEmbarcar[];
      setTerminados(tPrev => [...restored, ...tPrev]);
    }
    setEmbarques(prev => prev.filter(e => e.id !== id));
  }, [embarques]);

  const updateEmbarqueStatus = useCallback((id: number, newStatus: string) => {
    setEmbarques(prev => prev.map(e => e.id === id ? { ...e, estatus: newStatus } : e));
  }, []);

  const confirmarRecepcion = useCallback((embarqueId: number, items: EmbarqueItem[]) => {
    // Update embarque status and items
    setEmbarques(prev => prev.map(e =>
      e.id === embarqueId ? { ...e, estatus: 'entregado', items } : e
    ));

    // Move received items to store inventory
    const received = items.filter(i => i.estado_recepcion === 'ok');
    for (const item of received) {
      if (item.tienda_destino_id !== 0) {
        setInventario(prev => {
          const existing = prev.find(i => i.producto_id === item.producto_id && i.tienda_id === item.tienda_destino_id);
          if (existing) {
            return prev.map(i =>
              i.producto_id === item.producto_id && i.tienda_id === item.tienda_destino_id
                ? { ...i, cantidad_disponible: i.cantidad_disponible + 1 }
                : i
            );
          }
          const product = productos.find(p => p.id === item.producto_id);
          return [...prev, {
            id: Date.now() + Math.random(),
            tienda_id: item.tienda_destino_id,
            producto_id: item.producto_id,
            producto_nombre: item.producto_nombre,
            codigo_sku: item.codigo_sku,
            cantidad_disponible: 1,
            cantidad_reservada: 0,
            origen_stock: 'embarque',
            costo_unitario: product ? Object.values(product.prices)[0] * 0.45 : 0,
            precio_venta: product ? Object.values(product.prices)[0] : 0
          }];
        });
      }
    }

    // Register damaged items in devoluciones
    const damaged = items.filter(i => i.estado_recepcion === 'dañado' || i.estado_recepcion === 'danado');
    if (damaged.length > 0) {
      const newDevoluciones = damaged.map((item, idx) => ({
        id: Date.now() + idx + Math.random(),
        origen: 'orden_produccion' as const,
        referencia_id: embarqueId,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        cantidad: 1,
        motivo: 'Pieza dañada o defectuosa al recibir en tienda',
        estatus: 'recibida' as const,
        tienda_id: item.tienda_destino_id || 1,
        fecha: new Date().toISOString().split('T')[0]
      }));
      setDevoluciones(prev => [...newDevoluciones, ...prev]);
    }
  }, [productos]);

  const registrarVentaQR = useCallback((qrCode: string, tiendaId: number): boolean => {
    // Find item in inventory by QR (we look up by matching product)
    // For demo, we'll search terminados history or embarques
    let found: { producto_id: number; producto_nombre: string; codigo_sku: string; precio: number } | null = null;

    // Detectar si es un QR de reposición / inicial autodescriptivo
    if (qrCode.startsWith('DCR-REC-')) {
      const parts = qrCode.split('-');
      if (parts.length >= 4) {
        const qrProductoId = Number(parts[3]);
        const prod = productos.find(p => p.id === qrProductoId);
        if (prod) {
          const precio = prod.prices ? Object.values(prod.prices)[0] || 200 : 200;
          found = { producto_id: prod.id, producto_nombre: prod.name, codigo_sku: prod.sku, precio: precio };
        }
      }
    }

    // Check embarques for the QR
    if (!found) {
      for (const emb of embarques) {
        const item = emb.items.find(i => i.qr_code === qrCode);
        if (item) {
          found = { producto_id: item.producto_id, producto_nombre: item.producto_nombre, codigo_sku: item.codigo_sku, precio: item.precio_unitario };
          break;
        }
      }
    }

    // Check terminados if not found
    if (!found) {
      const term = terminados.find(t => t.qr_code === qrCode);
      if (term) {
        found = { producto_id: term.producto_id, producto_nombre: term.producto_nombre, codigo_sku: term.codigo_sku, precio: term.precio_estimado };
      }
    }

    if (!found) return false;

    // Register sale
    const venta: Venta = {
      id: Date.now(),
      tienda_id: tiendaId,
      fecha_venta: new Date().toISOString(),
      total: found.precio,
      items: [{
        id: 1,
        producto_id: found.producto_id,
        producto_nombre: found.producto_nombre,
        codigo_sku: found.codigo_sku,
        qr_code: qrCode,
        precio_unitario: found.precio,
      }],
    };
    setVentas(prev => [venta, ...prev]);

    // Reduce inventory
    setInventario(prev => prev.map(i =>
      i.producto_id === found!.producto_id && i.tienda_id === tiendaId
        ? { ...i, cantidad_disponible: Math.max(0, i.cantidad_disponible - 1) }
        : i
    ));

    return true;
  }, [embarques, terminados]);

  const registrarVentaCarrito = useCallback((tiendaId: number, qrCodes: string[]): Venta | null => {
    const items = qrCodes.map(qrCode => {
      // Detectar si es un QR de reposición / inicial autodescriptivo
      if (qrCode.startsWith('DCR-REC-')) {
        const parts = qrCode.split('-');
        if (parts.length >= 4) {
          const qrProductoId = Number(parts[3]);
          const prod = productos.find(p => p.id === qrProductoId);
          if (prod) {
            const precio = prod.prices ? Object.values(prod.prices)[0] || 200 : 200;
            return {
              producto_id: prod.id,
              producto_nombre: prod.name,
              codigo_sku: prod.sku,
              qr_code: qrCode,
              precio_unitario: precio
            };
          }
        }
      }

      for (const emb of embarques) {
        const item = emb.items.find(i => i.qr_code === qrCode);
        if (item) return { producto_id: item.producto_id, producto_nombre: item.producto_nombre, codigo_sku: item.codigo_sku, qr_code: qrCode, precio_unitario: item.precio_unitario };
      }
      const term = terminados.find(t => t.qr_code === qrCode);
      if (term) return { producto_id: term.producto_id, producto_nombre: term.producto_nombre, codigo_sku: term.codigo_sku, qr_code: qrCode, precio_unitario: term.precio_estimado };
      return null;
    }).filter(Boolean) as VentaItem[];

    if (items.length === 0) return null;

    const venta: Venta = {
      id: Date.now(),
      tienda_id: tiendaId,
      fecha_venta: new Date().toISOString(),
      total: items.reduce((sum, item) => sum + item.precio_unitario, 0),
      items: items.map((item, index) => ({ ...item, id: index + 1 })),
    };

    setVentas(prev => [venta, ...prev]);

    setInventario(prev => {
      const counts: Record<number, number> = {};
      items.forEach(i => counts[i.producto_id] = (counts[i.producto_id] || 0) + 1);
      return prev.map(i => {
        if (i.tienda_id === tiendaId && counts[i.producto_id]) {
          return { ...i, cantidad_disponible: Math.max(0, i.cantidad_disponible - counts[i.producto_id]) };
        }
        return i;
      });
    });

    return venta;
  }, [embarques, terminados]);

  const updateMateriaPrima = useCallback((id: number, delta: number) => {
    setMateriaPrima(prev => prev.map(mp =>
      mp.id === id ? { ...mp, cantidad: Math.max(0, mp.cantidad + delta) } : mp
    ));
  }, []);

  const addCliente = useCallback((cli: Omit<Cliente, 'id'>) => {
    setClientes(prev => [...prev, { ...cli, id: Date.now() }]);
  }, []);

  const updateCliente = useCallback((id: number, cli: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cli } : c));
  }, []);

  const deleteCliente = useCallback((id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  const addTienda = useCallback((tienda: Omit<Tienda, 'id'>) => {
    setTiendas(prev => [...prev, { ...tienda, id: Date.now() }]);
  }, []);

  const updateTienda = useCallback((id: number, tienda: Partial<Tienda>) => {
    setTiendas(prev => prev.map(t => t.id === id ? { ...t, ...tienda } : t));
  }, []);

  const deleteTienda = useCallback((id: number) => {
    setTiendas(prev => prev.filter(t => t.id !== id));
  }, []);

  const addAcabado = useCallback((acabado: string) => {
    setAcabados(prev => prev.includes(acabado) ? prev : [...prev, acabado]);
  }, []);

  const updateAcabado = useCallback((oldAcabado: string, newAcabado: string) => {
    setAcabados(prev => prev.map(a => a === oldAcabado ? newAcabado : a));
  }, []);

  const deleteAcabado = useCallback((acabado: string) => {
    setAcabados(prev => prev.filter(a => a !== acabado));
  }, []);

  const guardarComoProducto = useCallback((item: PedidoItem): Producto => {
    const newProd: Producto = {
      id: Date.now(),
      name: item.producto_nombre,
      type: 'Orden Especial',
      sku: `ESP-${Date.now().toString(36).toUpperCase()}`,
      prices: { 'General': item.precio_unitario },
      dimensions: item.medidas ? { width: item.medidas.ancho, height: item.medidas.alto, depth: item.medidas.fondo } : { width: 0, height: 0, depth: 0 },
      finishes: item.acabado ? [item.acabado] : ['Natural'],
      image_url: item.diagrama_url || null,
    };
    setProductos(prev => [newProd, ...prev]);
    return newProd;
  }, []);

  const updateProducto = useCallback((id: number, prod: Partial<Producto>) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...prod } : p));
  }, []);

  const resetDemo = useCallback(() => {
    // Limpiar solo cache de catálogos; datos operativos vienen del API
    clearStorage();
    window.location.reload();
  }, []);

  const addEmpleado = useCallback((emp: Omit<Empleado, 'id'>) => {
    setEmpleados(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(e => e.id)) : 0;
      return [...prev, { ...emp, id: maxId + 1 }];
    });
  }, []);

  const updateEmpleado = useCallback((id: number, emp: Partial<Empleado>) => {
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, ...emp } : e));
  }, []);

  const deleteEmpleado = useCallback((id: number) => {
    setEmpleados(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    currentUser, login, logout, checkAuth, fetchCatalogos, fetchOperativos,
    productos, categorias, clientes, empleados, tiendas, acabados,
    inventario, materiaPrima, workOrders, pedidos, terminados, embarques, ventas, devoluciones,
    moveWorkOrder, crearPedido, editarPedido, eliminarPedido, crearEmbarque,
    cancelarEmbarque,
    updateEmbarqueStatus,
    confirmarRecepcion, registrarVentaQR, registrarVentaCarrito, updateMateriaPrima,
    addCliente, updateCliente, deleteCliente,
    addTienda, updateTienda, deleteTienda,
    addAcabado, updateAcabado, deleteAcabado,
    guardarComoProducto, updateProducto,
    addEmpleado, updateEmpleado, deleteEmpleado,
    resetDemo, isInitialized: true,
  };
}
