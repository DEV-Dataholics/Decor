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
export type Rol = 'admin' | 'gerente_tienda' | 'encargado_taller';

export interface Usuario {
  id: number; nombre: string; email: string; password?: string; rol: Rol; avatar: string; activo?: boolean; empleado_id?: number; creado_en?: string;
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
  sueldo_base?: number;
  bono_semanal?: number;
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
  permite_decimales?: number;
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
  usuarios: Usuario[];
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
  crearEmbarque: (embarque: Omit<Embarque, 'id'>) => Promise<void>;
  cancelarEmbarque: (id: number) => Promise<void>;
  updateEmbarqueStatus: (id: number, newStatus: string) => Promise<void>;
  confirmarRecepcion: (embarqueId: number, items: EmbarqueItem[]) => Promise<void>;
  registrarVentaQR: (qrCode: string, tiendaId: number) => boolean;
  registrarVentaCarrito: (tiendaId: number, qrCodes: string[]) => Venta | null;
  updateMateriaPrima: (id: number, val: number, isAbsolute?: boolean, key?: 'cantidad' | 'minimo') => void;
  guardarMateriaPrima: () => Promise<void>;
  updateStockTienda: (tiendaId: number, productoId: number, cantidad: number) => Promise<boolean>;
  addUsuario: (usr: any) => Promise<void>;
  updateUsuario: (usr: any) => Promise<void>;
  deleteUsuario: (id: number) => Promise<void>;
  addCliente: (cli: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: number, cli: Partial<Cliente>) => void;
  deleteCliente: (id: number) => void;
  addEmpleado: (emp: Omit<Empleado, 'id'>) => void;
  updateEmpleado: (id: number, emp: Partial<Empleado>) => void;
  deleteEmpleado: (id: number) => void;
  addTienda: (tienda: Omit<Tienda, 'id'>) => Promise<void>;
  updateTienda: (id: number, tienda: Partial<Tienda>) => Promise<void>;
  deleteTienda: (id: number) => Promise<void>;
  addAcabado: (acabado: string) => Promise<void>;
  updateAcabado: (oldAcabado: string, newAcabado: string) => Promise<void>;
  deleteAcabado: (acabado: string) => Promise<void>;
  guardarComoProducto: (item: PedidoItem) => Producto;
  addProducto: (prod: Omit<Producto, 'id'>) => Promise<boolean>;
  updateProducto: (id: number, prod: Partial<Producto>) => Promise<boolean>;
  acabadosList: any[];
  // Utils
  resetDemo: () => void;
  isInitialized: boolean;
  apiBase: () => string;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
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
  const [acabadosList, setAcabadosList] = useState<any[]>([]);
  
  // ── Datos operativos: inicializan vacíos, se cargan del API al login ──
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [materiaPrima, setMateriaPrima] = useState<MateriaPrima[]>(() => {
    const initialMp = (materiaPrimaData as MateriaPrima[]).map(mp => ({ ...mp, cantidad: 0 }));
    return getOrInit('materiaPrima', initialMp);
  });

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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

