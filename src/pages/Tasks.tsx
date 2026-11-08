import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical,
  Calendar
} from 'lucide-react';
import { Task, Case, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todas');
  const [dueDateFilter, setDueDateFilter] = useState('todas');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    case_id: '',
    assigned_to: user?.id || '',
    priority: 'Media' as 'Alta' | 'Media' | 'Baja',
    due_date: ''
  });

  const fetchData = async () => {
    try {
      const [tasksRes, casesRes, lawyersRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/cases'),
        fetch('/api/lawyers')
      ]);
      setTasks(await tasksRes.json());
      setCases(await casesRes.json());
      setLawyers(await lawyersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
        setNewTask({ title: '', description: '', case_id: '', assigned_to: user?.id || '', priority: 'Media', due_date: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Alta': return 'text-red-600 bg-red-50';
      case 'Media': return 'text-amber-600 bg-amber-50';
      case 'Baja': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const filteredTasks = tasks.filter(t => {
    // Status filter
    if (filterStatus !== 'todas' && t.status !== filterStatus) return false;
    
    // Search filter
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // Due date filter
    const isVencida = t.status !== 'completada' && isPast(new Date(t.due_date));
    const isPorCompletar = t.status !== 'completada';
    const isProxima = t.status !== 'completada' && !isPast(new Date(t.due_date));

    if (dueDateFilter === 'vencidas' && !isVencida) return false;
    if (dueDateFilter === 'proximas' && !isProxima) return false;
    if (dueDateFilter === 'por_completar' && !isPorCompletar) return false;

    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortConfig?.key === 'priority') {
      const priorityWeights: Record<string, number> = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      
      if (weightA < weightB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (weightA > weightB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    return 0;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas y Plazos</h1>
          <p className="text-slate-500">Seguimiento de actividades y vencimientos legales.</p>
        </div>
        {user?.role !== 'cliente' && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-black rounded-xl shadow-md shadow-[#D4AF37]/20 hover:bg-[#E5C058] transition-all cursor-pointer"
          >
            <Plus size={18} />
            Nueva Tarea
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pendientes</p>
          <h3 className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'pendiente').length}</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">En Progreso</p>
          <h3 className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'en progreso').length}</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completadas</p>
          <h3 className="text-2xl font-bold text-white mt-1">{tasks.filter(t => t.status === 'completada').length}</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Vencidas</p>
          <h3 className="text-2xl font-bold text-rose-400 mt-1">
            {tasks.filter(t => t.status !== 'completada' && isPast(new Date(t.due_date))).length}
          </h3>
        </div>
      </div>

      <div className="bg-[#121214] rounded-2xl border border-[#27272A] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {['todas', 'pendiente', 'en progreso', 'completada'].map(s => (
              <button 
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  filterStatus === s ? 'bg-slate-950 text-amber-500' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="todas">Cualquier Fecha</option>
              <option value="por_completar">Por Completar</option>
              <option value="proximas">Próximas</option>
              <option value="vencidas">Vencidas</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                let direction: 'asc' | 'desc' = 'desc';
                if (sortConfig && sortConfig.key === 'priority' && sortConfig.direction === 'desc') {
                  direction = 'asc';
                } else if (sortConfig && sortConfig.key === 'priority' && sortConfig.direction === 'asc') {
                  setSortConfig(null);
                  return;
                }
                setSortConfig({ key: 'priority', direction });
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                sortConfig?.key === 'priority' 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} />
              Prioridad {sortConfig?.key === 'priority' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
            </button>
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar tarea..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-12">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tarea</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Expediente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Prioridad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Vencimiento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Asignado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTasks.map((t) => {
                const isVencida = t.status !== 'completada' && isPast(new Date(t.due_date));
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {t.status === 'completada' ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : (
                        <Clock className={isVencida ? "text-red-500" : "text-slate-300"} size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className={`font-semibold text-sm ${t.status === 'completada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {t.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{t.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        {t.case_title}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-xs font-semibold ${isVencida ? 'text-red-600' : 'text-slate-600'}`}>
                        <Calendar size={14} />
                        {format(new Date(t.due_date), 'dd MMM, yyyy', { locale: es })}
                        {isVencida && <AlertCircle size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                          {t.assigned_name?.charAt(0)}
                        </div>
                        <span className="text-xs text-slate-600">{t.assigned_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nueva Tarea Legal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                <input 
                  type="text" 
                  required 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  placeholder="Ej: Presentar escrito de pruebas"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expediente</label>
                  <select 
                    required
                    value={newTask.case_id}
                    onChange={e => setNewTask({...newTask, case_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asignar a</label>
                  <select 
                    required
                    value={newTask.assigned_to}
                    onChange={e => setNewTask({...newTask, assigned_to: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Vencimiento</label>
                  <input 
                    type="date" 
                    required
                    value={newTask.due_date}
                    onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-slate-950 text-amber-500 font-bold rounded-xl hover:bg-slate-900 transition-all"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
