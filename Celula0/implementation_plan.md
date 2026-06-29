# 🪑 Decor Mueblería — Refactorización por Pain Points

> **Objetivo:** Reorganizar los 9 módulos del demo frontend para que ataquen directamente los dolores operativos reales de la auditoría, no features genéricas.

---

## Resumen del Interview

| Decisión | Resultado |
|---|---|
| Foco | Los 3 clusters de dolor (Producción, Pedidos/Embarques, Inventario) son igual de importantes |
| Módulos | Mantener 9 módulos: 5 Tier 1 (core) + 4 Tier 2 (soporte ligero) |
| Producción | Kanban simple sin empleados ni rechazos: solo tracking de estado |
| Inventario | 3 tabs: Tienda + Materia Prima (pacas) + Terminados sin Embarcar |
| Embarques | Flujo completo: Kanban → QR → Checklist → Embarque → Cotejo en Tienda |
| POS | Lector de QR de piezas trazadas, no POS genérico |
| Catálogo | Fuente de verdad: nombre, medidas, acabados, fotos, precios por cliente |
| Dashboard | Operativo: órdenes por estado, MP crítica, terminados sin embarcar, embarques recientes |
| Órdenes | Tipo (línea/especial), medidas, acabado, notas, foto/diagrama adjunto. Guardar especiales como producto nuevo |
| Traducción | Dejado para v2 |
| Roles | Admin (Sergio/Norma), Tienda (Hija), Taller (Víctor) |

---

## Mapeo Pain Points → Módulos

| Pain Point | Módulo que lo resuelve | Cómo |
|---|---|---|
| P-02 (medidas incorrectas) | **Pedidos** | Campos de medidas + foto/diagrama adjunto |
| P-03 (muebles únicos no doc.) | **Catálogo** | Guardar orden especial como nuevo producto |
| P-04 (catálogo incompleto) | **Catálogo** | Medidas, acabados, fotos por producto |
| A-01 (madera verbal) | **Inventario** | Tab Materia Prima con conteo por tipo |
| A-03 (agotamiento materiales) | **Inventario + Dashboard** | Alertas de bajo stock en MP |
| A-04 (acumulamiento terminados) | **Inventario** | Tab Terminados sin Embarcar |
| A-06 (catálogo sin medidas) | **Catálogo** | Campos de dimensiones obligatorios |
| L-01 (piezas olvidadas) | **Embarques** | Checklist digital de items a embarcar |
| L-03 (lista a mano) | **Embarques** | Lista digital generada automáticamente |
| L-04 (cotejo por memoria) | **Embarques** | Cotejo item por item en recepción |
| V-02 (sin márgenes) | **Dashboard** | KPI de valor de embarques |
| D-01 (triplicación docs) | **QR + Sistema** | Etiqueta QR reemplaza 3 copias |
| D-03 (impresión repetitiva) | **QR** | Una etiqueta QR por pieza |
| F-02 (sin trazabilidad pieza) | Diferido v2 | — |

---

## Proposed Changes

### Fase 1: Modelo de Datos Actualizado

> Cambios al JSON data layer y al store para reflejar el negocio real.

---

#### [MODIFY] [productos.json](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/data/productos.json)
Agregar a cada producto:
- `dimensions: { width: number, height: number, depth: number }` (en pulgadas)
- `finishes: string[]` — acabados disponibles (Santa Fe, Alder, Dark Walnut, etc.)
- `image_url: string | null` — placeholder

#### [NEW] `front/src/data/materia-prima.json`
Stock de materia prima:
```json
[
  { "id": 1, "nombre": "Pino", "unidad": "pacas", "cantidad": 14, "minimo": 5 },
  { "id": 2, "nombre": "Encino", "unidad": "pacas", "cantidad": 8, "minimo": 3 },
  { "id": 3, "nombre": "Alder", "unidad": "pacas", "cantidad": 3, "minimo": 4 },
  { "id": 4, "nombre": "Mezquite", "unidad": "pacas", "cantidad": 6, "minimo": 2 },
  { "id": 5, "nombre": "Madera Reciclada", "unidad": "pacas", "cantidad": 10, "minimo": 3 },
  { "id": 6, "nombre": "Madera Fashion", "unidad": "pacas", "cantidad": 4, "minimo": 2 },
  { "id": 7, "nombre": "Triplay", "unidad": "hojas", "cantidad": 15, "minimo": 5 }
]
```

#### [NEW] `front/src/data/acabados.json`
Acabados disponibles:
```json
["Santa Fe", "Alder", "Dark Walnut", "Natural", "Distress White", "Rústico", "Cardeado", "Distrés Polilla", "Glass Laca", "Semi-Glass", "Mate", "Con Cera", "Phoenix"]
```

#### [MODIFY] [useStore.ts](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/store/useStore.ts)
Cambios al store:
- Agregar estado `materiaPrima` con CRUD
- Agregar estado `terminadosSinEmbarcar` (piezas que salen del Kanban pero no se han embarcado)
- Agregar función `generarQR(pieza)` → genera ID único (`DCR-{timestamp}-{random}`)
- Agregar función `guardarComoProducto(ordenEspecial)` → agrega al catálogo
- Modificar `moveWorkOrder()`: cuando pasa a "listo_embarque", crea entrada en `terminadosSinEmbarcar` + genera QR
- Modificar embarques: al crear embarque, seleccionar de `terminadosSinEmbarcar`; al confirmar recepción, mover a inventario tienda
- Actualizar KPIs del Dashboard

---

### Fase 2: Módulos Tier 1 (Core)

