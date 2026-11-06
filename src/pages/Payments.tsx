import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Receipt,
  ArrowUpRight
} from 'lucide-react';
import { Payment, Case, Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('1000');
  const [newPayment, setNewPayment] = useState({
    case_id: '',
    client_id: '',
    amount: '',
    concept: '',
    type: 'manual',
    method: 'Transferencia',
    reference: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const [payRes, casesRes, clientsRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/cases'),
        fetch('/api/clients')
      ]);
      setPayments(await payRes.json());
      setCases(await casesRes.json());
      setClients(await clientsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const paymentId = urlParams.get('payment_id');

    if (success === 'true' && sessionId && paymentId) {
      fetch('/api/payments/stripe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, payment_id: paymentId })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          alert('¡Pago confirmado exitosamente!');
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchData();
        } else {
          alert('El pago no pudo ser confirmado o sigue pendiente.');
        }
      }).catch(console.error);
    } else if (urlParams.get('canceled') === 'true') {
      alert('El pago fue cancelado.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment),
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
        setNewPayment({ case_id: '', client_id: '', amount: '', concept: '', type: 'manual', method: 'Transferencia', reference: '', notes: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pagos y Facturación</h1>
          <p className="text-slate-500">Control de honorarios, gastos y transacciones en MXN.</p>
        </div>
        <div className="flex gap-3">
          {user?.role !== 'cliente' && (
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
              <Receipt size={18} />
              Registro Manual
            </button>
          )}
          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
          >
            <ArrowUpRight size={18} />
            Pagar por Transferencia
          </button>
          <button 
            onClick={async () => {
              const caseId = cases[0]?.id;
              if (!caseId) return alert("No hay expedientes disponibles para pago.");
              const amount = prompt("Ingrese el monto a pagar (MXN):", "1000");
              if (!amount) return;
              
              try {
                const res = await fetch('/api/payments/stripe/init', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ case_id: caseId, amount: parseFloat(amount) }),
                });
                const data = await res.json();
                if (data.success && data.url) {
                  window.location.href = data.url;
                } else {
                  alert(data.error || "Error al iniciar el pago");
                }
              } catch (err) {
                console.error(err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
          >
            <CreditCard size={18} />
            Nuevo Pago Online
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-slate-500 text-sm font-medium">Total Recaudado</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">MXN</span>
          </h3>
          <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-10">
            <DollarSign size={100} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Pagos Pendientes</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">0</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Transacciones</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Historial de Transacciones</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar pago..." 
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Expediente / Concepto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit uppercase">
                      <CheckCircle2 size={12} /> {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 text-sm">{p.case_title}</p>
                      <p className="text-xs text-slate-500">{p.concept}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.type === 'stripe' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.currency}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {format(new Date(p.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Registrar Pago Manual</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expediente</label>
                  <select 
                    required
                    value={newPayment.case_id}
                    onChange={e => {
                      const c = cases.find(cs => cs.id === parseInt(e.target.value));
                      setNewPayment({...newPayment, case_id: e.target.value, client_id: c?.client_id.toString() || ''});
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto (MXN)</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Concepto</label>
                <input 
                  type="text" 
                  required 
                  value={newPayment.concept}
                  onChange={e => setNewPayment({...newPayment, concept: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  placeholder="Ej: Honorarios Iniciales"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método</label>
                  <select 
                    value={newPayment.method}
                    onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referencia</label>
                  <input 
                    type="text" 
                    value={newPayment.reference}
                    onChange={e => setNewPayment({...newPayment, reference: e.target.value})}
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
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Datos de Transferencia</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=STP|LEXMARCORP|646180123456789012|${transferAmount}`} 
                    alt="QR Transferencia" 
                    className="w-40 h-40"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">SPIN by OXXO</h4>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Escanea para pagar</p>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Beneficiario</label>
                  <p className="text-sm font-bold text-slate-900">LEXMARCORP S.A. DE C.V.</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CLABE Interbancaria (STP)</label>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-bold text-slate-900 tracking-wider">6461 8012 3456 7890 12</p>
                      <button className="text-[10px] font-bold text-amber-600 hover:underline">Copiar</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Número de Tarjeta SPIN</label>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-bold text-slate-900 tracking-wider">4169 1612 3456 7890</p>
                      <button className="text-[10px] font-bold text-amber-600 hover:underline">Copiar</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-slate-500">Monto a transferir:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">$</span>
                    <input 
                      type="number" 
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-24 text-sm font-bold text-slate-900 bg-transparent border-b border-slate-200 focus:border-amber-500 outline-none text-right"
                    />
                    <span className="text-[10px] font-bold text-slate-400">MXN</span>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const caseId = cases[0]?.id;
                    if (!caseId) return alert("No hay expedientes disponibles.");
                    
                    try {
                      await fetch('/api/payments/transfer/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ case_id: caseId, amount: parseFloat(transferAmount) }),
                      });
                      alert("¡Gracias! Por favor, una vez realizada la transferencia, envía tu comprobante por el chat del expediente.");
                      setShowTransferModal(false);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full py-4 bg-slate-950 text-amber-500 font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-950/10"
                >
                  Confirmar Intención de Pago
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Al confirmar, se registrará tu intención de pago en el sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
