import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, BrainCircuit, Loader2 } from 'lucide-react';
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
        className={`fixed bottom-6 right-6 w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C] text-[#060709] font-bold shadow-[0_4px_20px_rgba(212,175,55,0.4)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.6)] flex items-center justify-center transition-all duration-300 z-50 cursor-pointer ${isOpen ? 'scale-0 pointer-events-none' : 'scale-100 hover:scale-108'}`}
        title="Consultar Asistente IA Tanaka"
      >
        <Sparkles size={24} className="text-black" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[85vh] flex flex-col bg-[#0d0f14] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-[#D4AF37]/30 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#040507] p-4 flex items-center justify-between border-b border-[#D4AF37]/20 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#AA771C] rounded-lg flex items-center justify-center text-black font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-xs tracking-wider text-gold-gradient uppercase">Asistente IA Tanaka</h3>
                  <p className="text-[10px] text-[#8E95A5]">Consultoría Jurídica, Fiscal & Psicológica</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#8E95A5] hover:text-[#FFF3A7] transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#060709]/80">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8E95A5]">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mb-3 text-[#D4AF37]">
                    <BrainCircuit size={24} />
                  </div>
                  <h4 className="font-['Cinzel'] text-sm font-bold text-[#F3F4F6] mb-1">Tanaka Legal IQ</h4>
                  <p className="text-xs max-w-xs leading-relaxed text-[#8E95A5]">
                    Estimada Lic. Tanaka, estoy lista para redactar promociones, auditar liquidaciones de intereses o preparar interrogatorios de peritaje.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 w-full text-left">
                    <button 
                      onClick={() => setInput('Revisa los términos del expediente mercantil 2026')}
                      className="text-xs p-2.5 rounded-lg bg-[#0d0f14] border border-[#D4AF37]/20 text-[#D4D4D8] hover:border-[#D4AF37] hover:text-[#FFF3A7] transition-all text-left"
                    >
                      ⚖️ "Revisa los términos procesales de hoy"
                    </button>
                    <button 
                      onClick={() => setInput('Calcula los intereses moratorios con base en jurisprudencia de usura')}
                      className="text-xs p-2.5 rounded-lg bg-[#0d0f14] border border-[#D4AF37]/20 text-[#D4D4D8] hover:border-[#D4AF37] hover:text-[#FFF3A7] transition-all text-left"
                    >
                      📊 "Calcular liquidación con tope de usura"
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-[#BF953F] to-[#AA771C] text-black font-semibold'
                          : 'bg-[#0d0f14] text-[#F3F4F6] border border-[#D4AF37]/25 prose prose-invert prose-xs'
                      }`}
                    >
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#0d0f14] text-[#D4AF37] border border-[#D4AF37]/20 rounded-2xl p-3 flex items-center gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
                    Analizando con jurisprudencia y precedentes...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-[#040507] border-t border-[#D4AF37]/20 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Escribe tu consulta jurídica o pericial..."
                className="flex-1 bg-[#0d0f14] border border-[#D4AF37]/25 rounded-xl px-3.5 py-2 text-xs text-[#F3F4F6] placeholder-[#5C6270] outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-9 h-9 bg-gradient-to-br from-[#BF953F] to-[#AA771C] text-black rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
