import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, BrainCircuit, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error en la comunicación con LexmarIQ.');
      }

      setMessages(prev => [...prev, { role: 'model', text: data.text || 'No pude generar una respuesta.' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `**Error:** ${err.message || 'Error de conexión con LexmarIQ'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-xl shadow-amber-500/20 flex items-center justify-center transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
      >
        <BrainCircuit size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-950 p-4 flex items-center justify-between shadow-md relative z-10">
              <div className="flex items-center gap-3 text-white">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <BrainCircuit size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold">LexmarIQ Asistente</h3>
                  <p className="text-xs text-slate-400">Inteligencia Jurídica</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                  <BrainCircuit size={48} />
                  <p className="text-sm font-medium text-center px-4">
                    Hola {user?.name || 'Colega'}, ¿En qué te puedo asesorar jurídicamente hoy?
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-amber-500 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm prose prose-sm prose-slate max-w-none prose-p:my-1 prose-a:text-amber-600 prose-strong:text-slate-900 prose-ul:my-1 prose-li:my-0'
                    }`}
                  >
                    {m.role === 'user' ? m.text : <ReactMarkdown>{m.text}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm rounded-tl-sm flex items-center gap-2 text-amber-500">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">LexmarIQ está redactando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregúntale a LexmarIQ..."
                  className="w-full bg-slate-100 text-sm text-slate-800 rounded-xl pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border border-transparent focus:border-amber-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-2 p-2 text-white bg-slate-950 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
