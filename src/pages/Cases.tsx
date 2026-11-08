import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Calendar,
  User,
  Gavel,
  CheckCircle2,
  Clock,
  Camera,
  Loader2,
  Trash2,
  Upload,
  FileText
} from 'lucide-react';
import { Case, Client, User as Lawyer } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Cases = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrImages, setOcrImages] = useState<string[]>([]);
  const [detectedCases, setDetectedCases] = useState<any[]>([]);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  
  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterLawyer, setFilterLawyer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    client_id: '',
    lawyer_id: user?.id || '',
    type: 'Civil',
    court: '',
    case_number: ''
  });

  const fetchData = async () => {
    try {
      const [casesRes, clientsRes, lawyersRes, statsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/clients'),
        fetch('/api/lawyers'),
        fetch('/api/stats')
      ]);
      setCases(await casesRes.json());
      setClients(await clientsRes.json());
      setLawyers(await lawyersRes.json());
      
      const statsData = await statsRes.json();
      setTotalDocuments(statsData.kpis.totalDocuments || 0);
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
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCase),
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
        setNewCase({ title: '', description: '', client_id: '', lawyer_id: user?.id || '', type: 'Civil', court: '', case_number: '' });
        setOcrImages([]);
        setDetectedCases([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setOcrImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeOcrImage = (index: number) => {
    setOcrImages(prev => prev.filter((_, i) => i !== index));
  };

  const extractDataFromImages = async () => {
    if (ocrImages.length === 0) return;
    setIsExtracting(true);
    setDetectedCases([]);
    try {
      const res = await fetch('/api/ai/extract-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: ocrImages,
          clients: clients.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })),
          lawyers: lawyers.map(l => ({ id: l.id, name: l.name }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cases_detected && Array.isArray(data.cases_detected)) {
          setDetectedCases(data.cases_detected);
          if (data.cases_detected.length > 0) {
            const firstCase = data.cases_detected[0];
            setNewCase(prev => ({
              ...prev,
              title: firstCase.title || prev.title,
              description: firstCase.description || prev.description,
              type: firstCase.type || prev.type,
              court: firstCase.court || prev.court,
              case_number: firstCase.case_number || prev.case_number,
              client_id: firstCase.client_id ? String(firstCase.client_id) : prev.client_id,
              lawyer_id: firstCase.lawyer_id ? String(firstCase.lawyer_id) : prev.lawyer_id,
            }));
          }
        }
      } else {
        const errData = await res.json();
        alert(`Error al extraer datos: ${errData.error}`);
      }
    } catch (err) {
      console.error('Error extracting data:', err);
      alert('Hubo un error al comunicarse con la IA.');
    } finally {
      setIsExtracting(false);
    }
  };

  const selectDetectedCase = (caseData: any) => {
    setNewCase(prev => ({
      ...prev,
      title: caseData.title || prev.title,
      description: caseData.description || prev.description,
      type: caseData.type || prev.type,
      court: caseData.court || prev.court,
      case_number: caseData.case_number || prev.case_number,
      client_id: caseData.client_id ? String(caseData.client_id) : prev.client_id,
      lawyer_id: caseData.lawyer_id ? String(caseData.lawyer_id) : prev.lawyer_id,
    }));
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = filterClient ? c.client_id.toString() === filterClient : true;
    const matchesLawyer = filterLawyer ? c.lawyer_id.toString() === filterLawyer : true;
    const matchesStatus = filterStatus ? c.status.toLowerCase() === filterStatus.toLowerCase() : true;
    const matchesType = filterType ? c.type.toLowerCase() === filterType.toLowerCase() : true;

    return matchesSearch && matchesClient && matchesLawyer && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'abierto': return 'bg-emerald-100 text-emerald-700';
      case 'cerrado': return 'bg-slate-100 text-slate-700';
      case 'suspendido': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expedientes Judiciales</h1>
          <p className="text-slate-500">Gestión de casos, juzgados y seguimiento procesal.</p>
        </div>
        {user?.role !== 'cliente' && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-black rounded-xl shadow-md shadow-[#D4AF37]/20 hover:bg-[#E5C058] transition-all cursor-pointer"
          >
            <Plus size={18} />
            Nuevo Expediente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Expedientes</p>
          <h3 className="text-2xl font-bold text-white mt-1">{cases.length}</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Abiertos</p>
          <h3 className="text-2xl font-bold text-white mt-1">{cases.filter(c => c.status === 'abierto').length}</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tareas Pendientes</p>
          <h3 className="text-2xl font-bold text-white mt-1">0</h3>
        </div>
        <div className="bg-[#121214] p-6 rounded-2xl border border-[#27272A] shadow-md">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Documentos</p>
          <h3 className="text-2xl font-bold text-white mt-1">{totalDocuments}</h3>
        </div>
      </div>

      <div className="bg-[#121214] rounded-2xl border border-[#27272A] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por título, número o cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${showFilters ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Filter size={18} />
                Filtros
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</label>
                <select 
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Todos los clientes</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abogado</label>
                <select 
                  value={filterLawyer}
                  onChange={(e) => setFilterLawyer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Todos los abogados</option>
                  {lawyers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="abierto">Abierto</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Juicio</label>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Civil">Civil</option>
                  <option value="Penal">Penal</option>
                  <option value="Familiar">Familiar</option>
                  <option value="Laboral">Laboral</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="Amparo">Amparo</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Expediente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente / Abogado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo / Juzgado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-400 font-mono">{c.case_number}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                        <User size={12} className="text-amber-500" /> {c.client_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Gavel size={12} /> {c.lawyer_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                        {c.type}
                      </span>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">{c.court}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {format(new Date(c.created_at), 'dd/MM/yyyy')}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Nuevo Expediente Judicial</h3>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setOcrImages([]);
                  setDetectedCases([]);
                  setNewCase({ title: '', description: '', client_id: '', lawyer_id: user?.id || '', type: 'Civil', court: '', case_number: '' });
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="overflow-y-auto w-full">
              <div className="p-6 border-b border-slate-100 bg-amber-50/50">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Camera size={18} />
                  <h4 className="text-sm font-bold">Auto-completar con LexmarIQ</h4>
                </div>
                <p className="text-xs text-amber-600 mb-4">
                  Sube fotos o documentos (demandas, expedientes, resoluciones, PDF, Word, etc.). La IA extraerá los datos del caso basándose <strong>únicamente</strong> en el contenido del documento.
                </p>

                <div className="flex gap-4 mb-4">
                  <div 
                    onClick={() => ocrFileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Upload size={24} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">Subir Archivos</span>
                  </div>
                  <div 
                    onClick={() => ocrFileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors md:hidden"
                  >
                    <Camera size={24} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">Tomar Foto</span>
                  </div>
                </div>
                
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.pdf,.doc,.docx,.txt" 
                  capture="environment"
                  ref={ocrFileInputRef} 
                  className="hidden" 
                  onChange={handleImageSelect} 
                />
                
                <div className="flex flex-wrap gap-2">
                  {ocrImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber-200 shadow-sm flex items-center justify-center bg-slate-50">
                      {img.startsWith('data:image/') ? (
                        <img src={img} alt="Documento" className="w-full h-full object-cover" />
                      ) : (
                        <FileText size={24} className="text-slate-400" />
                      )}
                      <button 
                        type="button"
                        onClick={() => removeOcrImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {ocrImages.length > 0 && ocrImages.length < 5 && !isExtracting && (
                    <button 
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-amber-500 hover:border-amber-400"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] font-bold mt-1">Subir</span>
                    </button>
                  )}
                </div>
                
                {ocrImages.length > 0 && !isExtracting && (
                  <button 
                    type="button" 
                    onClick={extractDataFromImages}
                    className="px-4 py-2 mt-4 bg-amber-500 text-slate-950 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors w-max"
                  >
                    Extraer Datos con IA
                  </button>
                )}

                {isExtracting && (
                  <div className="flex items-center gap-2 mt-4 text-amber-600 text-sm font-bold">
                    <Loader2 size={16} className="animate-spin" />
                    Analizando documento y deduciendo asunto...
                  </div>
                )}

                {detectedCases.length > 0 && (
                  <div className="mt-4 p-4 bg-white border border-amber-200 rounded-xl shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-3">Posibles interpretaciones y sugerencias (A elegir o modificar por tí):</h4>
                    <div className="space-y-3">
                      {detectedCases.map((detectedCase, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">{detectedCase.title}</p>
                            <p className="text-xs text-slate-700 mt-1">{detectedCase.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {detectedCase.type && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase">{detectedCase.type}</span>}
                              {detectedCase.case_number && <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full font-mono">{detectedCase.case_number}</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic flex gap-1">
                              <strong>Razón:</strong> {detectedCase.reasoning}
                            </p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => selectDetectedCase(detectedCase)}
                            className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            Usar esta sugerencia
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 shrink-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título del Caso</label>
                  <input 
                    type="text" 
                    required 
                    value={newCase.title}
                    onChange={e => setNewCase({...newCase, title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    placeholder="Ej: Divorcio Incausado - Pérez vs García"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                  <textarea 
                    value={newCase.description}
                    onChange={e => setNewCase({...newCase, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                  <select 
                    required
                    value={newCase.client_id}
                    onChange={e => setNewCase({...newCase, client_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="">Seleccionar Cliente</option>
                    {clients.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.first_name} {cl.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Abogado Asignado</label>
                  <select 
                    required
                    value={newCase.lawyer_id}
                    onChange={e => setNewCase({...newCase, lawyer_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    {lawyers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Juicio</label>
                  <select 
                    value={newCase.type}
                    onChange={e => setNewCase({...newCase, type: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Penal">Penal</option>
                    <option value="Familiar">Familiar</option>
                    <option value="Laboral">Laboral</option>
                    <option value="Mercantil">Mercantil</option>
                    <option value="Amparo">Amparo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Expediente</label>
                  <input 
                    type="text" 
                    value={newCase.case_number}
                    onChange={e => setNewCase({...newCase, case_number: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono"
                    placeholder="Ej: 123/2024"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Juzgado / Tribunal</label>
                  <input 
                    type="text" 
                    value={newCase.court}
                    onChange={e => setNewCase({...newCase, court: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    placeholder="Ej: Juzgado Primero de lo Familiar"
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
                  Crear Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cases;
