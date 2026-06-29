import { useState } from 'react';
import { LogIn, User, Store, Hammer, AlertCircle, Truck } from 'lucide-react';
import { useDecor } from '../store/StoreContext';
import { useNavigate } from 'react-router-dom';

const QUICK_ACCESS = [
  { nombre: 'Sergio / Norma', rol: 'Administración', email: 'admin@decor.mx', icon: <User size={24} />, desc: 'Acceso completo', gradient: 'from-amber-500/20 to-amber-600/10 border-amber-500/20' },
  { nombre: 'Encargada de Tienda', rol: 'Gestión de Tienda', email: 'tienda@decor.mx', icon: <Store size={24} />, desc: 'POS (Punto de Venta) y cobros', gradient: 'from-blue-500/20 to-blue-600/10 border-blue-500/20' },
  { nombre: 'Víctor (Taller)', rol: 'Encargado de Producción', email: 'taller@decor.mx', icon: <Hammer size={24} />, desc: 'Producción y Control de Taller', gradient: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20' },
  { nombre: 'Juan (Chofer)', rol: 'Reparto y Entrega', email: 'reparto@decor.mx', icon: <Truck size={24} />, desc: 'Rutas y Confirmación de Entregas', gradient: 'from-purple-500/20 to-purple-600/10 border-purple-500/20' },
];

export default function LoginPage() {
  const { login } = useDecor();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (loginEmail: string) => {
    const success = login(loginEmail, password);
    if (success) navigate('/dashboard');
    else setError('Credenciales inválidas');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md space-y-6 animate-slide-up">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-amber-500/20">D</div>
          <h1 className="text-2xl font-black text-zinc-100 tracking-tight">Decor Mueblería</h1>
          <p className="text-xs text-zinc-500">Sistema de Gestión — Demo v3.0</p>
        </div>

        {/* Quick Access */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase text-center">Acceso Rápido</p>
          {QUICK_ACCESS.map((qa, i) => (
            <button key={i} onClick={() => handleLogin(qa.email)}
              className={`w-full glass-card p-4 flex items-center gap-4 hover:scale-[1.02] transition-all bg-gradient-to-r ${qa.gradient}`}
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="text-amber-400 shrink-0">{qa.icon}</div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-zinc-100">{qa.nombre}</p>
                <p className="text-[10px] text-zinc-500">{qa.rol} — {qa.desc}</p>
              </div>
              <LogIn size={18} className="text-zinc-600" />
            </button>
          ))}
        </div>

        {/* Manual login */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase text-center">Inicio de sesión manual</p>
          <input value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="input-dark" placeholder="Correo electrónico" type="email" />
          <input value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin(email)} className="input-dark" placeholder="Contraseña" type="password" />
          {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
          <button onClick={() => handleLogin(email)} className="btn-primary w-full justify-center"><LogIn size={16} /> Iniciar Sesión</button>
        </div>
      </div>
    </div>
  );
}
