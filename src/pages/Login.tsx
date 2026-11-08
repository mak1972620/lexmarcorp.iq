import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, Mail, Lock, ArrowRight } from 'lucide-react';

import { TanakaLogo } from '../components/TanakaLogo';

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
    <div className="min-h-screen flex bg-[#070A0F] text-slate-100">
      {/* Left: Form en Modo Dark Obsidiana y Oro */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-28 bg-[#070A0F]">
        <div className="max-w-md w-full mx-auto py-8">
          
          {/* Logo centrado con monograma recortado y tipografía oro */}
          <div className="flex flex-col items-center text-center mb-8">
            <TanakaLogo size="xl" showText={true} className="flex-col text-center items-center justify-center" />
            <div className="mt-4 inline-block px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest">
              Portal Jurídico Inteligente • Modo Privado
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Botón de Acceso Rápido 1-Clic para la Lic. Dora Edilia Tanaka */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0B0F17] border-2 border-[#D4AF37]/60 shadow-xl shadow-[#D4AF37]/10 text-center">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2.5">
              Acceso Directo Titular del Despacho
            </p>
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
              className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C058] text-[#070A0F] font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/30 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="text-base">⚖️</span>
              <span className="tracking-wide">Entrar como Lic. Dora Edilia Tanaka Cervantes (1 Clic)</span>
            </button>
          </div>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1E293B]"></div></div>
            <span className="relative bg-[#070A0F] px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              o con credenciales
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/60" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0B0F17] border border-[#1E293B] rounded-xl text-slate-100 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
                  placeholder="tanaka@ediliatanaka.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/60" size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#0B0F17] border border-[#1E293B] rounded-xl text-slate-100 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3.5 bg-[#D4AF37] hover:bg-[#E5C058] text-[#070A0F] font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-[#D4AF37]/20 cursor-pointer"
            >
              Iniciar Sesión
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#1E293B] text-center text-xs text-slate-500">
            Firma Legal Edilia Tanaka y Asociados • Sistema Seguro
          </div>
        </div>
      </div>

      {/* Right: Imagen de fondo solemne con velo obsidiana */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-black">
        <img
          src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1920"
          alt="Despacho Jurídico Tanaka"
          className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-75 contrast-125"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A0F] via-[#070A0F]/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <div className="max-w-md">
            <h3 className="text-3xl font-black text-[#D4AF37] mb-3 leading-tight font-serif">
              "La Abogada de Tu Familia"
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Suite Jurídica de Blindaje Procesal, Liquidación Forense y Control de Términos Judiciales en el Estado de Coahuila.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-[#E5C058]">
              <span>Tels: 877-100-9702</span>
              <span>•</span>
              <span>877-119-2314</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
