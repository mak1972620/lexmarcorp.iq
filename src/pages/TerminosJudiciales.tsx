import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Download, 
  Copy, 
  Check, 
  Scale, 
  Plus, 
  Sparkles, 
  RotateCcw,
  BookOpen,
  Info,
  CalendarCheck,
  BellRing,
  ArrowRight
} from 'lucide-react';
import { 
  calcularTerminoJudicial, 
  ResultadoComputo, 
  DiaComputo 
} from '../utils/judicialTerms';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  court?: string;
  client_name?: string;
}

// Plazos procesales comunes en México
const PRESETS_TERMINOS: Record<string, { label: string; dias: number }[]> = {
  amparo: [
    { label: 'Demanda de Amparo Indirecto Principal (Art. 17 LA)', dias: 15 },
    { label: 'Recurso de Revisión (Art. 86 LA)', dias: 10 },
    { label: 'Recurso de Queja (Art. 98 LA)', dias: 5 },
    { label: 'Recurso de Reclamación (Art. 104 LA)', dias: 3 },
    { label: 'Cumplimiento de Sentencia / Desahogo de Vista (Art. 192 LA)', dias: 3 },
    { label: 'Recurso de Inconformidad (Art. 202 LA)', dias: 15 }
  ],
  mercantil: [
    { label: 'Contestación Juicio Ejecutivo Mercantil (Art. 1396 C.Com.)', dias: 8 },
    { label: 'Contestación Juicio Oral Mercantil (Art. 1390 Bis 14 C.Com.)', dias: 15 },
    { label: 'Contestación Juicio Ordinario Mercantil (Art. 1378 C.Com.)', dias: 15 },
    { label: 'Desahogo de Vista / Excepciones (Art. 1079 C.Com.)', dias: 3 },
    { label: 'Recurso de Apelación Sentencia Definitiva (Art. 1344 C.Com.)', dias: 9 },
    { label: 'Recurso de Revocación / Reposición (Art. 1334 C.Com.)', dias: 3 }
  ],
  civil: [
    { label: 'Contestación Demanda Juicio Ordinario Civil', dias: 9 },
    { label: 'Contestación Juicio Sumario Civil', dias: 5 },
    { label: 'Desahogo de Vista / Excepciones Procesales', dias: 3 },
    { label: 'Recurso de Apelación Contra Sentencia Definitiva', dias: 9 },
    { label: 'Recurso de Apelación Preventiva / Interlocutoria', dias: 6 },
    { label: 'Recurso de Queja o Revocación', dias: 3 }
  ],
  laboral: [
    { label: 'Contestación de Demanda Individual (Art. 873-A LFT)', dias: 15 },
    { label: 'Réplica de la Parte Actora (Art. 873-B LFT)', dias: 8 },
    { label: 'Contrarréplica de la Demandada (Art. 873-B LFT)', dias: 5 },
    { label: 'Término General Supletorio (Art. 735 LFT)', dias: 3 }
  ]
};

