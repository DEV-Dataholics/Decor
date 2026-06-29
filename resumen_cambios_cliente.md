# Resumen de Actualizaciones y Mejoras en la Plataforma 🚀
*Fecha: 22 de Junio, 2026*

Estimado cliente, hoy hemos implementado mejoras importantes en el sistema para optimizar las ventas en tiendas, facilitar la entrega de pedidos y agilizar el control de gastos en el taller de producción. A continuación, le detallamos los cambios realizados de forma sencilla y directa:

---

## 1. Nuevo Punto de Venta (POS) Adaptado para Tablets 📱🛒
Rediseñamos la pantalla de cobro de las tiendas para que sea más fácil, rápida e intuitiva de usar desde dispositivos táctiles (tablets):
* **Proceso paso a paso:** El cobro ahora se divide en 3 pasos muy claros: 
  1. *Registro de artículos.*
  2. *Cobro.*
  3. *Confirmación y ticket.*
* **Lectura rápida con escáner físico:** El campo de búsqueda ahora detecta de forma automática y continua la lectura de la pistola de códigos de barras sin necesidad de hacer clics en la pantalla.
* **Teclado numérico táctil:** Agregamos botones grandes para seleccionar el método de pago (Efectivo, Tarjeta o Transferencia). Si se elige efectivo, aparece un teclado gigante en pantalla con botones de acceso rápido para billetes comunes de **$50, $100, $200 y $500 pesos**, calculando el cambio al instante.
* **Ticket de venta digital:** Se muestra una simulación realista de su recibo físico en pantalla. Con un solo clic, se puede introducir el correo electrónico del cliente para enviarle una copia digital de su ticket al momento.

---

## 2. Control de Reparto y Estatus de Pedidos en Tiempo Real 🚚🛣️
Optimizamos la logística de entrega para que la administración y el chofer estén perfectamente sincronizados:
* **Control de viaje para el Chofer:** Para evitar errores de coordinación, las rutas pendientes no se muestran al chofer hasta que están físicamente en el camión. Cuando el chofer está listo para salir de la fábrica, presiona un botón gigante: **"Iniciar Viaje"**. Esto cambia el estatus del viaje a *En Tránsito* y le desbloquea el itinerario de paradas.
* **Escáner de entregas mejorado:** Rediseñamos el visor de la cámara en el celular del chofer para que tenga un tamaño cómodo (proporción 4:3), permitiéndole enfocar y registrar los códigos QR de las etiquetas de embarque de manera ágil sin tapar el resto de la información del viaje.
* **Monitoreo de pedidos al instante:** Los estatus de las tarjetas de pedidos se actualizan de forma automática según la etapa real en la que se encuentran: *Pendiente* (creado), *En Producción* (taller), *Listo para Embarcar* (en almacén), *Embarcado* (en camión), *En Tránsito* (en camino) y *Entregado* (entregado por el chofer).

---

## 3. Administración de Personal y Costos por Mueble (Taller) 📊👥
Hicimos más inteligente el cálculo de mano de obra en producción:
* **Nube de especialidades interactiva:** Al registrar o editar trabajadores en Recursos Humanos, puedes añadir sus especialidades presionando `Enter` o escribiendo una coma. Estas aparecerán como etiquetas redondeadas y de colores que se pueden borrar con un clic. Además, si escribes una palabra y olvidas dar Enter antes de guardar, el sistema no la perderá; la auto-salva para evitar reescribir.
* **Costos de fabricación por Mueble:** Movimos las tarifas de pago de mano de obra al catálogo de productos en lugar de dejarlas fijas por empleado. Ahora, cada mueble tiene su propia tarifa de fabricación predeterminada en el inventario.
* **Alerta de costos faltantes:** Si un mueble nuevo o una *Orden Especial* no tiene un costo de fabricación asignado, el taller te alertará antes de iniciar la producción. Al ingresar la tarifa deseada para iniciar el trabajo, el sistema la guardará automáticamente en el catálogo para el futuro.
* **Sincronización en lotes de producción:** Al asignar el trabajo de un pedido de varias piezas (ej: 4 mesas), puedes capturar la tarifa individual de la pieza o el monto total por el lote completo. El sistema se encarga de calcular y sincronizar con exactitud ambas cifras con centavos, evitando cálculos manuales.

---

## 4. Impresión de Etiquetas por Lotes en Formato Avery 🖨️🏷️
Facilitamos el etiquetado de los muebles listos en el almacén:
* **Impresión con un solo clic:** En la sección de Inventario General (pestaña *Terminados sin Embarcar*), agregamos un botón de **"Imprimir Orden Completa"** junto al título de cada pedido.
* **Plantilla de etiquetas Avery (Formato 5163):** Al hacer clic, se genera automáticamente un documento listo para imprimir en hojas de etiquetas autoadhesivas Avery 5163 (distribución de 2 columnas por 5 filas, dando 10 etiquetas de tamaño ideal por página Carta).
* **Gestión inteligente de páginas en pedidos grandes:** Si un pedido tiene más de 10 piezas (por ejemplo, la Orden #1003 que tiene 15), el sistema las divide en grupos de 10 y aplica saltos de página automáticos para la impresora. Así, el PDF se genera perfectamente ordenado en múltiples páginas físicas tamaño Carta sin traslaparse ni desajustarse.
* **Códigos QR de alta velocidad:** Cada etiqueta genera de forma instantánea su código QR de identificación usando servicios estables en la nube, garantizando una lectura nítida para la logística de embarque.

