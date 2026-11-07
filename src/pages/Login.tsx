import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, Mail, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden bg-black border-2 border-amber-500/40 shadow-lg shadow-amber-500/20">
              <img 
                src="/logo_tanaka.png" 
                alt="Edilia Tanaka Logo" 
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-amber-500 tracking-wider">EDILIA TANAKA</h1>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Y ASOCIADOS • FIRMA LEGAL</p>
              <p className="text-xs text-slate-500 italic mt-0.5 font-serif">"La Abogada de Tu Familia"</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Portal Jurídico Inteligente</h2>
            <p className="text-xs text-slate-500">Suite de litigio, auditoría forense y control de términos procesales.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="tanaka@ediliatanaka.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-slate-950 text-amber-500 font-bold rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 group"
            >
              Iniciar Sesión
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">o continúa con</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            onClick={async () => {
              const res = await fetch('/api/auth/google/url');
              const data = await res.json();
              window.location.href = data.url;
            }}
            className="w-full mt-6 py-3 border border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="text-sm font-bold text-slate-700">Iniciar sesión con Google</span>
          </button>

          {/* Botón de Demostración 1-Clic para la Lic. Dora Edilia Tanaka */}
          <button
            type="button"
            onClick={async () => {
              const demoEmail = 'tanaka@ediliatanaka.com';
              const demoPass = 'Tanaka2026!';
              setEmail(demoEmail);
              setPassword(demoPass);
              try {
                const res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: demoEmail, password: demoPass }),
                });
                const data = await res.json();
                if (res.ok) {
                  login(data.user, data.token);
                  navigate('/dashboard');
                } else {
                  setError(data.error || 'Error al iniciar sesión');
                }
              } catch (_) {
                setError('Error al conectar con el servidor');
              }
            }}
            className="w-full mt-3 py-3.5 px-4 rounded-xl border border-amber-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 hover:border-amber-400 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10 group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">⚖️</span>
            <span className="tracking-wide">Entrar como Lic. Dora Edilia Tanaka Cervantes (1 Clic)</span>
          </button>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-center text-slate-500 text-sm">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="text-amber-600 font-bold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Decorative */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1920"
          alt="Legal background"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <div className="max-w-lg">
            <h3 className="text-4xl font-bold text-white mb-4 leading-tight">
              La plataforma legal del futuro impulsada por IA.
            </h3>
            <p className="text-slate-300 text-lg">
              Gestiona expedientes, clientes y pagos en un solo lugar con la máxima seguridad y eficiencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
