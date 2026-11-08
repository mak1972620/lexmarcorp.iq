import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone,
  UserPlus,
  Camera,
  Loader2,
  Trash2,
  Upload,
  FileText
} from 'lucide-react';
import { Client } from '../types';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrImages, setOcrImages] = useState<string[]>([]);
  const [extractionRole, setExtractionRole] = useState<'actor' | 'demandado' | 'aval' | 'endosatario' | 'auto'>('auto');
  const [detectedParties, setDetectedParties] = useState<any[]>([]);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    rfc: '',
    type: 'fisica',
  });

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openCreateModal = () => {
    setFormData({ first_name: '', last_name: '', email: '', phone: '', rfc: '', type: 'fisica' });
    setOcrImages([]);
    setDetectedParties([]);
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setFormData(client);
    setOcrImages([]);
    setDetectedParties([]);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
      setActiveMenuId(null);
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
    if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
  };

  const removeOcrImage = (index: number) => {
    setOcrImages(prev => prev.filter((_, i) => i !== index));
  };

  const extractDataFromImages = async () => {
    if (ocrImages.length === 0) return;
    setIsExtracting(true);
    setDetectedParties([]);
    try {
      const res = await fetch('/api/ai/extract-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: ocrImages, role: extractionRole })
      });
      if (res.ok) {
        const data = await res.json();
        if (extractionRole === 'auto' && data.parties && Array.isArray(data.parties)) {
          setDetectedParties(data.parties);
        } else {
          setFormData(prev => ({
            ...prev,
            first_name: data.first_name || prev.first_name || '',
            last_name: data.last_name || prev.last_name || '',
            email: data.email || prev.email || '',
            phone: data.phone || prev.phone || '',
            rfc: data.rfc || prev.rfc || '',
            type: data.type === 'moral' ? 'moral' : 'fisica'
          }));
        }
      } else {
        const errData = await res.json();
        alert(`Error al extraer datos: ${errData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al extraer datos.');
    } finally {
      setIsExtracting(false);
      setOcrImages([]);
    }
  };

  const selectDetectedParty = (party: any) => {
    setFormData(prev => ({
      ...prev,
      first_name: party.first_name || '',
      last_name: party.last_name || '',
      email: party.email || '',
      phone: party.phone || '',
      rfc: party.rfc || '',
      type: party.type === 'moral' ? 'moral' : 'fisica'
    }));
    setDetectedParties([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = formData.id ? 'PUT' : 'POST';
    const url = formData.id ? `/api/clients/${formData.id}` : '/api/clients';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClients = clients.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-slate-500">Administra la base de datos de tus representados.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-black rounded-xl shadow-md shadow-[#D4AF37]/20 hover:bg-[#E5C058] transition-all cursor-pointer"
        >
          <UserPlus size={18} />
          Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Total Clientes</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Personas Físicas</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{clients.filter(c => c.type === 'fisica').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Personas Morales</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{clients.filter(c => c.type === 'moral').length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o RFC..." 
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">RFC</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                        {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900">{client.first_name} {client.last_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail size={12} /> {client.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={12} /> {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{client.rfc}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      client.type === 'fisica' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {client.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === client.id ? null : client.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeMenuId === client.id && (
                      <div className="absolute right-10 top-10 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-10 flex flex-col items-start px-2 gap-1 animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => openEditModal(client)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 rounded-lg transition-colors font-medium"
                        >
                          Editar Cliente
                        </button>
                        <button 
                          onClick={() => handleDelete(client.id)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium"
                        >
                          Eliminar Cliente
                        </button>
                      </div>
                    )}
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
              <h3 className="text-lg font-bold text-slate-900">{formData.id ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 bg-amber-50/50 border-b border-amber-100 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Camera size={18} />
                <h4 className="text-sm font-bold">Auto-completar con LexmarIQ</h4>
              </div>
              <p className="text-xs text-amber-600">
                Sube fotos o documentos (INE, pasaporte, expedientes, PDF, Word, etc.). La IA extraerá los datos basándose <strong>únicamente</strong> en el contenido del documento.
              </p>

              <div className="flex flex-wrap gap-4 items-center">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="extractionRole" 
                    value="auto" 
                    checked={extractionRole === 'auto'} 
                    onChange={() => setExtractionRole('auto')}
                    className="accent-amber-500"
                  />
                  Auto-detectar Rol (IA)
                </label>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="extractionRole" 
                    value="actor" 
                    checked={extractionRole === 'actor'} 
                    onChange={() => setExtractionRole('actor')}
                    className="accent-amber-500"
                  />
                  Actor / Titular
                </label>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="extractionRole" 
                    value="demandado" 
                    checked={extractionRole === 'demandado'} 
                    onChange={() => setExtractionRole('demandado')}
                    className="accent-amber-500"
                  />
                  Demandado / Deudor
                </label>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="extractionRole" 
                    value="aval" 
                    checked={extractionRole === 'aval'} 
                    onChange={() => setExtractionRole('aval')}
                    className="accent-amber-500"
                  />
                  Aval / Fiador
                </label>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="extractionRole" 
                    value="endosatario" 
                    checked={extractionRole === 'endosatario'} 
                    onChange={() => setExtractionRole('endosatario')}
                    className="accent-amber-500"
                  />
                  Endosatario
                </label>
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
                {!isExtracting && (
                  <button 
                    type="button" 
                    onClick={() => ocrFileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
                  >
                    <Upload size={18} />
                    <span className="text-[9px] font-bold mt-1">Subir</span>
                  </button>
                )}
              </div>
              
              {ocrImages.length > 0 && !isExtracting && (
                <button 
                  type="button" 
                  onClick={extractDataFromImages}
                  className="px-4 py-2 bg-amber-500 text-slate-950 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors w-max"
                >
                  Extraer Datos
                </button>
              )}
              {isExtracting && (
                <div className="flex items-center gap-2 text-amber-600 text-sm font-bold">
                  <Loader2 size={16} className="animate-spin" />
                  Analizando documento y extrayendo partes...
                </div>
              )}

              {detectedParties.length > 0 && (
                <div className="mt-4 p-4 bg-white border border-amber-200 rounded-xl shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">La IA encontró las siguientes partes:</h4>
                  <div className="space-y-3">
                    {detectedParties.map((party, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{party.first_name} {party.last_name}</p>
                          <p className="text-xs font-semibold text-amber-600 mt-1">Rol detectado: {party.role_detected}</p>
                          <p className="text-xs text-slate-500 mt-1 italic">{party.reasoning}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => selectDetectedParty(party)}
                          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                        >
                          Usar datos
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre(s)</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Apellidos</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RFC</label>
                  <input 
                    type="text" 
                    value={formData.rfc}
                    onChange={e => setFormData({...formData, rfc: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Persona</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                >
                  <option value="fisica">Persona Física</option>
                  <option value="moral">Persona Moral</option>
                </select>
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
                  {formData.id ? 'Guardar Cambios' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
