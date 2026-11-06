import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  User, 
  Mail, 
  Calendar, 
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { User as UserType } from '../types';
import { format } from 'date-fns';

const UsersAdmin = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'abogado': return 'bg-amber-100 text-amber-700';
      case 'cliente': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-500">Administra roles y permisos de acceso al sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Total Usuarios</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{users.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Administradores</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{users.filter(u => u.role === 'admin').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Abogados</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{users.filter(u => u.role === 'abogado').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Clientes</p>
          <h3 className="text-2xl font-bold text-blue-600 mt-1">{users.filter(u => u.role === 'cliente').length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Rol Actual</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha Registro</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cambiar Rol</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {format(new Date(), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block text-left">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="admin">Administrador</option>
                        <option value="abogado">Abogado</option>
                        <option value="cliente">Cliente</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <MoreVertical size={18} />
                    </button>
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

export default UsersAdmin;
