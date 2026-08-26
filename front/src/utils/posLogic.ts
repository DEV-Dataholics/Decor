export function parseQRCode(qr: string) {
  const trimmed = qr.trim();
  if (trimmed.startsWith('DCR-REC-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 4) {
      return {
        type: 'reposicion',
        tiendaId: Number(parts[2]),
        productoId: Number(parts[3]),
      };
    }
  }
  return { type: 'standard', qr: trimmed };
}

export function calculateTotals(carrito: { precio: number; cantidad: number }[]) {
  const totalArticulos = carrito.reduce((sum, item) => sum + (item.cantidad || 1), 0);
  const totalPagar = carrito.reduce((sum, item) => sum + (item.precio * (item.cantidad || 1)), 0);
  return { totalArticulos, totalPagar };
}

export function calculatePaymentInfo(totalPagar: number, montoRecibidoStr: string, metodoPago: string | null) {
  const numMontoRecibido = Number(montoRecibidoStr) || 0;
  const cambioEntregar = Math.max(0, numMontoRecibido - totalPagar);
  const faltaCobrar = Math.max(0, totalPagar - numMontoRecibido);
  const canConfirmPayment = 
    metodoPago !== null && 
    (metodoPago !== 'efectivo' || numMontoRecibido >= totalPagar);
    
  return { numMontoRecibido, cambioEntregar, faltaCobrar, canConfirmPayment };
}

export function handleNumpadInput(val: string, prev: string): string {
  if (prev === '0') {
    return val === '.' ? '0.' : val;
  }
  if (val === '.' && prev.includes('.')) return prev;
  return prev + val;
}
