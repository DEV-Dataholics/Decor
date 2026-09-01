import { useState, useEffect } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, currentUser } = useDecor();
  const navigate = useNavigate();
  useEffect(() => { if (currentUser) navigate('/dashboard'); }, [currentUser, navigate]);
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
    else setError('Credenciales inválidas o usuario inactivo');
  };

  return (
    <div className="min-h-screen flex bg-[#FAF6EE] overflow-hidden font-sans">
      {/* Lado Izquierdo: Estilo Santa Fe & Identidad de Marca */}
      <div className="hidden md:flex md:w-[50%] bg-[#0d9488] flex-col items-center justify-center p-12 text-white border-r border-teal-800/20 select-none space-y-12">
        {/* Header con Símbolo Zia */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 100 100" className="w-20 h-20 text-white/95" fill="currentColor">
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
          <h2 className="text-2xl font-black tracking-[0.25em] uppercase mt-5 text-white">
            DECOR MUEBLERÍA
          </h2>
          <p className="text-xs text-teal-100 font-bold uppercase tracking-widest mt-1">
            Muebles Rústicos de Fabricación Fina
          </p>
        </div>

        {/* Hero Card */}
        <div className="bg-white/10 backdrop-blur-md p-4 pb-5 rounded-3xl w-full max-w-[300px] border border-white/20 shadow-2xl">
          <div className="overflow-hidden rounded-2xl aspect-[4/3] relative bg-teal-900/40">
            <img 
              src="/decor_login_hero.png" 
              alt="Decor Hacienda Interior" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Cenefa Santa Fe */}
        <div className="w-full flex flex-col items-center opacity-80">
          <svg viewBox="0 0 120 12" className="w-full max-w-[280px] text-white" fill="currentColor">
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
      <div className="w-full md:w-[50%] flex flex-col justify-between p-8 md:p-16 min-h-screen relative z-10 bg-white shadow-2xl">
        <div className="my-auto max-w-sm w-full mx-auto space-y-8 text-left">
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black text-stone-900 tracking-tight">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-[#0d9488] font-bold uppercase tracking-wider">
              Sistema de Control Integral Decor
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Correo Electrónico
                </label>
                <input 
                  value={email} 
                  onChange={e => { setEmail(e.target.value); setError(''); }} 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-xs font-bold text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-teal-500/10 transition-all"
                  placeholder="admin@decor.mx" 
                  type="email" 
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Contraseña
                </label>
                <input 
                  value={password} 
                  onChange={e => { setPassword(e.target.value); setError(''); }} 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-xs font-bold text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-teal-500/10 transition-all"
                  placeholder="••••••••" 
                  type="password" 
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span className="font-bold">{error}</span>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-[#0d9488] hover:bg-[#0f766e] text-white py-3.5 rounded-2xl font-black text-sm transition-all duration-300 transform active:scale-95 shadow-md hover:shadow-teal-900/10 disabled:opacity-50"
            >
              <LogIn size={16} /> <span>Ingresar al Sistema</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-stone-400 space-y-0.5 mt-8">
          <p className="font-bold tracking-wider uppercase text-stone-500">Decor Mueblería ERP v1.0 — 2026</p>
          <p>Sistema Operativo Transaccional</p>
        </div>
      </div>
    </div>
  );
}
