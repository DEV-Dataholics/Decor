/**
 * Parsea el CSV de productos y genera los JSON de datos para la demo.
 * Ejecutar: node scripts/parse-csv.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', '..', 'productos', 'Listas de productos y precios por cliente - Hoja 1 (1).csv');
const outDir = join(__dirname, '..', 'src', 'data');

mkdirSync(outDir, { recursive: true });

// --- Parse CSV ---
const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parsePrice(priceStr) {
  if (!priceStr || priceStr === '') return 0;
  // Format: "$133,00" or "$1.495,00"
  let cleaned = priceStr.replace(/^\$/, '').trim();
  // Remove thousands separator (period) and convert decimal comma to period
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Skip header
const header = parseCSVLine(lines[0]);
console.log('Header:', header);

const rawProducts = [];
const clientSet = new Set();
const typeSet = new Set();

for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  if (fields.length < 5) continue;
  const [name, price, lastUpdate, type, client] = fields;
  if (!name || !client) continue;

  const parsedPrice = parsePrice(price);
  clientSet.add(client);
  typeSet.add(type);

  rawProducts.push({
    name: name.trim(),
    price: parsedPrice,
    lastUpdate: lastUpdate?.trim() || '',
    type: type?.trim() || 'Varios',
    client: client?.trim() || ''
  });
}

console.log(`Parsed ${rawProducts.length} raw product-client entries`);
console.log('Clients:', [...clientSet]);
console.log('Types:', [...typeSet]);

// --- Build unique products catalog ---
// A product is unique by name. Different clients may have different prices.
const productMap = new Map();
let nextId = 1;

for (const rp of rawProducts) {
  const key = rp.name.toUpperCase();
  if (!productMap.has(key)) {
    productMap.set(key, {
      id: nextId++,
      name: rp.name,
      type: rp.type,
      sku: `DCR-${String(nextId - 1).padStart(4, '0')}`,
      prices: {}
    });
  }
  const prod = productMap.get(key);
  if (rp.price > 0) {
    prod.prices[rp.client] = rp.price;
  }
  // Keep the most common type
  if (!prod.type || prod.type === 'Varios') {
    prod.type = rp.type;
  }
}

const productos = [...productMap.values()];
console.log(`Unique products: ${productos.length}`);

// --- Categories ---
const categoryNames = [...typeSet].filter(Boolean).sort();
const categorias = categoryNames.map((name, i) => ({
  id: i + 1,
  nombre: name,
  icon: getCategoryIcon(name)
}));

function getCategoryIcon(name) {
  const map = {
    'Nightstand': '🛏️', 'hutch\'s': '🗄️', 'CD\'S': '📀', 'Buffet': '🍽️',
    'Jelly´s': '🚪', 'Coffee Tables': '☕', 'End Table': '🪑', 'Sofa Table': '🛋️',
    'Bookcases': '📚', 'dresser\'s, chest & mirror': '🪞', 'Bench': '🪵',
    'Desk': '💼', 'Chairs': '🪑', 'Barstools': '🍺', 'Tables and islands': '🍽️',
    'Bars': '🍹', 'Varios': '📦', 'headboard & beds': '🛏️', 'Armories': '🗄️',
    'Sideboard': '🗄️', 'Bistros': '🍽️', 'siso': '📦'
  };
  return map[name] || '📦';
}

// --- Clients ---
const clientNames = [...clientSet].filter(Boolean);
const clientes = clientNames.map((name, i) => ({
  id: i + 1,
  nombre: name,
  tipo: 'mayorista',
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@cliente.mx`,
  telefono: `+52 ${614 + i} ${String(100 + i * 37).padStart(3, '0')} ${String(2000 + i * 111).padStart(4, '0')}`,
  ciudad: ['Chihuahua', 'Monterrey', 'CDMX', 'Guadalajara', 'Tijuana', 'El Paso TX'][i % 6],
  credito_activo: true,
  limite_credito: 50000 + i * 10000,
  saldo_pendiente: Math.floor(Math.random() * 15000)
}));

// --- Empleados ---
const empleados = [
  { id: 1, nombre: 'Víctor Manuel López', rol: 'encargado', especialidades: ['supervisión', 'acabados'], tarifa_base: 0, activo: true },
  { id: 2, nombre: 'José García Ramírez', rol: 'carpintero', especialidades: ['sillas', 'mesas', 'bancos'], tarifa_base: 350, activo: true },
  { id: 3, nombre: 'Miguel Hernández Soto', rol: 'carpintero', especialidades: ['camas', 'libreros', 'gabinetes'], tarifa_base: 380, activo: true },
  { id: 4, nombre: 'Carlos Martínez Ruiz', rol: 'carpintero', especialidades: ['barras', 'hutches', 'buffets'], tarifa_base: 400, activo: true },
  { id: 5, nombre: 'Roberto Sánchez Díaz', rol: 'pintor', especialidades: ['manchas', 'lacas', 'distress'], tarifa_base: 320, activo: true },
  { id: 6, nombre: 'Fernando Torres Luna', rol: 'tapicero', especialidades: ['cuero', 'tela', 'cowhide'], tarifa_base: 360, activo: true },
  { id: 7, nombre: 'Alberto Morales Cruz', rol: 'carpintero', especialidades: ['mesas', 'escritorios'], tarifa_base: 370, activo: true },
  { id: 8, nombre: 'Pedro Jiménez Flores', rol: 'embalaje', especialidades: ['empaque', 'embarque'], tarifa_base: 280, activo: true },
];

// --- Tiendas ---
const tiendas = [
  { id: 1, nombre: 'Sucursal Matriz (Centro)', ciudad: 'Chihuahua', direccion: 'Av. Juárez #1234, Col. Centro', telefono: '+52 614 123 4567', activa: true },
  { id: 2, nombre: 'Sucursal Norte', ciudad: 'Chihuahua', direccion: 'Blvd. Ortiz Mena #5678, Col. San Felipe', telefono: '+52 614 234 5678', activa: true },
  { id: 3, nombre: 'Sucursal Sur', ciudad: 'Chihuahua', direccion: 'Periférico de la Juventud #9012, Col. Saucito', telefono: '+52 614 345 6789', activa: true },
];

// --- Usuarios (para login demo) ---
const usuarios = [
  { id: 1, nombre: 'Norma Ruiz', email: 'admin@decor.mx', password: 'demo', rol: 'admin', avatar: '👩‍💼' },
  { id: 2, nombre: 'Laura Mendoza', email: 'tienda@decor.mx', password: 'demo', rol: 'gerente_tienda', avatar: '🏪' },
  { id: 3, nombre: 'Víctor Manuel', email: 'taller@decor.mx', password: 'demo', rol: 'encargado_taller', avatar: '🔨' },
];

// --- Inventario inicial (stock aleatorio para ~300 productos) ---
const origenes = ['embarque_taller', 'compra_externa', 'artesania'];
const inventarioInicial = productos.slice(0, 300).map((prod, i) => {
  const basePrice = Object.values(prod.prices)[0] || 100;
  return {
    id: i + 1,
    tienda_id: (i % 3) + 1,
    producto_id: prod.id,
    cantidad_disponible: Math.floor(Math.random() * 15) + 1,
    cantidad_reservada: Math.floor(Math.random() * 3),
    origen_stock: origenes[i % 3],
    costo_unitario: Math.round(basePrice * 0.45 * 100) / 100,
    precio_venta: basePrice,
  };
});

// --- Work Orders demo ---
const woStatuses = ['pendiente', 'en_progreso', 'en_revision', 'terminado', 'entregado'];
const workOrders = [];
for (let i = 0; i < 24; i++) {
  const prod = productos[Math.floor(Math.random() * Math.min(100, productos.length))];
  const emp = empleados[1 + Math.floor(Math.random() * (empleados.length - 1))]; // skip encargado
  const statusIdx = i < 6 ? 0 : i < 12 ? 1 : i < 16 ? 2 : i < 20 ? 3 : 4;
  workOrders.push({
    id: i + 1,
    orden_id: 1000 + Math.floor(i / 3),
    producto_id: prod.id,
    producto_nombre: prod.name,
    codigo_sku: prod.sku,
    cantidad: Math.floor(Math.random() * 5) + 1,
    empleado_id: emp.id,
    empleado_nombre: emp.nombre,
    empleado_rol: emp.rol,
    estatus: woStatuses[statusIdx],
    fecha_asignacion: new Date(Date.now() - (30 - i) * 86400000).toISOString().split('T')[0],
    fecha_terminado: statusIdx >= 3 ? new Date(Date.now() - (10 - i) * 86400000).toISOString().split('T')[0] : null,
    monto_pago: Math.round((emp.tarifa_base || 350) * (Math.floor(Math.random() * 5) + 1)),
    rechazos: Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0,
    notas_calidad: null,
    acabado_id: null,
    acabado_nombre: ['Santa Fe', 'Alder', 'Dark Walnut', 'Natural', 'Distress White'][Math.floor(Math.random() * 5)],
    cliente_nombre: clientNames[Math.floor(Math.random() * clientNames.length)],
  });
}

// --- Pedidos demo ---
const pedidos = clientNames.slice(0, 4).map((client, ci) => {
  const numItems = 3 + Math.floor(Math.random() * 5);
  const items = [];
  for (let j = 0; j < numItems; j++) {
    const prod = productos[Math.floor(Math.random() * Math.min(200, productos.length))];
    const precio = prod.prices[client] || Object.values(prod.prices)[0] || 100;
    const qty = Math.floor(Math.random() * 10) + 1;
    items.push({
      id: ci * 10 + j + 1,
      producto_id: prod.id,
      producto_nombre: prod.name,
      codigo_sku: prod.sku,
      cantidad: qty,
      precio_unitario: precio,
      subtotal: Math.round(precio * qty * 100) / 100
    });
  }
  const total = items.reduce((s, it) => s + it.subtotal, 0);
  const statuses = ['confirmada', 'en_produccion', 'lista', 'embarcada'];
  return {
    id: 2001 + ci,
    fecha_creacion: new Date(Date.now() - (45 - ci * 10) * 86400000).toISOString().split('T')[0],
    estatus: statuses[ci % statuses.length],
    tipo_orden: 'linea',
    cliente_id: ci + 1,
    cliente_nombre: client,
    cliente_email: clientes[ci]?.email || '',
    total: Math.round(total * 100) / 100,
    total_items: items.length,
    items,
    notas: ''
  };
});

// --- Embarques demo ---
const embarques = [
  {
    id: 1, orden_id: 2001, tienda_destino_id: 1, 
    cliente_nombre: clientNames[0],
    fecha_embarque: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    placas_trailer: 'CHI-1234-A', transportista: 'Transportes del Norte',
    estatus: 'entregado', 
    items: pedidos[0]?.items.slice(0, 3).map((it, i) => ({ ...it, id: i+1, embarcado: true, recibido_en_tienda: true, cantidad_embarcada: it.cantidad, cantidad_recibida: it.cantidad, diferencia: 0 })) || []
  },
  {
    id: 2, orden_id: 2002, tienda_destino_id: 2,
    cliente_nombre: clientNames[1],
    fecha_embarque: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    placas_trailer: 'CHI-5678-B', transportista: 'Fletes Chihuahua Express',
    estatus: 'en_transito',
    items: pedidos[1]?.items.slice(0, 4).map((it, i) => ({ ...it, id: i+1, embarcado: true, recibido_en_tienda: false, cantidad_embarcada: it.cantidad, cantidad_recibida: 0, diferencia: 0 })) || []
  },
  {
    id: 3, orden_id: 2003, tienda_destino_id: 1,
    cliente_nombre: clientNames[2],
    fecha_embarque: new Date().toISOString().split('T')[0],
    placas_trailer: '', transportista: '',
    estatus: 'preparando',
    items: pedidos[2]?.items.slice(0, 2).map((it, i) => ({ ...it, id: i+1, embarcado: false, recibido_en_tienda: false, cantidad_embarcada: it.cantidad, cantidad_recibida: 0, diferencia: 0 })) || []
  }
];

// --- Ventas demo ---
const ventas = [];
for (let d = 0; d < 7; d++) {
  const numVentas = 2 + Math.floor(Math.random() * 4);
  for (let v = 0; v < numVentas; v++) {
    const numItems = 1 + Math.floor(Math.random() * 4);
    const items = [];
    for (let j = 0; j < numItems; j++) {
      const invItem = inventarioInicial[Math.floor(Math.random() * inventarioInicial.length)];
      const prod = productos.find(p => p.id === invItem.producto_id);
      if (!prod) continue;
      const qty = Math.floor(Math.random() * 3) + 1;
      items.push({
        id: ventas.length * 10 + j + 1,
        producto_id: prod.id,
        producto_nombre: prod.name,
        codigo_sku: prod.sku,
        cantidad: qty,
        precio_unitario: invItem.precio_venta,
        subtotal: Math.round(invItem.precio_venta * qty * 100) / 100
      });
    }
    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    const metodos = ['efectivo', 'tarjeta', 'transferencia'];
    ventas.push({
      id: 3000 + ventas.length + 1,
      tienda_id: (v % 3) + 1,
      fecha_venta: new Date(Date.now() - d * 86400000).toISOString(),
      estatus: 'confirmada',
      subtotal: Math.round(subtotal * 100) / 100,
      iva,
      total: Math.round((subtotal + iva) * 100) / 100,
      metodo_pago: metodos[Math.floor(Math.random() * metodos.length)],
      cliente_nombre: Math.random() > 0.6 ? clientNames[Math.floor(Math.random() * clientNames.length)] : 'Público General',
      items,
      cajero: 'Laura Mendoza'
    });
  }
}

// --- Write all JSON files ---
const files = {
  'productos.json': productos,
  'categorias.json': categorias,
  'clientes.json': clientes,
  'empleados.json': empleados,
  'tiendas.json': tiendas,
  'usuarios.json': usuarios,
  'inventario-inicial.json': inventarioInicial,
  'work-orders.json': workOrders,
  'pedidos.json': pedidos,
  'embarques.json': embarques,
  'ventas.json': ventas,
};

for (const [filename, data] of Object.entries(files)) {
  const path = join(outDir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ ${filename}: ${Array.isArray(data) ? data.length : 'object'} entries`);
}

console.log('\n🎉 All JSON files generated successfully in src/data/');
