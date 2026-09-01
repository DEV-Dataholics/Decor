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
  ubicacion_especifica?: string;
}

export interface MateriaPrima {
  id: number;
  nombre: string;
  unidad: string;
  cantidad: number;
  minimo: number;
  maximo?: number;
  tipo?: string;
  subtipo?: string;
  costo_unitario?: number;
  codigo_referencia?: string;
  color: string;
}

export type WOStatus = 'pendiente' | 'en_produccion' | 'acabados' | 'listo_embarque';

export interface WorkOrder {
  id: number; orden_id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  cantidad: number; estatus: WOStatus; fecha_asignacion: string;
  acabado_nombre: string; cliente_nombre: string;
  orden_item_id?: number;
  estatus_item?: string;
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
  orden_item_id?: number;
  estatus_item?: string;
  acabado: string; fecha_listo: string;
  precio_estimado: number;
  cantidad?: number;
}

export interface EmbarqueItem {
  id: number; producto_id: number; producto_nombre: string; codigo_sku: string;
  qr_code: string; precio_unitario: number;
  embarcado: boolean; recibido_en_tienda: boolean;
  cantidad?: number;
  cantidad_recibida?: number;
  cantidad_danada?: number;
  estado_recepcion?: 'ok' | 'faltante' | 'danado' | 'dañado' | 'rechazado' | 'pendiente';
  original_terminado?: TerminadoSinEmbarcar;
  tienda_destino_id: number;
  cliente_nombre: string;
  orden_id?: number;
  orden_item_id?: number;
  acabado?: string;
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

export interface CajaTienda {
  caja_id: number;
  nombre: string;
  fondo_inicial: number;
  total_efectivo_esperado: number;
  fecha_apertura: string;
  estatus?: 'abierta' | 'cerrada';
}

export interface CheckoutItemPayload {
  inventario_tienda_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento_item?: number;
}

export interface CheckoutPagoPayload {
  metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'credito_cliente';
  monto: number;
  referencia?: string;
}

export interface CheckoutPayload {
  caja_id: number;
  tienda_id: number;
  cliente_id?: number | null;
  cliente_nombre_libre?: string;
  items: CheckoutItemPayload[];
  pagos: CheckoutPagoPayload[];
}

export interface VentaBackend {
  venta_id: number;
  tienda_id: number;
  tienda_nombre: string;
  caja_id: number;
  cliente_id: number | null;
  cliente_nombre: string;
  cliente_email?: string;
  fecha_venta: string;
  estatus: string;
  subtotal: number;
  descuento_total: number;
  impuestos: number;
  total: number;
  cajero_nombre: string;
  items: {
    id: number;
    venta_id: number;
    inventario_tienda_id: number;
    producto_id: number;
    producto_nombre: string;
    codigo_sku: string;
    cantidad: number;
    precio_unitario: number;
    descuento_item: number;
    subtotal: number;
  }[];
  pagos: {
    id: number;
    venta_id: number;
    metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'credito_cliente';
    monto: number;
    referencia: string | null;
    fecha: string;
  }[];
}

export interface AjusteInventarioPayload {
  producto_id: number;
  tienda_id: number;
  tipo: 'entrada' | 'ajuste';
  cantidad: number;
  precio_venta?: number;
  costo_unitario?: number;
  origen_stock: 'embarque_taller' | 'compra_externa' | 'artesania' | 'pieza_unica';
  notas?: string;
  es_absoluto?: boolean;
}

export interface DecorStore {
  // Auth
  currentUser: Usuario | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchCatalogos: () => Promise<void>;
  fetchOperativos: () => Promise<void>;
  fetchInventarioTienda: (tiendaId?: number | 'todas') => Promise<void>;
  ajustarInventarioManual: (payload: AjusteInventarioPayload) => Promise<{ ok: boolean; message?: string }>;
  fetchCajaActiva: (tiendaId: number) => Promise<CajaTienda | null>;
  cerrarCaja: (cajaId: number, contado: number) => Promise<{ ok: boolean; diferencia?: number; esperado?: number; contado?: number; mensaje?: string; error?: string }>;
  procesarCheckout: (payload: CheckoutPayload) => Promise<{ ok: boolean; venta_id?: number; folio?: string; total?: number; mensaje?: string; error?: string }>;
  fetchVentas: (params?: { tienda_id?: number | string; fecha_inicio?: string; fecha_fin?: string }) => Promise<void>;
  cajaActiva: CajaTienda | null;
  ventasRealizadas: VentaBackend[];
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
  crearEmbarque: (embarque: Omit<Embarque, 'id'>) => Promise<Embarque> | Embarque;
  cancelarEmbarque: (id: number) => Promise<void> | void;
  updateEmbarqueStatus: (id: number, newStatus: string) => Promise<void> | void;
  confirmarRecepcion: (embarqueId: number, items: EmbarqueItem[]) => Promise<void> | void;
  registrarVentaQR: (qrCode: string, tiendaId: number) => boolean;
  registrarVentaCarrito: (tiendaId: number, qrCodes: string[]) => Venta | null;
  updateMateriaPrima: (id: number, delta: number) => Promise<void> | void;
  crearMateriaPrima: (mat: any) => Promise<{ ok: boolean; message?: string; id?: number }>;
  actualizarMateriaPrima: (id: number, mat: any) => Promise<{ ok: boolean; message?: string }>;
  eliminarMateriaPrima: (id: number) => Promise<{ ok: boolean; message?: string }>;
  addCliente: (cli: Omit<Cliente, 'id'>) => Promise<void> | void;
  updateCliente: (id: number, cli: Partial<Cliente>) => Promise<void> | void;
  deleteCliente: (id: number) => Promise<void> | void;
  addEmpleado: (emp: Omit<Empleado, 'id'>) => Promise<void> | void;
  updateEmpleado: (id: number, emp: Partial<Empleado>) => Promise<void> | void;
  deleteEmpleado: (id: number) => Promise<void> | void;
  addTienda: (tienda: Omit<Tienda, 'id'>) => Promise<void> | void;
  updateTienda: (id: number, tienda: Partial<Tienda>) => Promise<void> | void;
  deleteTienda: (id: number) => Promise<void> | void;
  addAcabado: (acabado: string) => Promise<void> | void;
  updateAcabado: (oldAcabado: string, newAcabado: string) => Promise<void> | void;
  deleteAcabado: (acabado: string) => Promise<void> | void;
  guardarComoProducto: (item: PedidoItem) => Producto;
  updateProducto: (id: number, prod: Partial<Producto>) => void;
  crearProducto: (prod: any) => Promise<{ ok: boolean; message?: string; id?: number }>;
  actualizarProducto: (id: number, prod: any) => Promise<{ ok: boolean; message?: string }>;
  eliminarProducto: (id: number) => Promise<{ ok: boolean; message?: string; accion?: string }>;
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
  const [cajaActiva, setCajaActiva] = useState<CajaTienda | null>(null);
  const [ventasRealizadas, setVentasRealizadas] = useState<VentaBackend[]>([]);

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
    return isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost/sistema_decor');
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
        apiFetch(`${base}/api/productos/list.php?todos=1`),
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
      const [resPed, resWo, resInv, resMat, resEmb] = await Promise.all([
        apiFetch(`${base}/api/pedidos/ordenes.php`),
        apiFetch(`${base}/api/produccion/work_orders.php`),
        apiFetch(`${base}/api/inventario/list_tienda.php?tienda_id=todas`),
        apiFetch(`${base}/api/taller/materiales.php`),
        apiFetch(`${base}/api/embarques/list.php`),
      ]);
      if (resPed.ok) { 
        const d = await resPed.json(); 
        if (d.data) {
          const rawList = Array.isArray(d.data) ? d.data : [];
          const mappedPedidos: Pedido[] = rawList.map((p: any) => ({
            id: Number(p.id),
            fecha_creacion: p.fecha_creacion || '',
            estatus: p.estatus || 'confirmada',
            tipo_orden: p.tipo_orden || 'linea',
            cliente_id: Number(p.cliente_id) || 1,
            cliente_nombre: p.cliente_nombre || 'Cliente General',
            cliente_email: p.cliente_email || '',
            total: parseFloat(p.total || '0'),
            total_items: Number(p.total_items) || (p.items ? p.items.length : 0),
            notas: p.notas || '',
            items: (p.items || []).map((it: any) => ({
              id: Number(it.id),
              producto_id: Number(it.producto_id),
              producto_nombre: it.producto_nombre || '',
              codigo_sku: it.codigo_sku || '',
              cantidad: parseFloat(it.cantidad || '1'),
              precio_unitario: parseFloat(it.precio_unitario || '0'),
              subtotal: parseFloat(it.subtotal || '0'),
              tipo_pedido: (p.tipo_orden === 'especial' ? 'orden_especial' : 'linea') as TipoPedido,
              acabado: it.acabado || it.acabado_nombre || '',
              notas: it.notas || '',
              medidas: it.medidas || undefined,
              diagrama_url: it.diagrama_url || undefined,
            }))
          }));
          setPedidos(mappedPedidos);
        }
      }
      if (resWo.ok) {
        const d = await resWo.json();
        if (d.data) {
          const rawWo = (Array.isArray(d.data) ? d.data : (d.data.items || []));
          const allWo: WorkOrder[] = rawWo.map((w: any) => ({
            id: Number(w.id),
            orden_id: Number(w.orden_id) || 0,
            orden_item_id: Number(w.orden_item_id) || 0,
            producto_id: Number(w.producto_id) || 0,
            producto_nombre: w.producto_nombre || '',
            codigo_sku: w.codigo_sku || '',
            cantidad: parseFloat(w.cantidad || '1'),
            estatus: w.estatus as WOStatus,
            fecha_asignacion: w.fecha_asignacion || '',
            acabado_nombre: w.acabado_nombre || '',
            cliente_nombre: w.cliente_nombre || '',
            estatus_item: w.estatus_item || '',
            empleado_id: w.empleado_id !== undefined && w.empleado_id !== null ? Number(w.empleado_id) : undefined,
            empleado_nombre: w.empleado_nombre || '',
            costo_mano_obra: parseFloat(w.costo_mano_obra || w.monto_pago || '0'),
            costo_mano_obra_unitario: parseFloat(w.costo_mano_obra_unitario || '0'),
            fecha_termino: w.fecha_termino || w.fecha_terminado || '',
            rechazos: Number(w.rechazos) || 0
          }));
          // Mantener todas las órdenes de trabajo en el tablero Kanban (incluyendo listo_embarque)
          setWorkOrders(allWo);
          
          // Sincronizar piezas terminadas para el módulo de Embarques (excluyendo las ya embarcadas o entregadas)
          const terminadoStatuses = ['listo_embarque', 'terminado'];
          setTerminados(allWo.filter((w: WorkOrder) => 
            terminadoStatuses.includes(w.estatus) && 
            w.estatus_item !== 'embarcado' && 
            w.estatus_item !== 'entregado'
          ).map((w: WorkOrder) => ({
            id: w.id, 
            orden_id: w.orden_id || 0, 
            orden_item_id: w.orden_item_id || 0,
            estatus_item: w.estatus_item || 'terminado',
            producto_id: w.producto_id || 0,
            producto_nombre: w.producto_nombre || '', 
            codigo_sku: w.codigo_sku || '',
            acabado: w.acabado_nombre || '', 
            qr_code: `QR-${w.id}`, 
            cantidad: Number(w.cantidad) || 1,
            cliente_nombre: w.cliente_nombre || '', 
            fecha_listo: w.fecha_termino || '',
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
      if (resMat && resMat.ok) {
        const d = await resMat.json();
        if (d.data?.items) setMateriaPrima(d.data.items);
      }
      if (resEmb && resEmb.ok) {
        const d = await resEmb.json();
        if (d.data?.items) setEmbarques(d.data.items);
      }
    } catch (e) { console.error('Error fetching operativos:', e); }
  }, [apiBase, apiFetch]);

  const fetchInventarioTienda = useCallback(async (tiendaId: number | 'todas' = 'todas') => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/inventario/list_tienda.php?tienda_id=${tiendaId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.data?.items) {
          const mapped: InventarioItem[] = d.data.items.map((item: any) => ({
            id: Number(item.inventario_tienda_id) || Number(item.producto_id),
            tienda_id: Number(item.tienda_id) || (typeof tiendaId === 'number' ? tiendaId : 1),
            producto_id: Number(item.producto_id),
            cantidad_disponible: Number(item.cantidad_disponible) || 0,
            cantidad_reservada: Number(item.cantidad_reservada) || 0,
            origen_stock: item.origen_stock || 'embarque_taller',
            costo_unitario: Number(item.costo_unitario) || 0,
            precio_venta: Number(item.precio_venta) || 0,
          }));
          if (tiendaId === 'todas' || tiendaId === 0) {
            setInventario(mapped);
          } else {
            setInventario(prev => {
              const others = prev.filter(i => Number(i.tienda_id) !== Number(tiendaId));
              return [...others, ...mapped];
            });
          }
        }
      }
    } catch (e) {
      console.error('Error fetching inventario tienda:', e);
    }
  }, [apiBase, apiFetch]);

