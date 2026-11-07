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
    <div className="w-64 bg-slate-950 text-white h-screen flex flex-col border-r border-amber-500/20 shadow-2xl">
      <div className="p-5 flex items-center gap-3 border-b border-amber-500/20 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="w-13 h-13 rounded-xl flex items-center justify-center overflow-hidden border border-amber-500/40 bg-black shadow-md shadow-amber-500/10">
          <img 
            src="/logo_tanaka.png" 
            alt="Edilia Tanaka Logo" 
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-black text-sm md:text-base leading-tight tracking-wider text-amber-400 truncate">
            EDILIA TANAKA
          </h1>
          <p className="text-[10px] text-amber-200/90 font-bold tracking-widest uppercase">
            Y ASOCIADOS
          </p>
          <span className="text-[9px] text-slate-400 italic block truncate mt-0.5">
            "La Abogada de Tu Familia"
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Principal</p>
          <nav className="space-y-1">
            {menuItems.filter(item => item.roles.includes(user?.role || '')).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  isActive 
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {user?.role === 'admin' && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Administración</p>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                    isActive 
                      ? "bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        <NavLink 
          to="/perfil"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-3 mb-2 rounded-lg transition-colors",
            isActive ? "bg-white/10" : "hover:bg-white/5"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
            <UserCircle size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-white">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
          </div>
        </NavLink>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
