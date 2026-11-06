import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  User, 
  Briefcase,
  MoreVertical,
  Paperclip
} from 'lucide-react';

const Messages = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const mockMessages = [
    { id: 1, case: 'Divorcio Pérez', lastMsg: 'Se ha presentado el escrito inicial...', date: '10:30 AM', unread: 2 },
    { id: 2, case: 'Despido Injustificado', lastMsg: 'La audiencia se reprogramó para el...', date: 'Ayer', unread: 0 },
    { id: 3, case: 'Amparo Indirecto', lastMsg: 'Adjunto el acuse de recibo de la...', date: '05 Mar', unread: 0 },
  ];

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Centro de Mensajería</h1>
        <p className="text-slate-500">Comunicación segura y directa vinculada a tus expedientes.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
        {/* Sidebar: Chat List */}
        <div className="w-80 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar conversación..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {mockMessages.map((chat) => (
              <div key={chat.id} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors relative">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate pr-8">{chat.case}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">{chat.date}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{chat.lastMsg}</p>
                {chat.unread > 0 && (
                  <span className="absolute right-4 bottom-4 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                    {chat.unread}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main: Chat View */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Divorcio Pérez vs García</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expediente: 123/2024</p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
              <MoreVertical size={20} />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex justify-center">
              <span className="px-3 py-1 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hoy</span>
            </div>

            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">CM</div>
              <div className="space-y-1">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                  <p className="text-sm text-slate-700">Hola, he subido el escrito inicial de demanda para su revisión. Por favor, confírmeme si los datos son correctos.</p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">10:30 AM</p>
              </div>
            </div>

            <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-950">MG</div>
              <div className="space-y-1 text-right">
                <div className="bg-slate-950 p-3 rounded-2xl rounded-tr-none text-white shadow-lg shadow-slate-950/10">
                  <p className="text-sm">Recibido, Licenciado. Lo reviso en un momento y le aviso.</p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">10:35 AM</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <Paperclip size={20} />
              </button>
              <input 
                type="text" 
                placeholder="Escribe un mensaje..." 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
              <button className="p-2.5 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
