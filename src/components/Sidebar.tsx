import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  GitCommit, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  Cpu, 
  Calculator, 
  Brain, 
  LogOut,
  ShieldCheck,
  History,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../types';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'abogado', 'cliente'] },
    { icon: Users, label: 'Clientes', path: '/clientes', roles: ['admin', 'abogado'] },
    { icon: Briefcase, label: 'Expedientes', path: '/expedientes', roles: ['admin', 'abogado', 'cliente'] },
    { icon: GitCommit, label: 'Tracking Procesal', path: '/timeline', roles: ['admin', 'abogado', 'cliente'] },
    { icon: CheckSquare, label: 'Tareas Pospuestas', path: '/tareas', roles: ['admin', 'abogado', 'cliente'] },
    { icon: FileText, label: 'Documentos', path: '/documentos', roles: ['admin', 'abogado', 'cliente'] },
    { icon: BookOpen, label: 'Plantillas Legales', path: '/plantillas', roles: ['admin', 'abogado'] },
  ];

  const executiveTools = [
    { icon: Cpu, label: 'Redactor Legal IA', path: '/auditor', roles: ['admin', 'abogado'] },
    { icon: Calculator, label: 'Auditoría Fiscal', path: '/liquidacion', roles: ['admin', 'abogado'] },
    { icon: Brain, label: 'Peritaje Psicológico', path: '/duelo-procesal', roles: ['admin', 'abogado'] },
    { icon: MessageSquare, label: 'Mensajes', path: '/mensajes', roles: ['admin', 'abogado', 'cliente'] },
    { icon: CreditCard, label: 'Honorarios & Pagos', path: '/pagos', roles: ['admin', 'abogado', 'cliente'] },
  ];

  const adminItems = [
    { icon: ShieldCheck, label: 'Usuarios', path: '/admin/usuarios', roles: ['admin'] },
    { icon: History, label: 'Auditoría Forense', path: '/admin/auditoria', roles: ['admin'] },
  ];

  return (
    <aside className="w-[270px] bg-[#040507] border-r border-[#D4AF37]/22 flex flex-col justify-between p-6 h-screen z-50 shrink-0 select-none">
      <div className="overflow-y-auto pr-1">
        {/* BRAND HEADER */}
        <div className="flex items-center gap-3 pb-5 border-b border-[#D4AF37]/15">
          <div className="w-11 h-11 bg-[#D4AF37]/10 border border-[#D4AF37] rounded-lg flex items-center justify-center text-[#D4AF37] font-['Cinzel'] font-bold text-lg shadow-[0_0_15px_rgba(212,175,55,0.15)] shrink-0">
            ET
          </div>
          <div className="min-w-0">
            <h2 className="font-['Cinzel'] text-sm tracking-[1px] text-gold-gradient font-bold uppercase truncate">
              Edilia Tanaka
            </h2>
            <p className="text-[9px] text-[#8E95A5] tracking-[0.5px] uppercase mt-0.5 truncate">
              Firma Legal & Asociados
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN PRINCIPAL */}
        <div className="mt-6">
          <div className="text-[10px] text-[#5C6270] tracking-[1.5px] uppercase font-bold mb-3 pl-3">
            Principal
          </div>
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {navItems.filter(item => item.roles.includes(user?.role || '')).map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-l-[3px] border-[#D4AF37] text-[#FFF3A7] font-semibold" 
                      : "text-[#8E95A5] hover:text-[#F3F4F6] hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* HERRAMIENTAS EJECUTIVAS */}
        <div className="mt-6">
          <div className="text-[10px] text-[#5C6270] tracking-[1.5px] uppercase font-bold mb-3 pl-3">
            Herramientas Ejecutivas
          </div>
          <ul className="flex flex-col gap-1 list-none p-0 m-0">
            {executiveTools.filter(item => item.roles.includes(user?.role || '')).map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-l-[3px] border-[#D4AF37] text-[#FFF3A7] font-semibold" 
                      : "text-[#8E95A5] hover:text-[#F3F4F6] hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon size={18} className="shrink-0 text-[#D4AF37]" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* ADMINISTRACIÓN */}
        {user?.role === 'admin' && (
          <div className="mt-6">
            <div className="text-[10px] text-[#5C6270] tracking-[1.5px] uppercase font-bold mb-3 pl-3">
              Control & Gobierno
            </div>
            <ul className="flex flex-col gap-1 list-none p-0 m-0">
              {adminItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-l-[3px] border-[#D4AF37] text-[#FFF3A7] font-semibold" 
                        : "text-[#8E95A5] hover:text-[#F3F4F6] hover:bg-white/[0.03]"
                    )}
                  >
                    <item.icon size={18} className="shrink-0 text-[#D4AF37]" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* USER PROFILE FOOTER */}
      <div className="pt-4 mt-auto border-t border-[#D4AF37]/15">
        <NavLink 
          to="/perfil"
          className="flex items-center gap-3 p-3 bg-white/[0.02] border border-[#D4AF37]/22 rounded-xl hover:border-[#D4AF37] transition-all group"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
            ET
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs text-[#F3F4F6] font-semibold truncate group-hover:text-[#FFF3A7] transition-colors">
              {user?.name || 'Lic. Dora Edilia Tanaka'}
            </h4>
            <p className="text-[10px] text-[#D4AF37] truncate font-medium">
              {user?.role === 'admin' ? 'Socia Directora' : (user?.role || 'Abogada Titular')}
            </p>
          </div>
        </NavLink>
        <button 
          onClick={logout}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
