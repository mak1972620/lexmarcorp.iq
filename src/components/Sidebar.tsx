import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  CreditCard, 
  ShieldCheck, 
  History,
  LogOut,
  Scale,
  BrainCircuit,
  ScanText,
  UserCircle,
  Scroll,
  Calculator,
  Swords,
  Clock,
  GitCommit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../types';

import { TanakaLogo } from './TanakaLogo';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'abogado', 'cliente'] },
    { icon: Users, label: 'Clientes', path: '/clientes', roles: ['admin', 'abogado'] },
    { icon: Briefcase, label: 'Expedientes', path: '/expedientes', roles: ['admin', 'abogado', 'cliente'] },
    { icon: GitCommit, label: 'Tracking Procesal', path: '/timeline', roles: ['admin', 'abogado', 'cliente'] },
    { icon: CheckSquare, label: 'Tareas', path: '/tareas', roles: ['admin', 'abogado', 'cliente'] },
    { icon: FileText, label: 'Documentos', path: '/documentos', roles: ['admin', 'abogado', 'cliente'] },
    { icon: Scroll, label: 'Biblioteca de Plantillas', path: '/plantillas', roles: ['admin', 'abogado'] },
    { icon: MessageSquare, label: 'Mensajes', path: '/mensajes', roles: ['admin', 'abogado', 'cliente'] },
    { icon: CreditCard, label: 'Pagos', path: '/pagos', roles: ['admin', 'abogado', 'cliente'] },
    { icon: ScanText, label: 'Visión Legal', path: '/scanner', roles: ['admin', 'abogado', 'cliente'] },
    { icon: BrainCircuit, label: 'Tanaka Legal IQ', path: '/auditor', roles: ['admin', 'abogado'] },
    { icon: Swords, label: 'Duelo Procesal', path: '/duelo-procesal', roles: ['admin', 'abogado'] },
    { icon: Clock, label: 'Términos Judiciales', path: '/terminos', roles: ['admin', 'abogado', 'cliente'] },
    { icon: Calculator, label: 'Liquidación & Usura', path: '/liquidacion', roles: ['admin', 'abogado'] },
  ];

  const adminItems = [
    { icon: ShieldCheck, label: 'Usuarios', path: '/admin/usuarios', roles: ['admin'] },
    { icon: History, label: 'Auditoría', path: '/admin/auditoria', roles: ['admin'] },
  ];

  return (
    <div className="w-64 bg-[#070A0F] text-slate-200 h-screen flex flex-col border-r border-[#D4AF37]/20 shadow-2xl">
      <div className="p-4 border-b border-[#D4AF37]/20 bg-gradient-to-b from-[#0B0F17] to-[#070A0F]">
        <TanakaLogo size="md" showText={true} />
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-7">
        <div>
          <p className="text-[10px] font-bold text-[#D4AF37]/70 uppercase tracking-widest mb-3 px-3">Módulos Jurídicos</p>
          <nav className="space-y-1">
            {menuItems.filter(item => item.roles.includes(user?.role || '')).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                  isActive 
                    ? "bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/25" 
                    : "text-slate-300 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                )}
              >
                <item.icon size={17} className={cn("transition-colors")} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {user?.role === 'admin' && (
          <div>
            <p className="text-[10px] font-bold text-[#D4AF37]/70 uppercase tracking-widest mb-3 px-3">Control & Gobierno</p>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
                    isActive 
                      ? "bg-[#D4AF37] text-black font-bold shadow-lg shadow-[#D4AF37]/25" 
                      : "text-slate-300 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  )}
                >
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#D4AF37]/20 bg-[#0B0F17]/60">
        <NavLink 
          to="/perfil"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 mb-1.5 rounded-xl transition-colors",
            isActive ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "hover:bg-white/5 text-slate-300"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-[#070A0F] flex items-center justify-center border border-[#D4AF37]/40">
            <UserCircle size={18} className="text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-[#D4AF37]">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role === 'admin' ? 'Titular / Administradora' : user?.role}</p>
          </div>
        </NavLink>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
