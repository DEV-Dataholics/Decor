import { useState } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useDecor();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    const success = await login(email, password);
    setIsLoading(false);
    if (success) navigate('/dashboard');
    else setError('Credenciales inválidas');
  };

  return (
    <div className="min-h-screen flex bg-[#fbfaf7] overflow-hidden font-sans">
      {/* Lado Izquierdo: Estilo Explora Santa Fe / Adobe Hacienda */}
      <div className="hidden md:flex md:w-[50%] bg-[#d5926b] flex-col items-center justify-center p-12 text-[#4a2818] border-r border-black/5 select-none space-y-14">
        {/* Header con Símbolo Zia */}
        <div className="flex flex-col items-center">
          {/* Símbolo Zia de Santa Fe */}
          <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#4a2818]" fill="currentColor">
            <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="3.5" fill="none" />
            
            {/* North Rays */}
            <line x1="45" y1="35" x2="45" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="48" y1="37" x2="48" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="52" y1="37" x2="52" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="55" y1="35" x2="55" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* South Rays */}
            <line x1="45" y1="65" x2="45" y2="88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="48" y1="63" x2="48" y2="94" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="52" y1="63" x2="52" y2="94" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="55" y1="65" x2="55" y2="88" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* East Rays */}
            <line x1="65" y1="45" x2="88" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="63" y1="48" x2="94" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="63" y1="52" x2="94" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="65" y1="55" x2="88" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* West Rays */}
            <line x1="35" y1="45" x2="12" y2="45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="37" y1="48" x2="6" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="37" y1="52" x2="6" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="35" y1="55" x2="12" y2="55" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h2 className="text-xl font-sans font-black tracking-[0.2em] uppercase mt-4">
            EXPLORA DECOR
          </h2>
        </div>

        {/* Foto de Mueble con Marco Claymorphic */}
        <div className="clay-card-cream p-4 pb-5 rounded-[2rem] w-full max-w-[280px] border border-black/5">
          <div className="overflow-hidden rounded-[1.5rem] aspect-[4/3] relative">
            <img 
              src="/decor_login_hero.png" 
              alt="Decor Hacienda Interior" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Cenefa Geométrica Estilo Santa Fe */}
        <div className="w-full flex flex-col items-center">
          <svg viewBox="0 0 120 12" className="w-full max-w-[280px] text-[#4a2818]/50" fill="currentColor">
            <rect x="0" y="0" width="120" height="1" />
            <path d="
              M0,6 L4,2 L4,10 Z
              M10,2 L6,6 L10,10 L14,6 Z
              M20,6 L16,2 L16,10 Z
              M20,6 L24,2 L24,10 Z
              M30,2 L26,6 L30,10 L34,6 Z
              M40,6 L36,2 L36,10 Z
              M40,6 L44,2 L44,10 Z
              M50,2 L46,6 L50,10 L54,6 Z
              M60,6 L56,2 L56,10 Z
              M60,6 L64,2 L64,10 Z
              M70,2 L66,6 L70,10 L74,6 Z
              M80,6 L76,2 L76,10 Z
              M80,6 L84,2 L84,10 Z
              M90,2 L86,6 L90,10 L94,6 Z
              M100,6 L96,2 L96,10 Z
              M100,6 L104,2 L104,10 Z
              M110,2 L106,6 L110,10 L114,6 Z
              M120,6 L116,2 L116,10 Z
            " />
            <rect x="0" y="11" width="120" height="1" />
          </svg>
        </div>
      </div>

      {/* Lado Derecho: Formulario de Acceso */}
      <div className="w-full md:w-[50%] flex flex-col justify-between p-8 md:p-16 min-h-screen relative z-10 bg-[#fbfaf7] shadow-2xl">
        <div className="my-auto max-w-sm w-full mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-sans font-black text-[#4a2818] tracking-tight">
              Acceso Exclusivo
            </h1>
            <p className="text-xs text-[#c2703e] font-bold">
              Sistema de Control Integral Decor
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-[#4a2818]/80 uppercase tracking-widest block mb-1.5">
                  Correo Electrónico
                </label>
                <input 
                  value={email} 
                  onChange={e => { setEmail(e.target.value); setError(''); }} 
                  className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3.5 text-xs text-[#4a2818] placeholder:text-zinc-400 outline-none focus:border-[#c2703e]/50 focus:ring-2 focus:ring-[#c2703e]/10 transition-all"
                  placeholder="Correo electrónico" 
                  type="email" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#4a2818]/80 uppercase tracking-widest block mb-1.5">
                  Contraseña
                </label>
                <input 
                  value={password} 
                  onChange={e => { setPassword(e.target.value); setError(''); }} 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                  className="w-full clay-input border border-[#e8dfcb] rounded-xl px-4 py-3.5 text-xs text-[#4a2818] placeholder:text-zinc-400 outline-none focus:border-[#c2703e]/50 focus:ring-2 focus:ring-[#c2703e]/10 transition-all"
                  placeholder="Contraseña" 
                  type="password" 
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 bg-[#4a2818] hover:bg-[#3a1f12] text-[#fbfaf7] py-4 rounded-[1.5rem] font-bold text-sm tracking-widest transition-all duration-300 transform active:scale-95 shadow-xl hover:shadow-[#4a2818]/20 disabled:opacity-50"
            >
              <LogIn size={14} /> Ingresar al Sistema
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-zinc-400 space-y-1 mt-8">
          <p className="font-semibold tracking-wider uppercase">Sistema Decor OS v1.0 — 2026</p>
          <p className="opacity-80">Plataforma Privada — Uso Restringido</p>
        </div>
      </div>
    </div>
  );
}
