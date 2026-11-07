import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, User, Mail, Lock, ArrowRight, Shield } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'cliente'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        navigate('/login');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left: Decorative */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920"
          alt="Modern office"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 flex flex-col justify-end p-16">
          <div className="max-w-lg">
            <h3 className="text-4xl font-bold text-white mb-4 leading-tight">
              Únete a la plataforma legal del futuro.
            </h3>
            <p className="text-slate-300 text-lg">
              Crea tu cuenta y comienza a gestionar tus asuntos legales con la ayuda de nuestra tecnología avanzada.
            </p>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden bg-transparent">
              <img 
                src="/logo.png" 
                alt="Logo Edilia Tanaka" 
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=ET&background=d97706&color=fff&font-size=0.7&bold=true'; }}
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-amber-500 tracking-tight">EDILIA TANAKA</h1>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Y ASOCIADOS • LEGAL IQ</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Crear Cuenta</h2>
            <p className="text-slate-500">Completa el formulario para registrarte en el sistema.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Usuario</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all appearance-none"
                >
                  <option value="cliente">Cliente</option>
                  <option value="abogado">Abogado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-4 bg-slate-950 text-amber-500 font-bold rounded-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 group"
            >
              Crear Cuenta
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-center text-slate-500 text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-amber-600 font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
