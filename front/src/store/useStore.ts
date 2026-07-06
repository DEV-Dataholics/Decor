import { useState, useCallback, useEffect } from 'react';

// --- Importar datos JSON iniciales ---
import productosData from '../data/productos.json';
import categoriasData from '../data/categorias.json';
import clientesData from '../data/clientes.json';
import empleadosData from '../data/empleados.json';
import tiendasData from '../data/tiendas.json';
import usuariosData from '../data/usuarios.json';
import inventarioData from '../data/inventario-inicial.json';
import workOrdersData from '../data/work-orders.json';
import pedidosData from '../data/pedidos.json';
import embarquesData from '../data/embarques.json';
import ventasData from '../data/ventas.json';
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
}

export interface Venta {
  id: number; tienda_id: number; fecha_venta: string;
  total: number; items: VentaItem[];
}

export interface DecorStore {
  // Auth
  currentUser: Usuario | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  // Data
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
  moveWorkOrder: (id: number, newStatus: WOStatus, assignment?: { empleado_id: number; empleado_nombre: string; costo_mano_obra: number }) => void;
  crearPedido: (pedido: Omit<Pedido, 'id'>) => Pedido;
  editarPedido: (id: number, pedidoData: Omit<Pedido, 'id' | 'fecha_creacion'>) => boolean;
  eliminarPedido: (id: number) => boolean;
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
  
