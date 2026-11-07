import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitCommit, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  CircleDot, 
  Plus, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  MessageSquare, 
  Send, 
  Briefcase, 
  Scale, 
  AlertCircle,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  BookOpen,
  Share2
} from 'lucide-react';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

interface Milestone {
  id?: number;
  case_id?: number | string;
  stage: 'postulatoria' | 'contestacion' | 'probatoria' | 'conclusiva' | 'resolutiva' | 'ejecucion';
  title: string;
  date: string;
  status: 'completado' | 'en_proceso' | 'pendiente';
  description?: string;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  court?: string;
  client_name?: string;
}

const ETAPAS_PROCESALES = [
  { id: 'postulatoria', label: '1. Postulatoria', desc: 'Demanda, auto de radicación y emplazamiento' },
  { id: 'contestacion', label: '2. Contestación', desc: 'Contestación de demanda, excepciones y fijación de litis' },
  { id: 'probatoria', label: '3. Probatoria', desc: 'Ofrecimiento, admisión y desahogo de pruebas' },
  { id: 'conclusiva', label: '4. Conclusiva', desc: 'Alegatos de bien probado y citación para sentencia' },
  { id: 'resolutiva', label: '5. Resolutiva', desc: 'Sentencia definitiva de primera instancia' },
  { id: 'ejecucion', label: '6. Ejecución / Impugnación', desc: 'Recurso de apelación, amparo o ejecución forzosa' }
];