  const ajustarInventarioManual = useCallback(async (payload: AjusteInventarioPayload): Promise<{ ok: boolean; message?: string }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/inventario/ajuste_manual.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchInventarioTienda(payload.tienda_id);
        return { ok: true, message: data.mensaje || 'Ajuste de inventario aplicado con éxito' };
      }
      return { ok: false, message: data.error || 'Error al procesar el ajuste de inventario' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión con el servidor' };
    }
  }, [apiBase, apiFetch, fetchInventarioTienda]);

  const fetchCajaActiva = useCallback(async (tiendaId: number): Promise<CajaTienda | null> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/ventas/caja.php?tienda_id=${tiendaId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.ok && d.caja) {
          const c: CajaTienda = {
            caja_id: Number(d.caja_id || d.caja.caja_id),
            nombre: d.caja.nombre || 'Caja 1',
            fondo_inicial: Number(d.caja.fondo_inicial) || 0,
            total_efectivo_esperado: Number(d.caja.total_efectivo_esperado) || 0,
            fecha_apertura: d.caja.fecha_apertura || new Date().toISOString(),
            estatus: 'abierta'
          };
          setCajaActiva(c);
          return c;
        } else if (d.ok && d.caja_id) {
          const c: CajaTienda = {
            caja_id: Number(d.caja_id),
            nombre: 'Caja 1',
            fondo_inicial: 0,
            total_efectivo_esperado: 0,
            fecha_apertura: new Date().toISOString(),
            estatus: 'abierta'
          };
          setCajaActiva(c);
          return c;
        }
      }
      return null;
    } catch (e) {
      console.error('Error fetching caja activa:', e);
      return null;
    }
  }, [apiBase, apiFetch]);

  const cerrarCaja = useCallback(async (cajaId: number, contado: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/ventas/caja.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caja_id: cajaId, total_efectivo_contado: contado })
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setCajaActiva(null);
        return {
          ok: true,
          diferencia: Number(d.diferencia) || 0,
          esperado: Number(d.esperado) || 0,
          contado: Number(d.contado) || 0,
          mensaje: d.mensaje || 'Caja cerrada correctamente'
        };
      }
      return { ok: false, error: d.error || 'Error al cerrar caja' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch]);

  const fetchVentas = useCallback(async (params?: { tienda_id?: number | string; fecha_inicio?: string; fecha_fin?: string }) => {
    try {
      const base = apiBase();
      const qs = new URLSearchParams();
      if (params?.tienda_id && params.tienda_id !== 'todas') qs.set('tienda_id', String(params.tienda_id));
      if (params?.fecha_inicio) qs.set('fecha_inicio', params.fecha_inicio);
      if (params?.fecha_fin) qs.set('fecha_fin', params.fecha_fin);
      const url = `${base}/api/ventas/list.php${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const d = await res.json();
        if (d.data?.items) {
          setVentasRealizadas(d.data.items);
        }
      }
    } catch (e) {
      console.error('Error fetching ventas:', e);
    }
  }, [apiBase, apiFetch]);

  const procesarCheckout = useCallback(async (payload: CheckoutPayload) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/ventas/checkout.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        await Promise.all([
          fetchInventarioTienda(payload.tienda_id),
          fetchCajaActiva(payload.tienda_id),
          fetchVentas({ tienda_id: payload.tienda_id })
        ]);
        return {
          ok: true,
          venta_id: d.venta_id,
          folio: d.folio || String(d.venta_id || '').padStart(6, '0'),
          total: d.total,
          mensaje: d.mensaje || 'Venta registrada con éxito'
        };
      }
      return { ok: false, error: d.error || 'Error al procesar la venta' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de conexión con el servidor' };
    }
  }, [apiBase, apiFetch, fetchInventarioTienda, fetchCajaActiva, fetchVentas]);

  // Auto-cargar datos al loguearse
  useEffect(() => {
    if (currentUser) {
      fetchCatalogos();
      fetchOperativos();
      fetchVentas();
    }
  }, [currentUser, fetchCatalogos, fetchOperativos, fetchVentas]);


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

  const crearEmbarque = useCallback(async (embarque: Omit<Embarque, 'id'>): Promise<Embarque> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/embarques/crear.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embarque)
      });
      const d = await res.json();
      const serverEmbarque = d.data && d.data.id ? (d.data as Embarque) : null;
      const newEmbarque = serverEmbarque || ({ ...embarque, id: Date.now() } as Embarque);
      
      setEmbarques(prev => [newEmbarque, ...prev]);
      const qrCodes = new Set(embarque.items.map(i => i.qr_code));
      setTerminados(prev => prev.filter(t => !qrCodes.has(t.qr_code)));
      await fetchOperativos();
      return newEmbarque;
    } catch (e) {
      console.error('Error creating embarque:', e);
      const newEmbarque = { ...embarque, id: Date.now() } as Embarque;
      setEmbarques(prev => [newEmbarque, ...prev]);
      return newEmbarque;
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const cancelarEmbarque = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      await apiFetch(`${base}/api/embarques/cancelar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await fetchOperativos();
    } catch (e) {
      console.error('Error canceling embarque:', e);
      const emb = embarques.find(e => e.id === id);
      if (emb) {
        const restored = emb.items.map(i => i.original_terminado).filter(Boolean) as TerminadoSinEmbarcar[];
        setTerminados(tPrev => [...restored, ...tPrev]);
      }
      setEmbarques(prev => prev.filter(e => e.id !== id));
    }
  }, [apiBase, apiFetch, fetchOperativos, embarques]);

  const updateEmbarqueStatus = useCallback(async (id: number, newStatus: string) => {
    setEmbarques(prev => prev.map(e => e.id === id ? { ...e, estatus: newStatus } : e));
    try {
      const base = apiBase();
      await apiFetch(`${base}/api/embarques/status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estatus: newStatus })
      });
      await fetchOperativos();
    } catch (e) {
      console.error('Error updating embarque status:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const confirmarRecepcion = useCallback(async (embarqueId: number, items: EmbarqueItem[]) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/embarques/recibir.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embarque_id: embarqueId,
          items: items.map(i => ({
            embarque_item_id: i.id,
            producto_id: i.producto_id,
            orden_item_id: i.orden_item_id,
            cantidad_recibida: i.estado_recepcion === 'ok' ? (i.cantidad || 1) : 0,
            cantidad_danada: (i.estado_recepcion === 'dañado' || i.estado_recepcion === 'danado') ? (i.cantidad || 1) : 0
          }))
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al procesar recepción en el servidor');
      }

      setEmbarques(prev => prev.map(e =>
        e.id === embarqueId ? { ...e, estatus: 'entregado', items } : e
      ));

      await fetchOperativos();
      await fetchInventarioTienda();
    } catch (e) {
      console.error('Error confirming embarque reception:', e);
      throw e;
    }
  }, [apiBase, apiFetch, fetchOperativos, fetchInventarioTienda]);

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

  const updateMateriaPrima = useCallback(async (id: number, delta: number) => {
    setMateriaPrima(prev => prev.map(mp =>
      mp.id === id ? { ...mp, cantidad: Math.max(0, mp.cantidad + delta) } : mp
    ));
    try {
      const base = apiBase();
      await apiFetch(`${base}/api/taller/update_material.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, delta })
      });
      await fetchOperativos();
    } catch (e) {
      console.error('Error updating material stock:', e);
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const addCliente = useCallback(async (cli: Omit<Cliente, 'id'>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/clientes/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cli)
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error adding cliente:', e);
      setClientes(prev => [...prev, { ...cli, id: Date.now() }]);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateCliente = useCallback(async (id: number, cli: Partial<Cliente>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/clientes/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...cli })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error updating cliente:', e);
      setClientes(prev => prev.map(c => c.id === id ? { ...c, ...cli } : c));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteCliente = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/clientes/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error deleting cliente:', e);
      setClientes(prev => prev.filter(c => c.id !== id));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const addEmpleado = useCallback(async (emp: Omit<Empleado, 'id'>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error adding empleado:', e);
      setEmpleados(prev => [...prev, { ...emp, id: Date.now() }]);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateEmpleado = useCallback(async (id: number, emp: Partial<Empleado>) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...emp })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error updating empleado:', e);
      setEmpleados(prev => prev.map(e => e.id === id ? { ...e, ...emp } : e));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteEmpleado = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/empleados/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error deleting empleado:', e);
      setEmpleados(prev => prev.filter(e => e.id !== id));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

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
      console.error('Error adding tienda:', e);
      setTiendas(prev => [...prev, { ...tienda, id: Date.now() }]);
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
      console.error('Error updating tienda:', e);
      setTiendas(prev => prev.map(t => t.id === id ? { ...t, ...tienda } : t));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteTienda = useCallback(async (id: number) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/tiendas/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error deleting tienda:', e);
      setTiendas(prev => prev.filter(t => t.id !== id));
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
      console.error('Error adding acabado:', e);
      setAcabados(prev => prev.includes(acabado) ? prev : [...prev, acabado]);
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const updateAcabado = useCallback(async (oldAcabado: string, newAcabado: string) => {
    try {
      const base = apiBase();
      await apiFetch(`${base}/api/acabados/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: oldAcabado })
      });
      await apiFetch(`${base}/api/acabados/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newAcabado })
      });
      await fetchCatalogos();
    } catch (e) {
      console.error('Error updating acabado:', e);
      setAcabados(prev => prev.map(a => a === oldAcabado ? newAcabado : a));
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const deleteAcabado = useCallback(async (acabado: string) => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/acabados/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: acabado })
      });
      if (res.ok) {
        await fetchCatalogos();
      }
    } catch (e) {
      console.error('Error deleting acabado:', e);
      setAcabados(prev => prev.filter(a => a !== acabado));
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

  const updateProducto = useCallback((id: number, prod: Partial<Producto>) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, ...prod } : p));
  }, []);

  const crearProducto = useCallback(async (prodData: any): Promise<{ ok: boolean; message?: string; id?: number }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/productos/save.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodData),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchCatalogos();
        return { ok: true, message: data.mensaje || 'Producto creado con éxito', id: data.id };
      }
      return { ok: false, message: data.error || 'Error al crear producto' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const actualizarProducto = useCallback(async (id: number, prodData: any): Promise<{ ok: boolean; message?: string }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/productos/save.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prodData, id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchCatalogos();
        return { ok: true, message: data.mensaje || 'Producto actualizado con éxito' };
      }
      return { ok: false, message: data.error || 'Error al actualizar producto' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const eliminarProducto = useCallback(async (id: number): Promise<{ ok: boolean; message?: string; accion?: string }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/productos/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setProductos(prev => prev.filter(p => p.id !== id));
        await fetchCatalogos();
        return { ok: true, message: data.mensaje || 'Producto procesado', accion: data.accion };
      }
      return { ok: false, message: data.error || 'Error al eliminar producto' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchCatalogos]);

  const resetDemo = useCallback(() => {
    // Limpiar solo cache de catálogos; datos operativos vienen del API
    clearStorage();
    window.location.reload();
  }, []);

  const crearMateriaPrima = useCallback(async (matData: any): Promise<{ ok: boolean; message?: string; id?: number }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/taller/save_material.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matData)
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        await fetchOperativos();
        return { ok: true, message: d.mensaje || 'Materia prima registrada', id: d.data?.id };
      }
      return { ok: false, message: d.error || 'Error al guardar materia prima' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const actualizarMateriaPrima = useCallback(async (id: number, matData: any): Promise<{ ok: boolean; message?: string }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/taller/save_material.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...matData, id })
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        await fetchOperativos();
        return { ok: true, message: d.mensaje || 'Materia prima actualizada' };
      }
      return { ok: false, message: d.error || 'Error al actualizar materia prima' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  const eliminarMateriaPrima = useCallback(async (id: number): Promise<{ ok: boolean; message?: string }> => {
    try {
      const base = apiBase();
      const res = await apiFetch(`${base}/api/taller/delete_material.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        await fetchOperativos();
        return { ok: true, message: d.mensaje || 'Materia prima eliminada' };
      }
      return { ok: false, message: d.error || 'Error al eliminar materia prima' };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Error de conexión' };
    }
  }, [apiBase, apiFetch, fetchOperativos]);

  return {
    currentUser, login, logout, checkAuth, fetchCatalogos, fetchOperativos,
    fetchInventarioTienda, ajustarInventarioManual,
    fetchCajaActiva, cerrarCaja, procesarCheckout, fetchVentas,
    cajaActiva, ventasRealizadas,
    productos, categorias, clientes, empleados, tiendas, acabados,
    inventario, materiaPrima, workOrders, pedidos, terminados, embarques, ventas, devoluciones,
    moveWorkOrder, crearPedido, editarPedido, eliminarPedido, crearEmbarque,
    cancelarEmbarque,
    updateEmbarqueStatus,
    confirmarRecepcion, registrarVentaQR, registrarVentaCarrito, updateMateriaPrima,
    crearMateriaPrima, actualizarMateriaPrima, eliminarMateriaPrima,
    addCliente, updateCliente, deleteCliente,
    addTienda, updateTienda, deleteTienda,
    addAcabado, updateAcabado, deleteAcabado,
    guardarComoProducto, updateProducto,
    crearProducto, actualizarProducto, eliminarProducto,
    addEmpleado, updateEmpleado, deleteEmpleado,
    resetDemo, isInitialized: true,
  };
}