---

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/DashboardPage.tsx)
**Rediseño total del Dashboard:**
- **KPI 1**: Órdenes por estado (pendientes / en producción / en acabados / listas)
- **KPI 2**: Materia Prima Crítica (materiales por debajo del mínimo, con alerta roja)
- **KPI 3**: Terminados sin Embarcar (# piezas + valor estimado = capital parado)
- **KPI 4**: Embarques recientes (último embarque, valor, destino)
- **Gráfica**: Distribución de órdenes por estado (donut chart)
- **Alertas**: Items de MP bajo mínimo, órdenes con más de X días en producción
- Eliminar: gráfica de ventas por día, actividad reciente de ventas

#### [MODIFY] [PedidosPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/PedidosPage.tsx)
**Agregar al formulario de nuevo pedido:**
- Selector de tipo: `Línea` / `Línea Especial` / `Orden Especial`
- Para `Línea`: al seleccionar producto del catálogo, autorellenar medidas y acabados
- Para `Especial`: campos manuales de medidas (ancho/alto/fondo), acabado, notas
- Upload de foto/diagrama (simulado con drag & drop → base64 en localStorage)
- Botón "Guardar como producto nuevo" para órdenes especiales exitosas

#### [MODIFY] [ProduccionPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/ProduccionPage.tsx)
**Simplificar Kanban:**
- **4 columnas**: Pendiente → En Producción → Acabados → Listo para Embarque
- Cada card muestra: producto, SKU, orden #, cliente, acabado solicitado
- **Eliminar**: empleado, rechazos, monto pago, botones de acción complejos
- **Al mover a "Listo para Embarque"**: genera QR automáticamente, crea entrada en `terminadosSinEmbarcar`
- Vista lista simplificada como alternativa

#### [MODIFY] [InventarioPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/InventarioPage.tsx)
**Reorganizar a 3 tabs:**
- **Tab "Tienda"**: Stock de productos en tienda (actual, simplificado)
- **Tab "Materia Prima"**: Cards por tipo de madera con gauge visual (cantidad vs. mínimo), botón de ajuste +/-
- **Tab "Terminados sin Embarcar"**: Lista de piezas con QR generado, vinculadas a su orden, con días de antigüedad (alerta si >7 días = riesgo de deterioro A-04)

#### [MODIFY] [EmbarquesPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/EmbarquesPage.tsx)
**Flujo completo:**
1. **Crear embarque**: seleccionar items de "Terminados sin Embarcar" con checkboxes
2. **Datos de embarque**: destino (tienda), transportista, placas
3. **Confirmar carga**: checklist de items (cada uno con su QR visible)
4. **En tránsito**: timeline visual
5. **Recepción en tienda**: cotejo item por item (✓ recibido / ✗ faltante / ⚠ dañado)
6. **Al confirmar**: items recibidos pasan automáticamente a "Inventario Tienda"

---

### Fase 3: Módulos Tier 2 (Soporte Ligero)

---

#### [MODIFY] [PuntoDeVentaPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/PuntoDeVentaPage.tsx)
**Rediseño como lector de QR:**
- Área principal: campo de escaneo/búsqueda de código QR (simulado como input de texto en demo)
- Al escanear: muestra datos de la pieza (producto, orden, acabado, fecha de ingreso)
- Botón "Registrar Venta" → da de baja del inventario de tienda
- Registro simple: pieza vendida + precio + fecha
- Eliminar: carrito complejo, checkout modal, métodos de pago detallados

#### [MODIFY] [CatalogoPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/CatalogoPage.tsx)
**Enriquecer como base de datos maestra:**
- Cada producto muestra: nombre, SKU, dimensiones (ancho × alto × fondo), acabados disponibles, foto placeholder, precios por cliente
- Agregar botón "Nuevo Producto" (para guardar órdenes especiales)
- Formulario de edición con campos de medidas y acabados
- Filtros: por categoría, por acabado, búsqueda

#### [MODIFY] [ConfiguracionPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/ConfiguracionPage.tsx)
**Simplificar:**
- Tab "Acabados": lista de acabados disponibles (editable)
- Tab "Tiendas": sucursales registradas (solo lectura)
- Tab "Clientes": datos de clientes mayoristas
- Tab "Sistema": reset demo
- Eliminar: tab de empleados (no se usa según decisión de no entrar profundo con empleados)

#### [MODIFY] [LoginPage.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/pages/LoginPage.tsx)
**Actualizar nombres a stakeholders reales:**
- Admin → "Sergio / Norma (Admin)" 
- Gerente Tienda → "Encargada de Tienda"
- Encargado Taller → "Víctor (Taller)"

---

### Fase 4: QR + Dependencias

#### [NEW] Instalar `qrcode.react`
```bash
npm install qrcode.react
```

#### [NEW] `front/src/components/QRLabel.tsx`
Componente que genera un QR visual con:
- ID único de pieza
- Nombre del producto
- Orden #
- Cliente
- Acabado
- Botón "Imprimir etiqueta" (ventana de impresión con layout de etiqueta)

---

### Fase 5: Actualizar Navegación

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/gruiz/OneDrive/Documentos/sistema_decor/front/src/components/layout/Sidebar.tsx)
- Actualizar permisos por rol según decisiones del interview
- Taller (Víctor): Dashboard, Producción, Inventario (MP + Terminados), Catálogo (consulta)
- Tienda (Hija): Dashboard, Pedidos, POS (QR), Embarques, Inventario (Tienda)
- Admin: Todo

---

## Verificación

### Manual
1. **Flujo completo**: Crear orden → aparece en Kanban → mover a Listo → se genera QR → crear embarque seleccionando items → confirmar → cotejo en tienda → pieza aparece en inventario tienda → escanear QR en POS → registrar venta → pieza desaparece
2. Dashboard muestra KPIs operativos correctos
3. Materia Prima con alertas de bajo stock
4. Terminados sin embarcar con días de antigüedad
5. Catálogo con medidas y acabados
6. Roles correctos por stakeholder
