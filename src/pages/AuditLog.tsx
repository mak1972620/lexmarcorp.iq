import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  User, 
  Activity,
  ShieldAlert
} from 'lucide-react';
import { AuditLog as AuditLogType } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AuditLog = () => {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('UPDATE')) return 'text-amber-600 bg-amber-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    if (action.includes('LOGIN')) return 'text-blue-600 bg-blue-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registro de Auditoría</h1>
          <p className="text-slate-500">Historial completo de acciones y eventos del sistema.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all">
          <Download size={18} />
          Exportar Logs
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por acción, usuario o entidad..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Entidad</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ID Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900">{log.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Activity size={14} className="text-slate-400" />
                      {log.entity}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                    #{log.id.toString().padStart(5, '0')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