export default function TerminosJudiciales() {
  const token = localStorage.getItem('token') || '';
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Parámetros de Cómputo (Inician completamente limpios)
  const [materia, setMateria] = useState<'amparo' | 'mercantil' | 'civil' | 'laboral'>('mercantil');
  const [fuero, setFuero] = useState<'federal' | 'local'>('federal');
  const [tipoNotificacion, setTipoNotificacion] = useState<'personal' | 'lista' | 'electronica'>('personal');
  const [fechaNotificacion, setFechaNotificacion] = useState<string>('');
  const [diasTerminoInput, setDiasTerminoInput] = useState<string>('');
  
  // Metadatos para certificación y expediente
  const [expedienteNum, setExpedienteNum] = useState<string>('');
  const [juzgado, setJuzgado] = useState<string>('');
  const [partes, setPartes] = useState<string>('');
  const [conceptoTermino, setConceptoTermino] = useState<string>('');

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSavingTask, setIsSavingTask] = useState<boolean>(false);
  const [taskSavedSuccess, setTaskSavedSuccess] = useState<boolean>(false);

  // Cargar expedientes
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

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    if (!caseId) return;
    const c = cases.find(item => item.id === caseId);
    if (c) {
      if (c.case_number) setExpedienteNum(c.case_number);
      if (c.court) setJuzgado(c.court.toUpperCase());
      if (c.title) setPartes(c.title);
    }
  };

  const handleLimpiarTodo = () => {
    setSelectedCaseId('');
    setFechaNotificacion('');
    setDiasTerminoInput('');
    setExpedienteNum('');
    setJuzgado('');
    setPartes('');
    setConceptoTermino('');
    setTaskSavedSuccess(false);
  };

  const handleSelectPreset = (dias: number, label: string) => {
    setDiasTerminoInput(String(dias));
    setConceptoTermino(label);
  };

  // Cómputo matemático y procesal
  const resultado: ResultadoComputo | null = useMemo(() => {
    const numDias = parseInt(diasTerminoInput, 10);
    if (!fechaNotificacion || isNaN(numDias) || numDias <= 0) {
      return null;
    }

    return calcularTerminoJudicial({
      fechaNotificacionStr: fechaNotificacion,
      diasTermino: numDias,
      materia,
      tipoNotificacion,
      fuero
    });
  }, [fechaNotificacion, diasTerminoInput, materia, tipoNotificacion, fuero]);

  // Redacción de la Certificación Secretarial de Cómputo Judicial
  const textoCertificacion = useMemo(() => {
    if (!resultado) {
      return '[CALCULADORA DE TÉRMINOS EN ESPERA]\nIngresa la fecha de notificación y los días del término para generar la Certificación Oficial.';
    }

    return `EXPEDIENTE: ${expedienteNum || 'EN TRÁMITE'}
JUICIO: ${materia.toUpperCase()}
PARTES: ${partes.toUpperCase() || 'ACTOR VS DEMANDADO'}
JUZGADO: ${juzgado.toUpperCase() || 'JUZGADO COMPETENTE'}

CERTIFICACIÓN JUDICIAL DE CÓMPUTO DE TÉRMINO LEGAL

En la ciudad de radicación del expediente, se hace constar y se certifica para todos los efectos legales a que haya lugar, el cómputo del término legal correspondiente a: "${conceptoTermino || `TÉRMINO PROCESAL DE ${resultado.diasTermino} DÍAS`}".

I. NOTIFICACIÓN Y SURTIMIENTO DE EFECTOS:
- Fecha de la notificación: ${resultado.fechaNotificacion} (${resultado.cronologia[0]?.diaSemana || ''}).
- Tipo de notificación: Notificación ${tipoNotificacion.toUpperCase()}.
- Fecha en que surte efectos: ${resultado.fechaSurtimiento} (${resultado.cronologia.find(c => c.etapa === 'surtimiento')?.diaSemana || ''}).
- Regla de surtimiento aplicable: ${resultado.reglaSurtimiento}

II. CÓMPUTO DE DÍAS HÁBILES:
- El término de ${resultado.diasTermino} días hábiles comenzó a correr el día: ${resultado.fechaInicioComputo}.
- Días inhábiles intermedios excluidos por mandato de ley (${resultado.diasInhabilesEnMedio} días):
${resultado.cronologia.filter(c => !c.esHabil).map(c => `  * ${c.fecha} (${c.diaSemana}): ${c.motivoInhabil}`).join('\n')}

III. VENCIMIENTO FATAL Y PRECLUSIÓN:
- FECHA DE VENCIMIENTO FATAL: ${resultado.fechaVencimientoFatal} (Hasta el último minuto hábil del horario judicial).
- TÉRMINO DE GRACIA (Oficialía de Partes Común): ${resultado.fechaTerminoGracia}.

IV. FUNDAMENTACIÓN JURÍDICA:
El presente cómputo se encuentra estrictamente apegado a lo dispuesto por los ${resultado.fundamentoLegal}, así como los Acuerdos Generales aplicables del Consejo de la Judicatura.

DOY FE.

LIC. DORA EDILIA TANAKA CERVANTES
EDILIA TANAKA Y ASOCIADOS - "La Abogada de Tu Familia"
Tanaka Legal IQ - Sistema de Blindaje Procesal`;
  }, [resultado, expedienteNum, materia, partes, juzgado, conceptoTermino, tipoNotificacion]);

  // Guardar como tarea en el expediente activo
  const handleAgendarTarea = async () => {
    if (!resultado) return;

    try {
      setIsSavingTask(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `VENCIMIENTO FATAL: ${conceptoTermino || `Término de ${resultado.diasTermino} días`} (${expedienteNum || materia})`,
          description: `Término procesal notificado el ${resultado.fechaNotificacion}. Surtió efectos el ${resultado.fechaSurtimiento}. Vencimiento fatal improrrogable: ${resultado.fechaVencimientoFatal}. Término de gracia: ${resultado.fechaTerminoGracia}.`,
          case_id: selectedCaseId || null,
          priority: 'Alta',
          due_date: resultado.fechaVencimientoFatal
        })
      });

      if (!res.ok) throw new Error('Error al registrar la tarea');
      setTaskSavedSuccess(true);
      setTimeout(() => setTaskSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al agendar el vencimiento en el sistema de tareas.');
    } finally {
      setIsSavingTask(false);
    }
  };

  // Exportar Word Judicial Oficial
  const handleExportDocx = async () => {
    if (!resultado) return;
    try {
      setIsExporting(true);
      const docBlob = await generateJudicialDocx(textoCertificacion, {
        title: 'CERTIFICACIÓN DE CÓMPUTO DE TÉRMINO JUDICIAL',
        materia,
        rubro: {
          expediente: expedienteNum || 'SIN-EXP',
          juzgado: juzgado || 'JUZGADO DE ADSCRIPCIÓN',
          actor: partes.split(/ vs\.? /i)[0] || 'PARTE ACTORA',
          demandado: partes.split(/ vs\.? /i)[1] || 'PARTE DEMANDADA',
          juicio: `JUICIO ${materia.toUpperCase()}`
        },
        firmante: 'ABOGADO PATRONO / PROMOVENTE',
        selloCripto: Math.random().toString(16).substring(2, 10).toUpperCase()
      });

      const filename = `Computo_Termino_${(expedienteNum || materia).replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      downloadDocxBlob(docBlob, filename);
    } catch (err) {
      console.error(err);
      alert('Error al generar la certificación en Word.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(textoCertificacion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Blindaje Fatal de Términos
            </span>
            <span className="text-xs text-slate-500 font-mono">Ley de Amparo, Cód. Comercio, LFT & CJF</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-600" />
            Cómputo Inteligente de Términos Judiciales & Vencimientos Fatales
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Calcula con precisión forense el surtimiento de efectos, la exclusión de días inhábiles oficiales y el momento exacto de preclusión procesal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLimpiarTodo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            title="Limpiar campos"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Limpiar Todo
          </button>
          {resultado && (
            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C058] text-black font-black text-xs shadow-md shadow-[#D4AF37]/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Generando...' : 'Descargar Certificación (.docx)'}
            </button>
          )}
        </div>
      </div>

      {/* Selector de Expediente Vinculado */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Vincular con Expediente</h3>
            <p className="text-xs text-slate-400">Auto-rellena expediente y juzgado, y permite agendar el vencimiento directamente como tarea</p>
          </div>
        </div>
        <div className="w-full md:w-80">
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Seleccionar expediente (opcional) --</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number ? `${c.case_number} - ` : ''}{c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Principal: Parámetros del Término */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Configuración del Cómputo */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#121214] p-6 rounded-xl border border-[#27272A] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Parámetros de la Notificación & Plazo Procesal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Materia Procesal
                </label>
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="mercantil">Mercantil (Cód. Comercio)</option>
                  <option value="amparo">Juicio de Amparo (Ley de Amparo)</option>
                  <option value="civil">Civil / Familiar (C.P.C. / C.F.P.C.)</option>
                  <option value="laboral">Laboral (Ley Federal del Trabajo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Notificación
                </label>
                <select
                  value={tipoNotificacion}
                  onChange={(e) => setTipoNotificacion(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="personal">Notificación Personal</option>
                  <option value="lista">Por Lista / Boletín Judicial</option>
                  <option value="electronica">Notificación Electrónica (Portal PJF)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Fuero Judicial
                </label>
                <select
                  value={fuero}
                  onChange={(e) => setFuero(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="federal">Federal (PJF / SCJN / CJF)</option>
                  <option value="local">Local (Tribunales Estatales TSJ)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha de Notificación Practicada
                </label>
                <input
                  type="date"
                  value={fechaNotificacion}
                  onChange={(e) => setFechaNotificacion(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Días Hábiles del Término
                </label>
                <input
                  type="number"
                  placeholder="Ej. 3, 5, 8, 9, 15..."
                  value={diasTerminoInput}
                  onChange={(e) => setDiasTerminoInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Presets de Plazos Legales Comunes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600 block">
                Plazos Procesales Frecuentes en Materia {materia.toUpperCase()}:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESETS_TERMINOS[materia]?.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p.dias, p.label)}
                    className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 transition-colors cursor-pointer text-left"
                  >
                    <span className="font-bold text-emerald-700">{p.dias} días:</span> {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tarjeta de Alerta de Vencimiento */}
          {resultado ? (
            <div className={`p-5 rounded-xl border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              resultado.alertaVencimiento === 'critico'
                ? 'bg-rose-50 border-rose-200 text-rose-950 animate-pulse'
                : resultado.alertaVencimiento === 'urgente'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : resultado.alertaVencimiento === 'vencido'
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  resultado.alertaVencimiento === 'critico'
                    ? 'bg-rose-200 text-rose-800'
                    : resultado.alertaVencimiento === 'urgente'
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {resultado.alertaVencimiento === 'critico' && <ShieldAlert className="w-6 h-6" />}
                  {resultado.alertaVencimiento === 'urgente' && <AlertTriangle className="w-6 h-6" />}
                  {resultado.alertaVencimiento === 'normal' && <CheckCircle2 className="w-6 h-6" />}
                  {resultado.alertaVencimiento === 'vencido' && <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Estado del Término:</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-white/80 shadow-2xs">
                      {resultado.horasRestantesTexto}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-1">
                    Vencimiento Fatal: {resultado.fechaVencimientoFatal}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">
                    <strong>Término de gracia:</strong> {resultado.fechaTerminoGracia}
                  </p>
                </div>
              </div>

              {/* Botón para agendar como tarea en el expediente */}
              <button
                onClick={handleAgendarTarea}
                disabled={isSavingTask}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C058] text-black font-black text-xs shadow-md shadow-[#D4AF37]/20 transition-all cursor-pointer"
              >
                {taskSavedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    ¡Vencimiento Agendado!
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    Agendar Tarea de Vencimiento
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs flex items-center gap-3">
              <Info className="w-5 h-5 text-slate-400 shrink-0" />
              <span>Ingresa la fecha de notificación y los días del término legal para calcular el vencimiento fatal y desglosar la cronología día a día.</span>
            </div>
          )}

          {/* CRONOLOGÍA DETALLADA DÍA A DÍA */}
          {resultado && (
            <div className="bg-[#121214] rounded-xl border border-[#27272A] shadow-xl overflow-hidden space-y-0">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Cronología Procesal Detallada Paso a Paso</h3>
                  <p className="text-xs text-slate-500">
                    Surtimiento: {resultado.fechaSurtimiento} | Inicio del término: {resultado.fechaInicioComputo}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-700">
                  {resultado.cronologia.length} días analizados
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {resultado.cronologia.map((dia, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      dia.etapa === 'vencimiento'
                        ? 'bg-rose-50/80 font-bold border-l-4 border-rose-500'
                        : dia.etapa === 'notificacion'
                        ? 'bg-blue-50/60 border-l-4 border-blue-500'
                        : dia.etapa === 'surtimiento'
                        ? 'bg-indigo-50/60 border-l-4 border-indigo-500'
                        : !dia.esHabil
                        ? 'bg-slate-50/70 text-slate-400'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        dia.etapa === 'vencimiento'
                          ? 'bg-rose-600 text-white'
                          : dia.etapa === 'notificacion'
                          ? 'bg-blue-600 text-white'
                          : dia.etapa === 'surtimiento'
                          ? 'bg-indigo-600 text-white'
                          : !dia.esHabil
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {dia.numeroDiaHabil ? dia.numeroDiaHabil : dia.etapa === 'notificacion' ? 'N' : dia.etapa === 'surtimiento' ? 'S' : 'X'}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{dia.fecha}</span>
                          <span className="text-xs text-slate-500">({dia.diaSemana})</span>
                          {dia.etapa === 'vencimiento' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase">
                              Vencimiento Fatal
                            </span>
                          )}
                          {dia.etapa === 'notificacion' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                              Notificación
                            </span>
                          )}
                          {dia.etapa === 'surtimiento' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                              Surte Efectos
                            </span>
                          )}
                        </div>

                        {!dia.esHabil && dia.motivoInhabil && (
                          <p className="text-[11px] text-slate-500 mt-0.5 italic">
                            ⛔ Inhábil: {dia.motivoInhabil}
                          </p>
                        )}
                        {dia.etapa === 'computo' && (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Día hábil #{dia.numeroDiaHabil} computado
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      {dia.esHabil ? (
                        <span className="text-emerald-600 font-semibold">Día Hábil</span>
                      ) : (
                        <span className="text-slate-400 font-medium">Inhábil</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Certificación Secretarial & Datos del Juicio */}
        <div className="space-y-6">
          <div className="bg-[#121214] p-5 rounded-xl border border-[#27272A] shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Datos del Juicio para la Certificación
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Número de Expediente
              </label>
              <input
                type="text"
                placeholder="Ej. 850/2024"
                value={expedienteNum}
                onChange={(e) => setExpedienteNum(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Juzgado o Tribunal
              </label>
              <input
                type="text"
                placeholder="Ej. JUZGADO SEGUNDO DE DISTRITO"
                value={juzgado}
                onChange={(e) => setJuzgado(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Partes (Actor vs Demandado)
              </label>
              <input
                type="text"
                placeholder="Ej. Inmobiliaria Alpha vs Beta S.A."
                value={partes}
                onChange={(e) => setPartes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Concepto del Término
              </label>
              <input
                type="text"
                placeholder="Ej. Contestación de demanda, Recurso de Revisión..."
                value={conceptoTermino}
                onChange={(e) => setConceptoTermino(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Certificación Secretarial Escrita */}
          <div className="bg-[#121214] rounded-xl border border-[#27272A] shadow-xl overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">Certificación Procesal Oficial</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Copiar texto"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50">
              <pre className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap font-serif bg-white p-3.5 rounded border border-slate-200 max-h-96 overflow-y-auto">
                {textoCertificacion}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
