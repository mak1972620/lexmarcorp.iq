import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Briefcase,
  Loader2
} from 'lucide-react';
import { Case } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatMessage {
  id: number;
  case_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch('/api/cases');
        if (res.ok) {
          const data = await res.json();
          setCases(data);
          if (data.length > 0) {
            setSelectedCase(data[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  useEffect(() => {
    if (!selectedCase) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?case_id=${selectedCase.id}`);
        if (res.ok) {
          setMessages(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();
  }, [selectedCase]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: selectedCase.id, content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage('');
        const msgRes = await fetch(`/api/messages?case_id=${selectedCase.id}`);
        if (msgRes.ok) {
          setMessages(await msgRes.json());
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const filteredCases = cases.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.case_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Centro de Mensajería</h1>
        <p className="text-slate-500">Comunicación segura y directa vinculada a tus expedientes reales.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
        {/* Sidebar: Cases List */}
        <div className="w-80 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar expediente..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin text-amber-500" size={24} />
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay expedientes registrados.
              </div>
            ) : (
              filteredCases.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 cursor-pointer transition-colors relative ${selectedCase?.id === c.id ? 'bg-amber-50/60 border-l-4 border-amber-500' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-bold text-sm text-slate-900 truncate pr-2">{c.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.case_number ? `Exp: ${c.case_number}` : c.type}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main: Chat View */}
        {!selectedCase ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-1">Sin conversaciones activas</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Registra o selecciona un expediente en el panel izquierdo para iniciar la mensajería vinculada al caso.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-slate-50/50">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedCase.title}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {selectedCase.case_number ? `Expediente: ${selectedCase.case_number}` : selectedCase.type}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No hay mensajes en este expediente todavía. Escribe el primero abajo.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${isMe ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                        {(msg.sender_name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className={`space-y-1 ${isMe ? 'text-right' : ''}`}>
                        <div className={`p-3 rounded-2xl ${isMe ? 'bg-slate-950 rounded-tr-none text-white shadow-lg shadow-slate-950/10' : 'bg-white rounded-tl-none border border-slate-200 shadow-sm text-slate-700'}`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {msg.sender_name} • {format(new Date(msg.created_at), 'dd MMM HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje vinculado a este expediente..." 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <button 
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="p-2.5 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-600 disabled:opacity-50 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