  // En producción, el inventario y transacciones inician vacíos, y la materia prima en 0
  const [inventario, setInventario] = useState<InventarioItem[]>(() => getOrInit('inventario', []));
  const [materiaPrima, setMateriaPrima] = useState<MateriaPrima[]>(() => {
    const initialMp = (materiaPrimaData as MateriaPrima[]).map(mp => ({ ...mp, cantidad: 0 }));
    return getOrInit('materiaPrima', initialMp);
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => getOrInit('workOrders2', []));
  const [pedidos, setPedidos] = useState<Pedido[]>(() => getOrInit('pedidos', []));
  const [terminados, setTerminados] = useState<TerminadoSinEmbarcar[]>(() => getOrInit('terminados', []));
  const [embarques, setEmbarques] = useState<Embarque[]>(() => getOrInit('embarques2', []));
  const [ventas, setVentas] = useState<Venta[]>(() => getOrInit('ventas2', []));
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>(() => getOrInit('devoluciones', []));

  // Persist
  useEffect(() => { saveToStorage('productos', productos); }, [productos]);
  useEffect(() => { saveToStorage('clientes', clientes); }, [clientes]);
  useEffect(() => { saveToStorage('tiendas', tiendas); }, [tiendas]);
  useEffect(() => { saveToStorage('acabados', acabados); }, [acabados]);
  useEffect(() => { saveToStorage('inventario', inventario); }, [inventario]);
  useEffect(() => { saveToStorage('materiaPrima', materiaPrima); }, [materiaPrima]);
  useEffect(() => { saveToStorage('workOrders2', workOrders); }, [workOrders]);
  useEffect(() => { saveToStorage('pedidos', pedidos); }, [pedidos]);
  useEffect(() => { saveToStorage('terminados', terminados); }, [terminados]);
  useEffect(() => { saveToStorage('embarques2', embarques); }, [embarques]);
  useEffect(() => { saveToStorage('ventas2', ventas); }, [ventas]);
  useEffect(() => { saveToStorage('devoluciones', devoluciones); }, [devoluciones]);
  useEffect(() => { saveToStorage('empleados', empleados); }, [empleados]);

  const login = useCallback((email: string, password: string): boolean => {
    const user = (usuariosData as Usuario[]).find(u => u.email === email);
    if (user && user.password === password) { 
      setCurrentUser(user); 
      saveToStorage('currentUser', user); 
      return true; 
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_PREFIX + 'currentUser');
  }, []);

  const moveWorkOrder = useCallback((
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
    const woToMove = workOrders.find(w => w.id === id);
    if (!woToMove) return;

    if (assignment && assignment.cantidad_asignada && assignment.cantidad_asignada < woToMove.cantidad) {
      const cantAsig = assignment.cantidad_asignada;
      const cantRestante = woToMove.cantidad - cantAsig;

      const nuevaWO: WorkOrder = {
        ...woToMove,
        id: Date.now() + Math.floor(Math.random() * 1000),
        cantidad: cantAsig,
        estatus: newStatus,
        ...(newStatus === 'acabados' ? {
          empleado_acabado_id: assignment.empleado_id,
          empleado_acabado_nombre: assignment.empleado_nombre,
          costo_acabado: assignment.costo_mano_obra,
          costo_acabado_unitario: assignment.costo_mano_obra_unitario
        } : {
          empleado_id: assignment.empleado_id,
          empleado_nombre: assignment.empleado_nombre,
          costo_mano_obra: assignment.costo_mano_obra,
          costo_mano_obra_unitario: assignment.costo_mano_obra_unitario,
        }),
        ...(newStatus === 'listo_embarque' ? { fecha_termino: new Date().toISOString().split('T')[0] } : {})
      };

      setWorkOrders(prev => {
        return prev.map(wo => {
          if (wo.id === id) {
            return { ...wo, cantidad: cantRestante };
          }
          return wo;
        }).concat(nuevaWO);
      });

      // Si pasa a listo_embarque, generar terminados para la cantidad asignada parcial
      if (newStatus === 'listo_embarque') {
        const prod = (productosData as Producto[]).find(p => p.id === woToMove.producto_id);
        const price = prod ? Object.values(prod.prices)[0] || 200 : 200;
        const ts = Date.now();
        const nuevosTerminados = Array.from({ length: cantAsig }).map((_, j) => ({
          id: ts + j,
          qr_code: `DCR-${ts}-${nuevaWO.id}-${j}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          producto_id: woToMove.producto_id,
          producto_nombre: woToMove.producto_nombre,
          codigo_sku: woToMove.codigo_sku,
          orden_id: woToMove.orden_id,
          cliente_nombre: woToMove.cliente_nombre,
          acabado: woToMove.acabado_nombre,
          fecha_listo: new Date().toISOString().split('T')[0],
          precio_estimado: price,
        }));
        setTerminados(prev => [...nuevosTerminados, ...prev]);
      }
    } else {
      // Asignación total o actualización normal de estado
      setWorkOrders(prev => prev.map(wo => wo.id === id ? { 
        ...wo, 
        estatus: newStatus,
        ...(newStatus === 'listo_embarque' ? { fecha_termino: new Date().toISOString().split('T')[0] } : {}),
        ...(assignment ? (
          newStatus === 'acabados' ? {
            empleado_acabado_id: assignment.empleado_id,
            empleado_acabado_nombre: assignment.empleado_nombre,
            costo_acabado: assignment.costo_mano_obra,
            costo_acabado_unitario: assignment.costo_mano_obra_unitario
          } : {
            empleado_id: assignment.empleado_id,
            empleado_nombre: assignment.empleado_nombre,
            costo_mano_obra: assignment.costo_mano_obra,
            costo_mano_obra_unitario: assignment.costo_mano_obra_unitario
          }
        ) : {})
      } : wo));

      if (woToMove.estatus !== 'listo_embarque' && newStatus === 'listo_embarque') {
        const prod = (productosData as Producto[]).find(p => p.id === woToMove.producto_id);
        const price = prod ? Object.values(prod.prices)[0] || 200 : 200;
        const ts = Date.now();
        const nuevosTerminados = Array.from({ length: woToMove.cantidad }).map((_, j) => ({
          id: ts + j,
          qr_code: `DCR-${ts}-${woToMove.id}-${j}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          producto_id: woToMove.producto_id,
          producto_nombre: woToMove.producto_nombre,
          codigo_sku: woToMove.codigo_sku,
          orden_id: woToMove.orden_id,
          cliente_nombre: woToMove.cliente_nombre,
          acabado: woToMove.acabado_nombre,
          fecha_listo: new Date().toISOString().split('T')[0],
          precio_estimado: price,
        }));
        setTerminados(prev => [...nuevosTerminados, ...prev]);
      }
    }
  }, [workOrders]);

  const crearPedido = useCallback((pedido: Omit<Pedido, 'id'>): Pedido => {
    let newPedido: Pedido;
    setPedidos(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) : 2000;
      newPedido = { ...pedido, id: maxId + 1 } as Pedido;
      return [newPedido, ...prev];
    });

    // @ts-ignore
    const newWOs: WorkOrder[] = newPedido.items.map((item, i) => ({
      id: Date.now() + i + 1,
      orden_id: newPedido.id, // now properly sequential
      producto_id: item.producto_id,
      producto_nombre: item.producto_nombre,
      codigo_sku: item.codigo_sku,
      cantidad: item.cantidad,
      estatus: 'pendiente' as WOStatus,
      fecha_asignacion: new Date().toISOString().split('T')[0],
      acabado_nombre: item.acabado || 'Natural',
      cliente_nombre: newPedido.cliente_nombre,
    }));
    setWorkOrders(prev => [...newWOs, ...prev]);
    return newPedido!;
  }, []);

  const editarPedido = useCallback((id: number, pedidoData: Omit<Pedido, 'id' | 'fecha_creacion'>): boolean => {
    const relatedWOs = workOrders.filter(wo => wo.orden_id === id);
    if (relatedWOs.some(wo => wo.estatus !== 'pendiente')) return false;

    setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...pedidoData } : p));
    setWorkOrders(prev => {
      const filtered = prev.filter(wo => wo.orden_id !== id);
      const newWOs: WorkOrder[] = pedidoData.items.map((item, i) => ({
        id: Date.now() + i + 1,
        orden_id: id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        codigo_sku: item.codigo_sku,
        cantidad: item.cantidad,
        estatus: 'pendiente' as WOStatus,
        fecha_asignacion: new Date().toISOString().split('T')[0],
        acabado_nombre: item.acabado || 'Natural',
        cliente_nombre: pedidoData.cliente_nombre,
      }));
      return [...newWOs, ...filtered];
    });
    return true;
  }, [workOrders]);

  const eliminarPedido = useCallback((id: number): boolean => {
    const relatedWOs = workOrders.filter(wo => wo.orden_id === id);
    if (relatedWOs.some(wo => wo.estatus !== 'pendiente')) return false;

    setWorkOrders(prev => prev.filter(wo => wo.orden_id !== id));
    setPedidos(prev => prev.filter(p => p.id !== id));
    return true;
  }, [workOrders]);

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
    saveToStorage('workOrders2', []);
    saveToStorage('pedidos', []);
    saveToStorage('terminados', []);
    saveToStorage('embarques2', []);
    saveToStorage('ventas2', []);
    saveToStorage('inventario', []);
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
    currentUser, login, logout,
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
