import React, { useState, useEffect } from 'react';
import { 
  Scroll, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Sparkles, 
  Clipboard, 
  Check, 
  FileText, 
  ChevronLeft, 
  User, 
  Folder, 
  BookOpen, 
  Download, 
  AlertCircle,
  FileCheck,
  Languages,
  ArrowRight,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

interface Template {
  id: number;
  title: string;
  description: string;
  content: string;
  placeholders: string[];
  materia: string;
  created_at: string;
}

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  rfc?: string;
}

interface Case {
  id: number;
  title: string;
  case_number: string;
  court?: string;
  type?: string;
  client_id: number;
}

export default function Templates() {
  // Navigation / View states
  const [activeView, setActiveView] = useState<'list' | 'workspace'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Data states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMateria, setSelectedMateria] = useState<string>('Todos');

  // Modal Creation / Edition states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formMateria, setFormMateria] = useState<string>('Civil');
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>([]);

  // Generation Workspace states
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [manualPlaceholders, setManualPlaceholders] = useState<Record<string, string>>({});
  const [additionalInstructions, setAdditionalInstructions] = useState<string>('');
  
  // Generation response states
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>('');
  const [prefilledPreview, setPrefilledPreview] = useState<string>('');
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savingDoc, setSavingDoc] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [downloadingDocx, setDownloadingDocx] = useState<boolean>(false);

  // Initialize and load
  useEffect(() => {
    fetchTemplates();
    fetchClientsAndCases();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsAndCases = async () => {
    try {
      const [resClients, resCases] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/cases')
      ]);
      if (resClients.ok) {
        const dataClients = await resClients.json();
        setClients(dataClients);
      }
      if (resCases.ok) {
        const dataCases = await resCases.json();
        setCases(dataCases);
      }
    } catch (err) {
      console.error('Error fetching clients or cases:', err);
    }
  };

  // Extract placeholders in form in real-time
  useEffect(() => {
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(formContent)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    setDetectedPlaceholders(matches);
  }, [formContent]);

  // When Client or Case is changed in workspace, refresh prefill predictions
  useEffect(() => {
    if (!selectedTemplate) return;
    
    const client = clients.find(c => c.id === Number(selectedClientId));
    const kase = cases.find(c => c.id === Number(selectedCaseId));
    
    const overrides: Record<string, string> = { ...manualPlaceholders };

    if (client) {
      const clientName = `${client.first_name} ${client.last_name}`;
      overrides['client_name'] = overrides['client_name'] || clientName;
      overrides['nombre_cliente'] = overrides['nombre_cliente'] || clientName;
      overrides['arrendador_name'] = overrides['arrendador_name'] || clientName;
      overrides['arrendatario_name'] = overrides['arrendatario_name'] || clientName;
      overrides['actor_name'] = overrides['actor_name'] || clientName;
      overrides['deudor_name'] = overrides['deudor_name'] || clientName;
      overrides['demandado_name'] = overrides['demandado_name'] || clientName;

      overrides['client_email'] = overrides['client_email'] || client.email;
      overrides['email_cliente'] = overrides['email_cliente'] || client.email;
      overrides['client_phone'] = overrides['client_phone'] || client.phone || '';
      overrides['telefono_cliente'] = overrides['telefono_cliente'] || client.phone || '';
      overrides['client_rfc'] = overrides['client_rfc'] || client.rfc || '';
      overrides['rfc_cliente'] = overrides['rfc_cliente'] || client.rfc || '';
    }

    if (kase) {
      overrides['case_title'] = overrides['case_title'] || kase.title;
      overrides['titulo_caso'] = overrides['titulo_caso'] || kase.title;
      overrides['case_number'] = overrides['case_number'] || kase.case_number;
      overrides['numero_caso'] = overrides['numero_caso'] || kase.case_number;
      overrides['court'] = overrides['court'] || kase.court || '';
      overrides['juzgado'] = overrides['juzgado'] || kase.court || '';
      overrides['juzgado_ciudad'] = overrides['juzgado_ciudad'] || kase.court || '';
      overrides['ciudad_ejecucion'] = overrides['ciudad_ejecucion'] || kase.court || '';
    }

    const today = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    overrides['current_date'] = overrides['current_date'] || today;
    overrides['fecha_actual'] = overrides['fecha_actual'] || today;

    // Apply the replacements to the input fields dynamically
    const newManuals = { ...manualPlaceholders };
    selectedTemplate.placeholders.forEach(ph => {
      if (overrides[ph] && !newManuals[ph]) {
        newManuals[ph] = overrides[ph];
      }
    });
    setManualPlaceholders(newManuals);

  }, [selectedClientId, selectedCaseId, selectedTemplate]);

  // Form actions
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormTitle('');
    setFormDescription('');
    setFormContent('');
    setFormMateria('Civil');
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Template) => {
    setModalMode('edit');
    setFormTitle(t.title);
    setFormDescription(t.description);
    setFormContent(t.content);
    setFormMateria(t.materia);
    setEditId(t.id);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;

    const payload = {
      title: formTitle,
      description: formDescription,
      content: formContent,
      placeholders: detectedPlaceholders,
      materia: formMateria
    };

    try {
      const url = modalMode === 'create' ? '/api/templates' : `/api/templates/${editId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || 'No se pudo guardar la plantilla'}`);
      }
    } catch (err) {
      console.error('Error saving template:', err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta plantilla legal?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  // Open Template in Workspace
  const handleOpenWorkspace = (t: Template) => {
    setSelectedTemplate(t);
    // Initialize required placeholder values as empty
    const initialPlaceholders: Record<string, string> = {};
    t.placeholders.forEach(ph => {
      initialPlaceholders[ph] = '';
    });
    setManualPlaceholders(initialPlaceholders);
    
    // Auto-select client & case if we have matching options (e.g. first one)
    setSelectedClientId('');
    setSelectedCaseId('');
    setAdditionalInstructions('');
    setGeneratedDraft('');
    setPrefilledPreview('');
    setGenerationError('');
    setSaveSuccess(false);
    setActiveView('workspace');
  };

  // Trigger Gemini API to generate the draft
  const handleGenerateDraft = async () => {
    if (!selectedTemplate) return;
    
    setGenerating(true);
    setGenerationError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          client_id: selectedClientId ? Number(selectedClientId) : null,
          case_id: selectedCaseId ? Number(selectedCaseId) : null,
          additionalInstructions,
          manualPlaceholders
        })
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedDraft(data.generatedDraft);
        setPrefilledPreview(data.prefilledContent);
      } else {
        setGenerationError(data.error || 'Ocurrió un error al generar la inteligencia del documento.');
      }
    } catch (err: any) {
      setGenerationError(`Error de red o de sistema: ${err.message || err}`);
    } finally {
      setGenerating(false);
    }
  };

  // Copy draft to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save generated document to Client's file records (Durable client persistence)
  const handleSaveToCase = async () => {
    if (!selectedCaseId && !selectedClientId) {
      alert("Por favor seleccione un Expediente o Cliente para archivar el documento.");
      return;
    }

    setSavingDoc(true);
    setSaveSuccess(false);

    // Create virtual temporary file upload parameters to link with case.ts
    const finalDocName = `${selectedTemplate?.title.split('(')[0].trim()} - Borrador Smart.md`;
    const docSize = new Blob([generatedDraft]).size;

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalDocName,
          size: docSize,
          case_id: selectedCaseId ? Number(selectedCaseId) : null,
          tags: ["Generado por IA", "Plantilla", selectedTemplate?.materia || "Civil"],
          type: "Firma Pendiente"
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Display a nice success message
      } else {
        alert("El documento no se pudo indexar de manera correcta.");
      }
    } catch (err) {
      console.error("Error creating document linked directly:", err);
    } finally {
      setSavingDoc(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedTemplate?.title || 'Borrador de Documento'}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #111; }
            h1, h2, h3 { text-align: center; margin-bottom: 20px; text-transform: uppercase; }
            p { margin-bottom: 15px; text-align: justify; text-indent: 40px; }
            hr { border: 1px solid #333; margin: 30px 0; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
            .sig-block { text-align: center; border-top: 1px solid #000; width: 40%; padding-top: 10px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <h2>${selectedTemplate?.title}</h2>
          <div style="white-space: pre-wrap;">${generatedDraft}</div>
          <hr />
          <div class="signatures">
            <div class="sig-block">FIRMA DEL ABOGADO</div>
            <div class="sig-block">FIRMA DEL CLIENTE</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDocx = async () => {
    if (!generatedDraft) return;
    setDownloadingDocx(true);
    try {
      const selectedCase = cases.find(c => c.id.toString() === selectedCaseId);
      const selectedClient = clients.find(cl => cl.id.toString() === selectedClientId);

      const blob = await generateJudicialDocx(generatedDraft, {
        title: selectedTemplate?.title || 'Escrito Judicial',
        materia: selectedTemplate?.materia || 'Civil',
        rubro: selectedCase ? {
          actor: selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : undefined,
          juicio: selectedCase.type || selectedTemplate?.materia,
          expediente: selectedCase.case_number,
          juzgado: selectedCase.court,
        } : undefined,
      });

      const cleanTitle = (selectedTemplate?.title || 'escrito_legal')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      downloadDocxBlob(blob, `${cleanTitle}_formato_juzgado.docx`);
    } catch (err) {
      console.error('Error generando DOCX en plantillas:', err);
      alert('Ocurrió un error al generar el archivo Word.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  // Filter templates list
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.materia.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMateria = selectedMateria === 'Todos' || t.materia === selectedMateria;
    return matchesSearch && matchesMateria;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="template-library-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
            <Scroll size={16} />
            <span>Automatización & Smart Drafts</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Biblioteca de Plantillas Legales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generación inteligente de promociones, demandas y contratos blindados bajo la legislación mexicana con IA de Gemini.
          </p>
        </div>
        
        {activeView === 'list' && (
          <button 
            id="btn-new-template"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} />
            <span>Crear Plantilla</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'list' ? (
          <motion.div 
            key="list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Search and filter toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar plantilla o materia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                {['Todos', 'Civil', 'Familiar', 'Mercantil', 'Corporativo'].map((mat) => (
                  <button
                    key={mat}
                    onClick={() => setSelectedMateria(mat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      selectedMateria === mat 
                        ? 'bg-slate-900 text-amber-400 shadow-sm' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div id="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-slate-500 text-sm font-medium">Cargando catálogo de plantillas...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center max-w-md mx-auto">
                <Scroll size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">No se encontraron plantillas</h3>
                <p className="text-xs text-slate-400 mt-2">
                  No hay de este tipo registradas en el catálogo. Comience agregando una nueva plantilla para su despacho.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-5 btn bg-amber-500 text-slate-950 hover:bg-amber-600 px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Agregar Primera Plantilla
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  return (
                    <motion.div
                      layout
                      key={template.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${
                            template.materia === 'Familiar' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            template.materia === 'Mercantil' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            template.materia === 'Civil' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {template.materia}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(template)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                              title="Editar Estructura"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                              title="Eliminar Plantilla"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-amber-500 leading-snug">
                          {template.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3">
                          {template.description || 'Sin descripción provista.'}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-4">
                          {template.placeholders.slice(0, 4).map((ph) => (
                            <span key={ph} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                              {ph}
                            </span>
                          ))}
                          {template.placeholders.length > 4 && (
                            <span className="text-[10px] text-slate-400 font-mono self-center">
                              +{template.placeholders.length - 4} más
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {new Date(template.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })}
                        </span>

                        <button
                          onClick={() => handleOpenWorkspace(template)}
                          className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-xs font-bold font-mono group"
                        >
                          <span>PROYECTAR</span>
                          <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* WORKSPACE (AI WRITER GENERATOR) */
          <motion.div 
            key="workspace-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Sidebar with settings and placeholders (Col 4) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Back to library & Template summary */}
              <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md">
                <button
                  onClick={() => setActiveView('list')}
                  className="flex items-center gap-2 text-slate-400 hover:text-amber-400 text-xs font-semibold mb-4 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <span>Volver a la Biblioteca</span>
                </button>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  Materia {selectedTemplate?.materia}
                </span>
                <h2 className="text-xl font-bold mt-2 text-white">{selectedTemplate?.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedTemplate?.description}</p>
              </div>

              {/* Step 1: Link Case/Client */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <User size={16} className="text-slate-400" />
                  <h3 className="font-bold text-slate-800 text-sm">Paso 1: Asociar Información (Opcional)</h3>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Asociar Cliente
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        // Filter cases automatically matching client id or load first
                        const associatedCase = cases.find(c => c.client_id === Number(e.target.value));
                        setSelectedCaseId(associatedCase ? String(associatedCase.id) : '');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Sin Cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.rfc || 'Física'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Asociar Expediente
                    </label>
                    <select
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="">-- Sin Expediente --</option>
                      {cases
                        // filter cases if client is selected
                        .filter(c => !selectedClientId || c.client_id === Number(selectedClientId))
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.case_number} - {c.title.slice(0, 45)}...</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Placeholders Fill Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-slate-400" />
                    <h3 className="font-bold text-slate-800 text-sm">Paso 2: Rellenar Campos Modificables</h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-2 py-0.5 rounded">
                    {selectedTemplate?.placeholders.length} campos
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {selectedTemplate?.placeholders.map((ph) => (
                    <div key={ph}>
                      <label className="block text-[10px] font-semibold text-slate-500 font-mono mb-1 capitalize">
                        {ph.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={manualPlaceholders[ph] || ''}
                        onChange={(e) => {
                          setManualPlaceholders({
                            ...manualPlaceholders,
                            [ph]: e.target.value
                          });
                        }}
                        placeholder={`Ingrese ${ph.replace(/_/g, ' ')}...`}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Special instructions with IA button */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-inner">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Instrucciones Especiales de Redacción</span>
                  </label>
                  <textarea
                    rows={2}
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Ej. 'Mencione cláusulas estrictas de mora de 10% mensual s/renta', 'Aplique fundamento de Coahuila', 'Añada un bloque formal para prórroga de firmas'."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <button
                  onClick={handleGenerateDraft}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 transition-all uppercase tracking-wider"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></div>
                      <span>PROCESANDO INTELIGENCIA LEGAL...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>GENERAR BORRADOR ENRIQUECIDO POR IA</span>
                    </>
                  )}
                </button>

                {generationError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Generated Output Preview Workspace (Col 7) */}
            <div className="lg:col-span-7 flex flex-col h-[740px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-amber-600" />
                  <h3 className="font-bold text-slate-800 text-sm font-mono">PROYECCIÓN DE ESCRITO JURÍDICO</h3>
                </div>

                {generatedDraft && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleDownloadDocx}
                      disabled={downloadingDocx}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37] hover:bg-[#E5C058] text-black rounded-xl text-xs font-bold transition shadow-md shadow-[#D4AF37]/20 disabled:opacity-50 cursor-pointer"
                      title="Descargar como Word (.docx) con formato judicial oficial"
                    >
                      {downloadingDocx ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Download size={14} />
                      )}
                      <span>{downloadingDocx ? 'Generando...' : 'Descargar Word (.docx)'}</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-700 transition"
                      title="Imprimir Escrito"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={handleCopyToClipboard}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                        copied ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200/60 text-slate-600'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Clipboard size={14} />}
                      <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Workspace Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                {!generatedDraft && !generating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <Scroll size={40} className="text-slate-300 md:animate-pulse mb-3" />
                    <h3 className="font-bold text-slate-600 text-sm">Escrito legal vacío</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Complete los datos de la izquierda y presione "Generar Borrador Con IA" para que nuestra IA Gemini redacte y estructure legalmente este documento.
                    </p>
                  </div>
                ) : generating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    {/* Spinning balance scales mock loaded */}
                    <div className="relative flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
                      <Sparkles size={24} className="absolute text-amber-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Redactando y blindando escrito...</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1 leading-snug">
                        Gemini está aplicando los fundamentos procesales de Coahuila e incorporando los campos con formalidad jurídica.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-full font-serif text-sm text-slate-800 leading-relaxed space-y-4 whitespace-pre-wrap select-text selection:bg-amber-100">
                    {generatedDraft}
                  </div>
                )}
              </div>

              {/* Footer with storage index trigger */}
              {generatedDraft && !generating && (
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between items-center shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <FileCheck size={15} className="text-emerald-500" />
                    <span>Escrito listo para indexar en base de datos.</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDownloadDocx}
                      disabled={downloadingDocx}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C058] text-black rounded-xl text-xs font-bold shadow-md shadow-[#D4AF37]/20 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                    >
                      <Download size={14} />
                      <span>{downloadingDocx ? 'GENERANDO WORD...' : 'DESCARGAR WORD (.DOCX)'}</span>
                    </button>

                    <button
                      onClick={handleSaveToCase}
                      disabled={savingDoc || saveSuccess}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        saveSuccess 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default' 
                          : 'bg-slate-900 border border-slate-950 text-white hover:bg-slate-850 shadow-sm active:scale-[0.98]'
                      }`}
                    >
                      {savingDoc ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          <span>ARCHIVANDO...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check size={14} />
                          <span>GUARDADO EN EXPEDIENTE</span>
                        </>
                      ) : (
                        <>
                          <Folder size={14} />
                          <span>GUARDAR EN EXPEDIENTE</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATION OR EDITION TEMPLATE DIAGNOSTICS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Scroll className="text-amber-500" size={18} />
                <h3 className="font-extrabold text-slate-850 text-base">
                  {modalMode === 'create' ? 'Agregar Nueva Plantilla de Escrito' : 'Modificar Estructura de Plantilla'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Título Legal de la Plantilla *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej. 'Contrato de Comodato Residencial'"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Materia de Derecho *
                  </label>
                  <select
                    value={formMateria}
                    onChange={(e) => setFormMateria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Familia">Familiar</option>
                    <option value="Mercantil">Mercantil</option>
                    <option value="Corporativo">Corporativo</option>
                    <option value="Laboral">Laboral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Descripción Breve (Guía de aplicación)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ej. 'Modelo estándar aplicable a juicios de alimentos, custodia familiar o defensa mercantil en Coahuila.'"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between items-center">
                  <span>Cuerpo del Escrito (Con marcadores) *</span>
                  <span className="text-[10px] text-amber-600 lowercase font-mono">Use doble llave ej., {"{{client_name}}"}</span>
                </label>
                <textarea
                  rows={10}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={`C. JUEZ DE PRIMERA INSTANCIA EN MATERIA... \n\n{{actor_name}} por mi propio derecho, con rfc {{rfc_cliente}}...`}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono leading-relaxed"
                />
              </div>

              {/* Dynamic Placeholders detector showcase */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Marcadores de datos detectados automáticamente ({detectedPlaceholders.length})
                </span>
                {detectedPlaceholders.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">Escriba marcadores como {"{{nombre}}"} para verlos aquí.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {detectedPlaceholders.map((ph) => (
                      <span key={ph} className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-1 rounded font-mono">
                        {ph}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  {modalMode === 'create' ? 'Crear Plantilla' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