  const apiFetch = useCallback(async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, { credentials: 'include', ...opts });
    if (res.status === 401) {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_PREFIX + 'currentUser');
      if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/')) {
        window.location.href = '/login';
      }
    }
    return res;
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
      if (resAca.ok) {
        const d = await resAca.json();
        if(d.data?.items) {
          setAcabadosList(d.data.items);
          setAcabados(d.data.items.map((a: any) => a.nombre));
        }
      }

      // Cargar usuarios si es admin
      const currentUserData = loadFromStorage<Usuario>('currentUser');
      if (currentUserData?.rol === 'admin') {
        const resUsr = await apiFetch(`${base}/api/auth/users.php`);
        if (resUsr.ok) {
          const d = await resUsr.json();
          if (d.data) setUsuarios(d.data);
        }
      }
    } catch (e) { console.error('Error fetching catalogos:', e); }
  }, [apiBase, apiFetch]);

  const fetchOperativos = useCallback(async () => {
    try {
      const base = apiBase();
      const [resPed, resWo, resInv, resMp, resEmb] = await Promise.all([
        apiFetch(`${base}/api/pedidos/ordenes.php`),
        apiFetch(`${base}/api/produccion/work_orders.php`),
        apiFetch(`${base}/api/inventario/list_tienda.php?all=1`),
        apiFetch(`${base}/api/inventario/materia_prima.php`),
        apiFetch(`${base}/api/embarques/list.php`),
      ]);
      if (resPed.ok) { const d = await resPed.json(); if(d.data) setPedidos(d.data); }
      if (resMp.ok) { const d = await resMp.json(); if(d.data) setMateriaPrima(d.data); }
      if (resEmb && resEmb.ok) {
        const d = await resEmb.json();
        if (d.items) {
          const mappedEmb: Embarque[] = d.items.map((emb: any) => ({
            id: Number(emb.id),
            orden_id: Number(emb.orden_id),
            ruta_viaje: emb.ruta_viaje || '',
            fecha_embarque: emb.fecha_embarque || '',
            placas_trailer: emb.placas_trailer || '',
            transportista: emb.transportista || '',
            estatus: emb.estatus || 'preparando',
            cliente_nombre: emb.cliente_nombre || '',
            tienda_destino_id: Number(emb.tienda_destino_id),
            items: (emb.items || []).map((item: any) => ({
              id: Number(item.id),
              producto_id: Number(item.producto_id),
              producto_nombre: item.producto_nombre || '',
              codigo_sku: item.codigo_sku || '',
              qr_code: item.qr_code || '',
              precio_unitario: Number(item.precio_unitario || 0),
              embarcado: Number(item.cantidad_embarcada) > 0,
              recibido_en_tienda: Number(item.recibido_en_tienda) === 1,
              estado_recepcion: item.estado_recepcion || 'pendiente',
              tienda_destino_id: Number(item.tienda_destino_id),
              cliente_nombre: emb.cliente_nombre || '',
            }))
          }));
          setEmbarques(mappedEmb);
        }
      }
      if (resWo.ok) {
        const d = await resWo.json();
        if (d.data) {
          const allWo = (Array.isArray(d.data) ? d.data : (d.data.items || [])) as WorkOrder[];
          // Separar WOs activas de terminadas/listas para embarque
          const activeStatuses = ['pendiente', 'en_produccion', 'acabados', 'listo_embarque'];
          setWorkOrders(allWo.filter((w: WorkOrder) => activeStatuses.includes(w.estatus)));
          setTerminados(allWo.filter((w: WorkOrder) => ['listo_embarque', 'terminado'].includes(w.estatus)).map((w: WorkOrder) => ({
            id: w.id, orden_id: w.orden_id || 0, producto_id: w.producto_id || 0,
            producto_nombre: w.producto_nombre || '', codigo_sku: w.codigo_sku || '',
            acabado: w.acabado_nombre || '', qr_code: `QR-${w.id}`, cantidad: w.cantidad || 1,
            cliente_nombre: w.cliente_nombre || '', fecha_listo: w.fecha_termino || '',
            precio_estimado: 0,
          })));
        }
      }
      console.log('fetchOperativos: resInv status =', resInv.status, 'ok =', resInv.ok);
      if (resInv.ok) {
        const d = await resInv.json();
        console.log('fetchOperativos: resInv data =', d);
        if (d.data?.items) {
          const mapped: InventarioItem[] = d.data.items.map((item: any) => ({
            id: Number(item.inventario_tienda_id || item.producto_id),
            tienda_id: Number(item.tienda_id || 1),
            producto_id: Number(item.producto_id),
            cantidad_disponible: Number(item.cantidad_disponible || 0),
            cantidad_reservada: Number(item.cantidad_reservada || 0),
            origen_stock: item.origen_stock || 'embarque_taller',
            costo_unitario: Number(item.costo_unitario || 0),
            precio_venta: Number(item.precio_venta || 0),
          }));
          console.log('fetchOperativos: mapped inventario =', mapped);
          setInventario(mapped);
        }
      }
    } catch (e) {
      console.error('Error fetching operativos:', e);
    }
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

  const crearEmbarque = useCallback(async (embarque: Omit<Embarque, 'id'>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/embarques/crear.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embarque)
      });
      if (res.ok) {
        await fetchOperativos();
      }
    } catch (e) {
      console.error('Error creating embarque:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const cancelarEmbarque = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/embarques/cancelar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchOperativos();
      }
    } catch (e) {
      console.error('Error canceling embarque:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const updateEmbarqueStatus = useCallback(async (id: number, newStatus: string) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/embarques/update_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estatus: newStatus })
      });
      if (res.ok) {
        await fetchOperativos();
      }
    } catch (e) {
      console.error('Error updating embarque status:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const confirmarRecepcion = useCallback(async (embarqueId: number, items: EmbarqueItem[]) => {
    try {
      const base = apiBase();
      
      // Map frontend items array to what api/embarques/recibir.php expects
      const itemsPayload = items.map(item => ({
        embarque_item_id: item.id,
        cantidad_recibida: item.estado_recepcion === 'ok' ? 1 : 0,
        cantidad_danada: (item.estado_recepcion === 'dañado' || item.estado_recepcion === 'danado') ? 1 : 0
      }));

      const res = await apiFetch(`${base}/api/embarques/recibir.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embarque_id: embarqueId,
          items: itemsPayload
        })
      });

      if (res.ok) {
        await fetchOperativos();
      }
    } catch (e) {
      console.error('Error confirming recepcion:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

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

  const updateMateriaPrima = useCallback((id: number, val: number, isAbsolute: boolean = false, key: 'cantidad' | 'minimo' = 'cantidad') => {
    setMateriaPrima(prev => prev.map(mp => {
      if (mp.id !== id) return mp;
      const isDecimal = Number(mp.permite_decimales) === 1;
      let targetVal = key === 'minimo' ? mp.minimo : mp.cantidad;
      let newQty = isAbsolute ? val : Number(targetVal) + val;
      if (!isDecimal) {
        newQty = Math.round(newQty);
      } else {
        newQty = Number(newQty.toFixed(2));
      }
      return { ...mp, [key]: Math.max(0, newQty) };
    }));
  }, []);

  const guardarMateriaPrima = useCallback(async () => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/inventario/materia_prima.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: materiaPrima })
      });
      if (res.ok) {
        alert('Inventario de materia prima guardado correctamente.');
        await fetchOperativos();
      } else {
        throw new Error('Error al guardar');
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar el inventario.');
    }
  }, [materiaPrima, apiBase, apiFetch, fetchOperativos]);

  const updateStockTienda = useCallback(async (tiendaId: number, productoId: number, cantidad: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/inventario/ajuste_manual.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tienda_id: tiendaId,
          producto_id: productoId,
          tipo: 'ajuste',
          cantidad: cantidad,
          es_absoluto: true,
          origen_stock: 'compra_externa',
          notas: 'Ajuste manual de inventario de tienda'
        })
      });
      if (res.ok) {
        // En vez de recargar todo, actualizamos localmente el estado de inventario para una experiencia de usuario instantánea
        setInventario(prev => {
          const exists = prev.some(i => i.tienda_id === tiendaId && i.producto_id === productoId);
          if (exists) {
            return prev.map(i => i.tienda_id === tiendaId && i.producto_id === productoId ? { ...i, cantidad_disponible: cantidad } : i);
          } else {
            return [...prev, {
              id: Date.now(),
              tienda_id: tiendaId,
              producto_id: productoId,
              cantidad_disponible: cantidad,
              cantidad_reservada: 0,
              precio_venta: 0,
              costo_unitario: 0,
              origen_stock: 'compra_externa',
              lote_referencia_tipo: null,
              lote_referencia_id: null
            }];
          }
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [apiBase, apiFetch]);

  const addCliente = useCallback((cli: Omit<Cliente, 'id'>) => {
    setClientes(prev => [...prev, { ...cli, id: Date.now() }]);
  }, []);

  const updateCliente = useCallback((id: number, cli: Partial<Cliente>) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cli } : c));
  }, []);

  const deleteCliente = useCallback((id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  const addTienda = useCallback(async (tienda: Omit<Tienda, 'id'>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/tiendas/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tienda)
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateTienda = useCallback(async (id: number, tienda: Partial<Tienda>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/tiendas/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...tienda })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteTienda = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/tiendas/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const addAcabado = useCallback(async (acabado: string) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/acabados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: acabado })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateAcabado = useCallback(async (oldAcabado: string, newAcabado: string) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/acabados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newAcabado, old_nombre: oldAcabado })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteAcabado = useCallback(async (acabado: string) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/acabados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: acabado, action: 'delete' })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error(e);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

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

  const addProducto = useCallback(async (prod: Omit<Producto, 'id'>) => {
    try {
      const base = apiBase();
      const cat = categorias.find(c => c.nombre.toLowerCase() === prod.type.toLowerCase());
      const categoria_id = cat ? cat.id : 19;
      
      const acabadosIds = prod.finishes.map(fname => {
        return acabadosList.find(a => a.nombre.toLowerCase() === fname.toLowerCase())?.id;
      }).filter(id => id !== undefined);

      const body = {
        nombre: prod.name,
        sku: prod.sku,
        categoria_id,
        precio_venta_base: prod.prices['Publico'] || prod.prices['General'] || Object.values(prod.prices)[0] || 0,
        precio_produccion_base: prod.costo_produccion || 0,
        dimension_alto: prod.dimensions.height,
        dimension_ancho: prod.dimensions.width,
        dimension_largo: prod.dimensions.depth,
        foto_url: prod.image_url ? [prod.image_url] : [],
        acabados: acabadosIds,
        descripcion: '',
        notas: '',
        es_pieza_unica: 0
      };

      const res = await apiFetch(`${base}/api/productos/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        await fetchCatalogos();
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [apiBase, apiFetch, fetchCatalogos, categorias, acabadosList]);

  const updateProducto = useCallback(async (id: number, prod: Partial<Producto>) => {
    try {
      const base = apiBase();
      const orig = productos.find(p => p.id === id);
      if (!orig) return false;

      const name = prod.name !== undefined ? prod.name : orig.name;
      const sku = prod.sku !== undefined ? prod.sku : orig.sku;
      const type = prod.type !== undefined ? prod.type : orig.type;
      const cat = categorias.find(c => c.nombre.toLowerCase() === type.toLowerCase());
      const categoria_id = cat ? cat.id : 19;

      const finishes = prod.finishes !== undefined ? prod.finishes : orig.finishes;
      const acabadosIds = finishes.map(fname => {
        return acabadosList.find(a => a.nombre.toLowerCase() === fname.toLowerCase())?.id;
      }).filter(id => id !== undefined);

      const prices = prod.prices !== undefined ? prod.prices : orig.prices;
      const precio_venta = prices['Publico'] || prices['General'] || Object.values(prices)[0] || 0;
      const costo_produccion = prod.costo_produccion !== undefined ? prod.costo_produccion : orig.costo_produccion;

      const dimensions = prod.dimensions !== undefined ? prod.dimensions : orig.dimensions;

      const body = {
        id,
        nombre: name,
        sku,
        categoria_id,
        precio_venta_base: precio_venta,
        precio_produccion_base: costo_produccion || 0,
        dimension_alto: dimensions.height,
        dimension_ancho: dimensions.width,
        dimension_largo: dimensions.depth,
        foto_url: prod.image_url !== undefined ? (prod.image_url ? [prod.image_url] : []) : (orig.image_url ? [orig.image_url] : []),
        acabados: acabadosIds,
        descripcion: '',
        notas: '',
        es_pieza_unica: 0
      };

      const res = await apiFetch(`${base}/api/productos/save.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setProductos(prev => prev.map(p => p.id === id ? { ...p, ...prod } : p));
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [apiBase, apiFetch, productos, categorias, acabadosList]);

  const addUsuario = useCallback(async (usr: any) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/auth/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usr)
      });
      if (res.ok) {
        // Recargar usuarios
        const resUsr = await apiFetch(`${base}/api/auth/users.php`);
        if (resUsr.ok) {
          const d = await resUsr.json();
          if (d.data) setUsuarios(d.data);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear usuario');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al crear usuario');
    }
  }, [apiBase, apiFetch]);

  const updateUsuario = useCallback(async (usr: any) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/auth/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usr)
      });
      if (res.ok) {
        // Recargar usuarios
        const resUsr = await apiFetch(`${base}/api/auth/users.php`);
        if (resUsr.ok) {
          const d = await resUsr.json();
          if (d.data) setUsuarios(d.data);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar usuario');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al actualizar usuario');
    }
  }, [apiBase, apiFetch]);

  const deleteUsuario = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/auth/users.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' })
      });
      if (res.ok) {
        // Recargar usuarios
        const resUsr = await apiFetch(`${base}/api/auth/users.php`);
        if (resUsr.ok) {
          const d = await resUsr.json();
          if (d.data) setUsuarios(d.data);
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar usuario');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error al eliminar usuario');
    }
  }, [apiBase, apiFetch]);

  const resetDemo = useCallback(() => {
    // Limpiar solo cache de catálogos; datos operativos vienen del API
    clearStorage();
    window.location.reload();
  }, []);

  const addEmpleado = useCallback(async (emp: Omit<Empleado, 'id'>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/crear.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.data) {
          setEmpleados(prev => [...prev, data.data]);
        } else {
          await fetchCatalogos();
        }
      } else {
        alert('Error al registrar el empleado en el servidor.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al registrar empleado.');
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateEmpleado = useCallback(async (id: number, emp: Partial<Empleado>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/editar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...emp })
      });
      if (res.ok) {
        setEmpleados(prev => prev.map(e => e.id === id ? { ...e, ...emp } : e));
      } else {
        alert('Error al actualizar el empleado en el servidor.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al actualizar empleado.');
    }
  }, [apiBase, apiFetch]);

  const deleteEmpleado = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/eliminar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setEmpleados(prev => prev.filter(e => e.id !== id));
        await fetchCatalogos();
      } else {
        alert('Error al eliminar el empleado del servidor.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red al eliminar empleado.');
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  return {
    currentUser, login, logout, checkAuth, fetchCatalogos, fetchOperativos,
    productos, categorias, clientes, empleados, tiendas, acabados,
    inventario, materiaPrima, workOrders, pedidos, terminados, embarques, ventas, devoluciones,
    moveWorkOrder, crearPedido, editarPedido, eliminarPedido, crearEmbarque,
    cancelarEmbarque,
    updateEmbarqueStatus,
    confirmarRecepcion, registrarVentaQR, registrarVentaCarrito, updateMateriaPrima, guardarMateriaPrima, updateStockTienda,
    usuarios, addUsuario, updateUsuario, deleteUsuario,
    addCliente, updateCliente, deleteCliente,
    addTienda, updateTienda, deleteTienda,
    addAcabado, updateAcabado, deleteAcabado,
    guardarComoProducto, updateProducto, addProducto, acabadosList,
    addEmpleado, updateEmpleado, deleteEmpleado,
    resetDemo, isInitialized: true, apiBase, apiFetch,
  };
}
