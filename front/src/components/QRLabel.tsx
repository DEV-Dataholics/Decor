import { useRef } from 'react';

interface QRLabelProps {
  qrCode: string;
  productoNombre: string;
  ordenId: number;
  clienteNombre: string;
  acabado: string;
  precio?: number;
  size?: number;
  showPrint?: boolean;
}

export default function QRLabel({ qrCode, productoNombre, ordenId, clienteNombre, acabado, precio = 0, size = 80, showPrint = true }: QRLabelProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const formattedPrecio = Number(precio).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const css = `
      @page { margin: 0; size: 5.72cm 3.18cm; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        background: white;
        color: black;
        width: 5.72cm;
        height: 3.18cm;
        overflow: hidden;
      }
      .label {
        width: 5.72cm;
        height: 3.18cm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0.2cm;
        page-break-inside: avoid;
      }
      .title {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        margin: 0 0 4px 0;
        width: 100%;
        line-height: 1.2;
        word-wrap: break-word;
        color: #111;
      }
      .price {
        font-size: 16px;
        font-weight: 900;
        color: #000;
        margin: 0;
      }
    `;

    w.document.write(`<html><head><title>Etiqueta ${productoNombre}</title><style>${css}</style></head><body>
      <div class="label">
        <h1 class="title">${productoNombre}</h1>
        <div class="price">${formattedPrecio}</div>
      </div>
      <script>window.onload=function(){setTimeout(window.print, 100);}</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl relative w-full" style={{ minHeight: '120px' }}>
      <div className="text-center space-y-1.5 flex-1 flex flex-col justify-center">
        <h4 className="text-xs font-black text-zinc-100 uppercase tracking-wide line-clamp-2 px-2">{productoNombre}</h4>
        <p className="text-sm font-black text-amber-400">{formattedPrecio}</p>
      </div>
      {showPrint && (
        <button onClick={handlePrint} className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold hover:underline mt-2">
          🖨 Imprimir
        </button>
      )}
    </div>
  );
}