export default function TimelineProcesal() {
  const token = localStorage.getItem('token') || '';
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Metadatos del juicio
  const [expedienteNum, setExpedienteNum] = useState<string>('');
  const [juzgado, setJuzgado] = useState<string>('');
  const [partes, setPartes] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('');

  // Lista de hitos
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState<boolean>(false);

  // Formulario de nuevo hito
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [nuevoStage, setNuevoStage] = useState<Milestone['stage']>('postulatoria');
  const [nuevoTitle, setNuevoTitle] = useState<string>('');
  const [nuevoDate, setNuevoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nuevoStatus, setNuevoStatus] = useState<Milestone['status']>('completado');
  const [nuevoDesc, setNuevoDesc] = useState<string>('');

  // Reporte de IA
  const [reporteAI, setReporteAI] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'reporte'>('timeline');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Cargar lista de casos
  useEffect(() => {
    fetch('/api/cases', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCases(data);
      })
      .catch(console.error);
  }, [token]);

  // Al seleccionar caso, cargar sus hitos
  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    if (!caseId) {
      setMilestones([]);
      setReporteAI('');
      return;
    }

    const c = cases.find(item => item.id === caseId);
    if (c) {
      if (c.case_number) setExpedienteNum(c.case_number);
      if (c.court) setJuzgado(c.court.toUpperCase());
      if (c.title) setPartes(c.title);
      if (c.client_name) setClienteNombre(c.client_name);
    }

    try {
      setLoadingMilestones(true);
      const res = await fetch(`/api/cases/${caseId}/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMilestones(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMilestones(false);
    }
  };

  // Cargar caso de ejemplo para demostración rápida
  const handleCargarEjemplo = () => {
    setExpedienteNum('1045/2024');
    setJuzgado('JUZGADO SEGUNDO DE PRIMERA INSTANCIA EN MATERIA MERCANTIL');
    setPartes('FINANCIERA DEL VALLE S.A. VS DISTRIBUIDORA LOGÍSTICA DEL NORTE S.A.');
    setClienteNombre('Lic. Roberto Garza (Director Jurídico)');

    const hitosEjemplo: Milestone[] = [
      {
        id: 1,
        stage: 'postulatoria',
        title: 'Presentación y Radicación de Demanda Ejecutiva Mercantil',
        date: '2024-02-15',
        status: 'completado',
        description: 'Se admitió a trámite la demanda con auto de exequendo, decretando mandamiento de embargo cautelar.'
      },
      {
        id: 2,
        stage: 'postulatoria',
        title: 'Diligencia Exitosa de Emplazamiento y Embargo',
        date: '2024-03-02',
        status: 'completado',
        description: 'El actuario judicial notificó legalmente a la demandada en su domicilio social y se embargaron cuentas bancarias preventivas.'
      },
      {
        id: 3,
        stage: 'contestacion',
        title: 'Contestación de Demanda y Desahogo de Vista',
        date: '2024-03-20',
        status: 'completado',
        description: 'La demandada contestó oponiendo excepción de pago incompleto. Desahogamos la vista demostrando la falsedad del recibo.'
      },
      {
        id: 4,
        stage: 'probatoria',
        title: 'Audiencia de Desahogo de Pruebas Confesional y Testimonial',
        date: '2024-04-18',
        status: 'completado',
        description: 'El representante de la contraria cayó en contradicciones clave sobre la fecha del título ejecutivo.'
      },
      {
        id: 5,
        stage: 'conclusiva',
        title: 'Presentación de Escrito de Alegatos Finales',
        date: '2024-05-08',
        status: 'en_proceso',
        description: 'Se demostró que la acción quedó plenamente robustecida conforme al Art. 1396 del C.Com. El expediente pasa a dictado de sentencia.'
      }
    ];

    setMilestones(hitosEjemplo);
  };

  // Guardar nuevo hito
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoTitle || !nuevoDate) return;

    const newHito: Milestone = {
      stage: nuevoStage,
      title: nuevoTitle,
      date: nuevoDate,
      status: nuevoStatus,
      description: nuevoDesc
    };

    if (selectedCaseId) {
      try {
        const res = await fetch(`/api/cases/${selectedCaseId}/milestones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newHito)
        });
        if (res.ok) {
          const created = await res.json();
          setMilestones(prev => [...prev, created].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Modo local
      setMilestones(prev => [...prev, { ...newHito, id: Date.now() }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }

    setNuevoTitle('');
    setNuevoDesc('');
    setShowAddForm(false);
  };

  // Eliminar hito
  const handleDeleteMilestone = async (id?: number) => {
    if (!id) return;
    if (selectedCaseId) {
      try {
        await fetch(`/api/milestones/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error(err);
      }
    }
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  // Porcentaje de avance procesal
  const avancePorcentaje = useMemo(() => {
    if (milestones.length === 0) return 0;
    const stagesEncontrados = new Set(milestones.filter(m => m.status === 'completado').map(m => m.stage));
    return Math.min(100, Math.round((stagesEncontrados.size / ETAPAS_PROCESALES.length) * 100));
  }, [milestones]);

  // Generar reporte con IA para el cliente
  const handleGenerarReporteAI = async () => {
    if (milestones.length === 0) {
      alert('Agrega al menos un hito procesal para generar el reporte con IA.');
      return;
    }

    try {
      setLoadingAI(true);
      const res = await fetch('/api/ai/resumen-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: selectedCaseId,
          expediente: expedienteNum,
          juzgado,
          partes,
          clienteNombre,
          hitos: milestones
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar el reporte');
      }

      setReporteAI(data.informe);
      setActiveTab('reporte');
    } catch (err: any) {
      console.error(err);
      alert('Error de IA al generar el reporte para el cliente: ' + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  // Exportar Word Oficial
  const handleExportDocx = async () => {
    if (!reporteAI) return;
    try {
      setIsExporting(true);
      const docBlob = await generateJudicialDocx(reporteAI, {
        title: 'INFORME EJECUTIVO DE ESTADO PROCESAL Y TRACKING DE JUICIO',
        materia: 'Tracking Procesal',
        rubro: {
          expediente: expedienteNum || 'SIN-EXP',
          juzgado: juzgado || 'JUZGADO DE ORIGEN',
          actor: partes.split(/ vs\.? /i)[0] || 'PARTE ACTORA',
          demandado: partes.split(/ vs\.? /i)[1] || 'PARTE DEMANDADA',
          juicio: 'INFORME DE AUDITORÍA Y EVOLUCIÓN PROCESAL'
        },
        firmante: 'LEXMARCORP ABOGADOS & ASOCIADOS',
        selloCripto: Math.random().toString(16).substring(2, 10).toUpperCase()
      });

      const filename = `Informe_Tracking_${(expedienteNum || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      downloadDocxBlob(docBlob, filename);
    } catch (err) {
      console.error(err);
      alert('Error al generar el documento de Word.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reporteAI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Transparencia & Tracking Procesal
            </span>
            <span className="text-xs text-slate-500 font-mono">Gemini 3.8 Flash Client Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <GitCommit className="w-8 h-8 text-blue-600" />
            Línea de Tiempo Procesal ("Tracking") & Resumen Ejecutivo
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Rastrea cada etapa y acuerdo judicial en tiempo real. Genera reportes ejecutivos claros y transparentes listos para enviar a tus clientes por Word o WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCargarEjemplo}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Cargar Juicio Demo
          </button>
          <button
            onClick={handleGenerarReporteAI}
            disabled={loadingAI || milestones.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            {loadingAI ? 'Generando Informe...' : 'Generar Reporte Cliente (IA)'}
          </button>
        </div>
      </div>

      {/* Selector de Expediente Vinculado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Vincular Juicio para Tracking</h3>
            <p className="text-xs text-slate-400">Selecciona el expediente para persistir los hitos y acuerdos procesales</p>
          </div>
        </div>
        <div className="w-full md:w-80">
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">-- Seleccionar expediente del despacho --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number ? `${c.case_number} - ` : ''}{c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de Progreso y Stepper de Etapas Procesales Mexicanas */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Evolución y Madurez del Juicio ({avancePorcentaje}% Completado)
            </h3>
            <p className="text-xs text-slate-500">Pipeline procesal estándar conforme a los Códigos de Comercio y Procesales Civiles.</p>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {milestones.length} hitos registrados
          </span>
        </div>

        {/* Barra visual de etapas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
          {ETAPAS_PROCESALES.map((etapa) => {
            const hitosEnEtapa = milestones.filter(m => m.stage === etapa.id);
            const tieneCompletado = hitosEnEtapa.some(m => m.status === 'completado');
            const tieneEnProceso = hitosEnEtapa.some(m => m.status === 'en_proceso');

            return (
              <div
                key={etapa.id}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between space-y-2 ${
                  tieneCompletado
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : tieneEnProceso
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-2 ring-amber-400/40'
                    : 'bg-slate-50/60 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] leading-tight">{etapa.label}</span>
                  {tieneCompletado ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : tieneEnProceso ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                  ) : (
                    <CircleDot className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] opacity-80 leading-snug line-clamp-2">
                  {etapa.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs: Vista de Línea de Tiempo vs Reporte Generado */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          Línea de Tiempo Procesal ({milestones.length})
        </button>

        <button
          onClick={() => setActiveTab('reporte')}
          className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reporte'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Reporte Ejecutivo para el Cliente {reporteAI ? '(Listo)' : ''}
        </button>
      </div>

      {/* CONTENIDO TAB 1: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {/* Barra de acción: Agregar hito */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Historial Cronológico de Acuerdos & Diligencias
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Cerrar Formulario' : 'Registrar Nuevo Hito'}
            </button>
          </div>

          {/* Formulario nuevo hito desplegable */}
          {showAddForm && (
            <form onSubmit={handleAddMilestone} className="bg-slate-50 p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" /> Agregar Actuación / Hito al Juicio
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Etapa Procesal</label>
                  <select
                    value={nuevoStage}
                    onChange={(e) => setNuevoStage(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {ETAPAS_PROCESALES.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Fecha del Acuerdo / Acto</label>
                  <input
                    type="date"
                    value={nuevoDate}
                    onChange={(e) => setNuevoDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Estado</label>
                  <select
                    value={nuevoStatus}
                    onChange={(e) => setNuevoStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="completado">Completado / Resuelto</option>
                    <option value="en_proceso">En Proceso / Término Corriendo</option>
                    <option value="pendiente">Pendiente de Acuerdo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Título del Acuerdo</label>
                  <input
                    type="text"
                    placeholder="Ej. Auto de Admisión de Demanda"
                    value={nuevoTitle}
                    onChange={(e) => setNuevoTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">
                  Extracto del Acuerdo o Notas del Abogado
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre qué resolvió el juez, qué se ordenó notificar o qué plazo comenzó a correr..."
                  value={nuevoDesc}
                  onChange={(e) => setNuevoDesc(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Hito
                </button>
              </div>
            </form>
          )}

          {/* Timeline Visual Vertical */}
          {milestones.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <GitCommit className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">No hay hitos procesales registrados</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Selecciona un expediente o haz clic en "Cargar Juicio Demo" para explorar cómo se mapea la cronología judicial y se genera el informe para clientes.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {milestones.map((m, idx) => (
                <div key={m.id || idx} className="relative group">
                  {/* Punto en la línea de tiempo */}
                  <span className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all bg-white ${
                    m.status === 'completado'
                      ? 'border-emerald-500 text-emerald-600'
                      : m.status === 'en_proceso'
                      ? 'border-amber-500 text-amber-600 animate-pulse'
                      : 'border-slate-300 text-slate-400'
                  }`}>
                    {m.status === 'completado' && <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-100" />}
                    {m.status === 'en_proceso' && <Clock className="w-3.5 h-3.5" />}
                    {m.status === 'pendiente' && <CircleDot className="w-3.5 h-3.5" />}
                  </span>

                  {/* Tarjeta del hito */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {ETAPAS_PROCESALES.find(e => e.id === m.stage)?.label || m.stage}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{m.title}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500">{m.date}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          m.status === 'completado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'en_proceso'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.status === 'completado' ? 'Completado' : m.status === 'en_proceso' ? 'En Trámite' : 'Pendiente'}
                        </span>

                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-opacity cursor-pointer"
                          title="Eliminar hito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {m.description && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO TAB 2: REPORTE PARA EL CLIENTE */}
      {activeTab === 'reporte' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Informe Ejecutivo de Estado Procesal</h3>
              <p className="text-xs text-slate-500">Redactado con IA para el cliente en lenguaje transparente, humano y formal.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!reporteAI}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado al Portapapeles' : 'Copiar para WhatsApp/Email'}
              </button>
              <button
                onClick={handleExportDocx}
                disabled={isExporting || !reporteAI}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Generando...' : 'Descargar en Word (.docx)'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50">
            {reporteAI ? (
              <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg border border-slate-200 shadow-sm font-sans text-sm leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-blue-100">
                {reporteAI}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Sparkles className="w-10 h-10 text-indigo-400 mx-auto" />
                <h4 className="font-bold text-slate-700 text-sm">El reporte aún no ha sido generado</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Haz clic en "Generar Reporte Cliente (IA)" en la esquina superior para redactar el informe ejecutivo automáticamente con Gemini 3.8.
                </p>
                <button
                  onClick={handleGenerarReporteAI}
                  disabled={loadingAI || milestones.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-colors cursor-pointer"
                >
                  {loadingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generar Reporte Ahora
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
