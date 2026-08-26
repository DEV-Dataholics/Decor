import { describe, it, expect } from 'vitest';
import { parseQRCode, calculateTotals, calculatePaymentInfo, handleNumpadInput } from './posLogic';

describe('POS Logic - Scanner (QR parsing)', () => {
  it('debe parsear QR autodescriptivo de reposicion correctamente', () => {
    const result = parseQRCode('DCR-REC-2-105-178543-0');
    expect(result).toEqual({
      type: 'reposicion',
      tiendaId: 2,
      productoId: 105
    });
  });

  it('debe tratar otros QRs como estandares', () => {
    const result = parseQRCode('SKU-12345');
    expect(result).toEqual({
      type: 'standard',
      qr: 'SKU-12345'
    });
  });
});

describe('POS Logic - Finance Totals', () => {
  it('debe calcular totales del carrito correctamente', () => {
    const carrito = [
      { precio: 150, cantidad: 2 },
      { precio: 300, cantidad: 1 }
    ];
    const { totalArticulos, totalPagar } = calculateTotals(carrito);
    expect(totalArticulos).toBe(3);
    expect(totalPagar).toBe(600);
  });

  it('debe asumir cantidad 1 si no se especifica explicitamente', () => {
    const carrito = [
      { precio: 100 } as any
    ];
    const { totalArticulos, totalPagar } = calculateTotals(carrito);
    expect(totalArticulos).toBe(1);
    expect(totalPagar).toBe(100);
  });
});

describe('POS Logic - Payment Info', () => {
  it('debe calcular cambio y montos faltantes en pago en efectivo', () => {
    const result = calculatePaymentInfo(500, '600', 'efectivo');
    expect(result.numMontoRecibido).toBe(600);
    expect(result.cambioEntregar).toBe(100);
    expect(result.faltaCobrar).toBe(0);
    expect(result.canConfirmPayment).toBe(true);
  });

  it('no debe permitir confirmar si el efectivo es menor al total', () => {
    const result = calculatePaymentInfo(500, '400', 'efectivo');
    expect(result.cambioEntregar).toBe(0);
    expect(result.faltaCobrar).toBe(100);
    expect(result.canConfirmPayment).toBe(false);
  });

  it('debe permitir confirmar otros metodos de pago sin validar monto recibido', () => {
    const result = calculatePaymentInfo(500, '0', 'tarjeta');
    expect(result.canConfirmPayment).toBe(true);
  });
});

describe('POS Logic - Numpad', () => {
  it('debe concatenar numeros al input', () => {
    expect(handleNumpadInput('5', '0')).toBe('5');
    expect(handleNumpadInput('0', '5')).toBe('50');
  });

  it('debe manejar el punto decimal correctamente', () => {
    expect(handleNumpadInput('.', '0')).toBe('0.');
    expect(handleNumpadInput('5', '0.')).toBe('0.5');
    expect(handleNumpadInput('.', '0.5')).toBe('0.5'); // ignorar segundo punto
  });
});
