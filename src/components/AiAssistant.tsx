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
        throw new Error(data.error || 'Error en la comunicación con Tanaka Legal IQ.');
      }

      setMessages(prev => [...prev, { role: 'model', text: data.text || 'No pude generar una respuesta.' }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: `**Error:** ${err.message || 'Error de conexión con Tanaka Legal IQ'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-[#D4AF37] hover:bg-[#E5C058] text-[#070A0F] font-bold rounded-full shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center transition-all z-40 border-2 border-black ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
        title="Asistente Jurídico Tanaka IQ"
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
            className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] flex flex-col bg-[#0B0F17] rounded-2xl shadow-2xl border border-[#D4AF37]/40 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#070A0F] p-4 flex items-center justify-between border-b border-[#1E293B] relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#D4AF37]/15 rounded-xl border border-[#D4AF37]/30">
                  <BrainCircuit size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#D4AF37]">Tanaka Legal IQ</h3>
                  <p className="text-[10px] text-slate-400">Inteligencia Jurídica Forense</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#070A0F]">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-70 space-y-3">
                  <BrainCircuit size={44} className="text-[#D4AF37]" />
                  <p className="text-xs font-medium text-center px-4 leading-relaxed text-slate-300">
                    Hola {user?.name || 'Colega'}, ¿en qué asunto procesal te asesoro hoy?
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-md leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-[#D4AF37] text-black font-semibold rounded-tr-sm' 
                        : 'bg-[#111827] border border-[#1E293B] text-slate-200 rounded-tl-sm prose prose-sm prose-invert max-w-none'
                    }`}
                  >
                    {m.role === 'user' ? m.text : <ReactMarkdown>{m.text}</ReactMarkdown>}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3 shadow-md rounded-tl-sm flex items-center gap-2 text-[#D4AF37]">
                    <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                    <span className="text-xs font-semibold text-slate-400">Tanaka IQ está redactando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#0B0F17] border-t border-[#1E293B]">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Formula una consulta jurídica o procesal..."
                  className="w-full bg-[#070A0F] text-xs text-slate-100 rounded-xl pl-3.5 pr-12 py-3 outline-none border border-[#1E293B] focus:border-[#D4AF37] transition-all placeholder:text-slate-600"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-1.5 p-2 text-black bg-[#D4AF37] hover:bg-[#E5C058] rounded-lg disabled:opacity-30 disabled:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
