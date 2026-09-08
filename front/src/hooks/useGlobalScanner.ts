import { useEffect, useRef } from 'react';

interface UseGlobalScannerProps {
  onScan: (code: string) => void;
  debounceMs?: number;
  minLength?: number;
  maxTimeBetweenKeysMs?: number;
}

export function useGlobalScanner({
  onScan,
  debounceMs = 100,
  minLength = 6,
  maxTimeBetweenKeysMs = 50,
}: UseGlobalScannerProps) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input manualmente
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;
        
      if (isInput) return;

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTime.current;

      // Si pasa mucho tiempo entre teclas, limpiar el buffer (fue tipeo manual, no escáner)
      if (timeSinceLastKey > maxTimeBetweenKeysMs && buffer.current.length > 0) {
        buffer.current = '';
      }

      lastKeyTime.current = currentTime;

      // Detectar la tecla Enter (fin del código del escáner)
      if (e.key === 'Enter') {
        const code = buffer.current.trim();
        if (code.length >= minLength) {
          e.preventDefault();
          // Debounce para evitar lecturas duplicadas rápidas
          if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
          
          debounceTimer.current = window.setTimeout(() => {
            onScan(code);
          }, debounceMs);
        }
        buffer.current = ''; // Limpiar buffer después del Enter
        return;
      }

      // Evitar capturar teclas especiales como Shift, Control, etc.
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [onScan, debounceMs, minLength, maxTimeBetweenKeysMs]);
}
