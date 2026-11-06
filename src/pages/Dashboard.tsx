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
      <div className="h-8 w-64 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
      </div>
    </div>
  );

  const kpiCards = [
    { label: 'Total Usuarios', value: stats?.kpis.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Expedientes', value: stats?.kpis.totalCases, icon: Briefcase, color: 'bg-amber-500' },
    { label: 'Tareas Pendientes', value: stats?.kpis.pendingTasks, icon: CheckSquare, color: 'bg-emerald-500' },
    { label: 'Ingresos Pagados', value: stats?.kpis.completedPayments, icon: CreditCard, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bienvenido, {user?.name}</h1>
          <p className="text-slate-500 capitalize">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="text-emerald-500" size={18} />
          <span className="text-sm font-semibold text-slate-700">Sistema Operativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl text-white", card.color)}>
                <card.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KPI</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{card.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Actividad Reciente
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentActivity.map((log: any) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {log.user_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {log.user_name} <span className="font-normal text-slate-500">realizó</span> {log.action}
                    </p>
                    <p className="text-xs text-slate-400">Entidad: {log.entity}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {format(new Date(log.timestamp), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col">
          <div className="relative z-10 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Resumen del Sistema</h3>
              {(user?.role === 'admin' || user?.role === 'abogado') && (
                <button 
                  onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)} 
                  disabled={savingSettings}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                >
                  {isEditing ? <><Save size={14}/> Guardar</> : <><Edit2 size={14}/> Editar</>}
                </button>
              )}
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Ingresos</p>
                <p className="text-emerald-400 font-bold text-lg">${(stats?.kpis.income || 0).toLocaleString('es-MX')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Gastos Operativos</p>
                <p className="text-rose-400 font-bold text-lg">${(stats?.kpis.expenses || 0).toLocaleString('es-MX')}</p>
              </div>
              <div className="col-span-2 bg-white/5 rounded-lg p-3 mt-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Balance General (Ganancia Neta)</p>
                <p className={cn("text-2xl font-bold", (stats?.kpis.balance || 0) >= 0 ? "text-white" : "text-rose-500")}>
                  ${(stats?.kpis.balance || 0).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col">
                 <div className="flex justify-between mb-1.5 text-sm">
                   <span className="text-slate-400">Expedientes Activos</span>
                   <span className="text-amber-500 font-bold">
                     {stats?.kpis.totalCases || 0}
                     <span className="text-white/30 font-normal"> / {goals.cases} meta</span>
                   </span>
                 </div>
                 {isEditing ? (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Meta:</span>
                     <input 
                       type="number" 
                       value={goals.cases} 
                       onChange={e => setGoals({...goals, cases: parseInt(e.target.value) || 0})}
                       className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-amber-500/50"
                     />
                   </div>
                 ) : (
                   <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                     <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((stats?.kpis.totalCases || 0) / (goals.cases || 1)) * 100)}%` }} />
                   </div>
                 )}
              </div>
              
              <div className="flex flex-col">
                 <div className="flex justify-between mb-1.5 text-sm">
                   <span className="text-slate-400">Tareas Pendientes</span>
                   <span className="text-emerald-500 font-bold">
                     {stats?.kpis.pendingTasks || 0}
                     <span className="text-white/30 font-normal"> / {goals.tasks} max</span>
                   </span>
                 </div>
                 {isEditing ? (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500">Límite:</span>
                     <input 
                       type="number" 
                       value={goals.tasks} 
                       onChange={e => setGoals({...goals, tasks: parseInt(e.target.value) || 0})}
                       className="w-24 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/50"
                     />
                   </div>
                 ) : (
                   <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                     <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((stats?.kpis.pendingTasks || 0) / (goals.tasks || 1)) * 100)}%` }} />
                   </div>
                 )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-3">Notas Administrativas / Resumen</p>
                {isEditing ? (
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-32 bg-black/30 border border-white/20 rounded-lg p-3 text-sm text-white resize-none outline-none focus:border-amber-500/50"
                    placeholder="Escribe el resumen ejecutivo o notas aquí..."
                  />
                ) : (
                  <div className="text-sm text-slate-300 bg-black/20 p-4 rounded-lg min-h-24 whitespace-pre-wrap border border-white/5">
                    {notes || <span className="text-slate-500 italic">No hay notas registradas. Haz clic en Editar para añadir un resumen.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

import { cn } from '../types';
export default Dashboard;
