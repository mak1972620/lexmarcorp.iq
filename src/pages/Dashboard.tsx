import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  CreditCard, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  Edit2,
  Save
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Editable states
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState({ cases: 50, tasks: 100 });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
      if (data.settings) {
        if (data.settings.admin_notes) setNotes(data.settings.admin_notes);
        if (data.settings.goal_cases) setGoals(g => ({ ...g, cases: parseInt(data.settings.goal_cases) }));
        if (data.settings.goal_tasks) setGoals(g => ({ ...g, tasks: parseInt(data.settings.goal_tasks) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'admin_notes', value: notes })
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goal_cases', value: goals.cases.toString() })
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'goal_tasks', value: goals.tasks.toString() })
      });
      setIsEditing(false);
      await fetchStats(); // Refresh stats
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-64 bg-[#111827] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#111827] rounded-2xl border border-[#1E293B]" />)}
      </div>
    </div>
  );

  const kpiCards = [
    { label: 'Total Clientes & Usuarios', value: stats?.kpis.totalUsers, icon: Users },
    { label: 'Expedientes en Trámite', value: stats?.kpis.totalCases, icon: Briefcase },
    { label: 'Términos & Tareas', value: stats?.kpis.pendingTasks, icon: CheckSquare },
    { label: 'Honorarios Procesados', value: stats?.kpis.completedPayments, icon: CreditCard },
  ];

  return (
    <div className="space-y-8 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#D4AF37] font-serif tracking-wide">
            Bienvenida, {user?.name}
          </h1>
          <p className="text-slate-400 capitalize text-sm mt-1">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0B0F17] rounded-xl border border-[#D4AF37]/30 shadow-sm">
          <TrendingUp className="text-[#D4AF37]" size={18} />
          <span className="text-xs font-bold text-[#E5C058] uppercase tracking-wider">Tanaka IQ • Sistema Operativo Activo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-[#0B0F17] p-6 rounded-2xl border border-[#1E293B] hover:border-[#D4AF37]/50 shadow-lg shadow-black/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                <card.icon size={22} />
              </div>
              <span className="text-[10px] font-bold text-[#D4AF37]/70 uppercase tracking-widest">ESTADÍSTICA</span>
            </div>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{card.label}</p>
            <h3 className="text-3xl font-black text-white mt-1 group-hover:text-[#D4AF37] transition-colors">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0B0F17] rounded-2xl border border-[#1E293B] shadow-xl shadow-black/50 overflow-hidden">
          <div className="p-6 border-b border-[#1E293B] flex items-center justify-between bg-gradient-to-r from-[#0F1523] to-[#0B0F17]">
            <h3 className="font-bold text-[#D4AF37] flex items-center gap-2 text-base">
              <Clock size={19} className="text-[#D4AF37]" />
              Actividad Reciente del Despacho
            </h3>
          </div>
          <div className="divide-y divide-[#1E293B]">
            {stats?.recentActivity.map((log: any) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-[#111827] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#070A0F] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                    {log.user_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      {log.user_name} <span className="font-normal text-slate-400">realizó</span> <span className="text-[#E5C058]">{log.action}</span>
                    </p>
                    <p className="text-xs text-slate-500">Módulo: {log.entity}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {format(new Date(log.timestamp), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B0F17] rounded-2xl p-6 text-white border border-[#D4AF37]/30 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="relative z-10 flex-1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1E293B]">
              <h3 className="text-lg font-black text-[#D4AF37] font-serif">Balance & Metas</h3>
              {(user?.role === 'admin' || user?.role === 'abogado') && (
                <button 
                  onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)} 
                  disabled={savingSettings}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E5C058] text-black font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-[#D4AF37]/20"
                >
                  {isEditing ? <><Save size={13}/> Guardar</> : <><Edit2 size={13}/> Editar</>}
                </button>
              )}
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[#1E293B]">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Ingresos</p>
                <p className="text-emerald-400 font-bold text-lg">${(stats?.kpis.income || 0).toLocaleString('es-MX')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Gastos Operativos</p>
                <p className="text-rose-400 font-bold text-lg">${(stats?.kpis.expenses || 0).toLocaleString('es-MX')}</p>
              </div>
              <div className="col-span-2 bg-[#070A0F] border border-[#1E293B] rounded-xl p-3.5 mt-2">
                <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider mb-1">Ganancia Neta del Despacho</p>
                <p className={cn("text-2xl font-black font-mono", (stats?.kpis.balance || 0) >= 0 ? "text-[#E5C058]" : "text-rose-500")}>
                  ${(stats?.kpis.balance || 0).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col">
                 <div className="flex justify-between mb-1.5 text-xs">
                   <span className="text-slate-400 uppercase tracking-wider">Expedientes Activos</span>
                   <span className="text-[#D4AF37] font-bold">
                     {stats?.kpis.totalCases || 0}
                     <span className="text-slate-500 font-normal"> / {goals.cases} meta</span>
                   </span>
                 </div>
                 {isEditing ? (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Meta:</span>
                     <input 
                       type="number" 
                       value={goals.cases} 
                       onChange={e => setGoals({...goals, cases: parseInt(e.target.value) || 0})}
                       className="w-24 bg-[#070A0F] border border-[#D4AF37]/40 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-[#D4AF37]"
                     />
                   </div>
                 ) : (
                   <div className="w-full bg-[#111827] h-2.5 rounded-full overflow-hidden border border-[#1E293B]">
                     <div className="bg-[#D4AF37] h-full rounded-full transition-all duration-1000 shadow-sm shadow-[#D4AF37]/50" style={{ width: `${Math.min(100, ((stats?.kpis.totalCases || 0) / (goals.cases || 1)) * 100)}%` }} />
                   </div>
                 )}
              </div>
              
              <div className="flex flex-col">
                 <div className="flex justify-between mb-1.5 text-xs">
                   <span className="text-slate-400 uppercase tracking-wider">Tareas Pendientes</span>
                   <span className="text-[#E5C058] font-bold">
                     {stats?.kpis.pendingTasks || 0}
                     <span className="text-slate-500 font-normal"> / {goals.tasks} max</span>
                   </span>
                 </div>
                 {isEditing ? (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Límite:</span>
                     <input 
                       type="number" 
                       value={goals.tasks} 
                       onChange={e => setGoals({...goals, tasks: parseInt(e.target.value) || 0})}
                       className="w-24 bg-[#070A0F] border border-[#D4AF37]/40 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none focus:border-[#D4AF37]"
                     />
                   </div>
                 ) : (
                   <div className="w-full bg-[#111827] h-2.5 rounded-full overflow-hidden border border-[#1E293B]">
                     <div className="bg-[#E5C058] h-full rounded-full transition-all duration-1000 shadow-sm shadow-[#E5C058]/50" style={{ width: `${Math.min(100, ((stats?.kpis.pendingTasks || 0) / (goals.tasks || 1)) * 100)}%` }} />
                   </div>
                 )}
              </div>
              
              <div className="mt-6 pt-5 border-t border-[#1E293B]">
                <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-2.5">Notas Administrativas / Resumen</p>
                {isEditing ? (
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-32 bg-[#070A0F] border border-[#D4AF37]/40 rounded-xl p-3 text-sm text-slate-100 resize-none outline-none focus:border-[#D4AF37]"
                    placeholder="Escribe el resumen ejecutivo o notas aquí..."
                  />
                ) : (
                  <div className="text-xs text-slate-300 bg-[#070A0F] p-4 rounded-xl min-h-24 whitespace-pre-wrap border border-[#1E293B] leading-relaxed">
                    {notes || <span className="text-slate-500 italic">No hay notas registradas. Haz clic en Editar para añadir un resumen.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { cn } from '../types';
export default Dashboard;
