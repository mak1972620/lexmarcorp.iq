import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Scale, 
  FileText, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Layers, 
  UserCheck, 
  Users, 
  ArrowRight,
  RefreshCw,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

interface HechoControvertido {
  numero: number;
  descripcion: string;
  posturaActor: string;
  posturaDemandado: string;
  cargaProbatoria: 'Actor' | 'Demandado';
  fundamentoCarga: string;
  nivelRiesgo: 'alto' | 'medio' | 'bajo';
}

interface HechoAdmitido {
  numero: number;
  descripcion: string;
  impactoProcesal: string;
}

interface ExcepcionDetectada {
  nombre: string;
  argumentoContraria: string;
  estrategiaDesvirtuacion: string;
  probabilidadExitoContraria: 'alta' | 'media' | 'baja';
}

interface PosicionConfesional {
  numero: number;
  posicion: string;
  objetivoProcesal: string;
  hechoRelacionado: number;
}

interface PreguntaTestigo {
  numero: number;
  pregunta: string;
  objetivoProcesal: string;
  razonDeSuDicho: string;
}

interface DueloResult {
  resumenLitis: string;
  hechosControvertidos: HechoControvertido[];
  hechosAdmitidosOConfesos: HechoAdmitido[];
  excepcionesDetectadas: ExcepcionDetectada[];
  pliegoPosicionesConfesional: PosicionConfesional[];
  interrogatorioTestigos: PreguntaTestigo[];
  escritoJudicialWord: string;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  court?: string;
  client_name?: string;
}

export default function DueloProcesal() {
  const token = localStorage.getItem('token') || '';
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Metadatos procesales
  const [materia, setMateria] = useState<string>('Mercantil');
  const [rolUsuario, setRolUsuario] = useState<'actor' | 'demandado'>('actor');
  const [expedienteNum, setExpedienteNum] = useState<string>('');
  const [juzgado, setJuzgado] = useState<string>('');
  const [partes, setPartes] = useState<string>('');

  // Textos para el cruce de la Litis
  const [textoDemanda, setTextoDemanda] = useState<string>('');
  const [textoContestacion, setTextoContestacion] = useState<string>('');
  const [instruccionesExtra, setInstruccionesExtra] = useState<string>('');

  // Estado del análisis
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DueloResult | null>(null);

  // UI tabs
  const [activeTab, setActiveTab] = useState<'litis' | 'excepciones' | 'posiciones' | 'testigos' | 'escrito'>('litis');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  // Cargar caso de ejemplo rápido
  const handleCargarEjemplo = () => {
    setMateria('Mercantil');
    setRolUsuario('actor');
    setExpedienteNum('1420/2024');
    setJuzgado('JUZGADO TERCERO DE PRIMERA INSTANCIA EN MATERIA MERCANTIL');
    setPartes('COMERCIALIZADORA DEL NORTE S.A. DE C.V. VS CONSTRUCTORA REGIO-ACEROS S.A. DE C.V.');
    
    setTextoDemanda(`1. Con fecha 12 de enero de 2024, la demandada CONSTRUCTORA REGIO-ACEROS S.A. DE C.V., por conducto de su representante legal, suscribió a favor de mi mandante un pagaré mercantil por la cantidad de $450,000.00 M.N., con fecha de vencimiento al 30 de abril de 2024.
2. En dicho título de crédito se pactó un interés moratorio a razón del 3.5% mensual en caso de incumplimiento.
3. Llegada la fecha de vencimiento, el documento fue presentado para su pago en el domicilio convenido, negándose la demandada a liquidar el importe principal o sus accesorios, adeudando a la fecha la totalidad de la suerte principal.`);

    setTextoContestacion(`CONTESTACIÓN A LOS HECHOS:
1. El hecho 1 es parcialmente cierto respecto a la existencia de relaciones comerciales, pero SE NIEGA que la suscripción del pagaré constituya una deuda líquida y exigible, toda vez que dicho pagaré fue entregado exclusivamente en garantía de un suministro de materiales que la actora entregó con defectos de calidad graves.
2. El hecho 2 no es hecho propio, por lo que se niega en los términos expuestos por la actora.
3. El hecho 3 SE NIEGA ROTUNDAMENTE. Mi representada jamás fue requerida formalmente de pago en su domicilio social antes de la presentación de esta demanda temeraria.

EXCEPCIONES Y DEFENSAS:
- EXCEPCIÓN DE PAGO PARCIAL: Mi representada transfirió con fecha 15 de marzo de 2024 la cantidad de $120,000.00 a la cuenta bancaria de la actora, cantidad que no fue deducida de la suerte principal.
- EXCEPCIÓN DE CAUSA ILÍCITA Y FALTA DE ACCIÓN (SINE ACTIONE AGIS): Al no haberse entregado el material a entera satisfacción conforme a la orden de compra correlativa.`);
  };

  const handleEjecutarDuelo = async () => {
    if (!textoDemanda.trim() || !textoContestacion.trim()) {
      setError('Por favor ingresa tanto el texto de la Demanda como el de la Contestación.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/ai/duelo-procesal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          caseId: selectedCaseId,
          materia,
          rolUsuario,
          textoDemanda,
          textoContestacion,
          instruccionesExtra,
          expediente: expedienteNum,
          juzgado,
          partes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el Duelo Procesal con IA');
      }

      setResultado(data.data);
      setActiveTab('litis');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor de IA.');
    } finally {
      setLoading(false);
    }
  };

  // Descargar Word Judicial Oficial
  const handleExportDocx = async () => {
    if (!resultado?.escritoJudicialWord) return;
    try {
      setIsExporting(true);
      const docBlob = await generateJudicialDocx(resultado.escritoJudicialWord, {
        title: 'PLIEGO DE POSICIONES E INTERROGATORIO PROCESAL',
        materia,
        rubro: {
          expediente: expedienteNum || 'SIN-EXP',
          juzgado: juzgado || 'JUZGADO COMPETENTE',
          juicio: `JUICIO EJECUTIVO / ORDINARIO ${materia.toUpperCase()}`,
          actor: partes.split(/ vs\.? /i)[0] || 'PARTE ACTORA',
          demandado: partes.split(/ vs\.? /i)[1] || 'PARTE DEMANDADA'
        },
        firmante: rolUsuario === 'actor' ? 'PARTE ACTORA / MANDATARIO JUDICIAL' : 'PARTE DEMANDADA / ABOGADO PATRONO',
        selloCripto: Math.random().toString(16).substring(2, 10).toUpperCase()
      });

      const filename = `Duelo_Procesal_Pliego_${(expedienteNum || 'Litis').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      downloadDocxBlob(docBlob, filename);
    } catch (err) {
      console.error(err);
      alert('Error al generar el documento de Word.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    if (!resultado?.escritoJudicialWord) return;
    navigator.clipboard.writeText(resultado.escritoJudicialWord);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Inteligencia Litigiosa Procesal
            </span>
            <span className="text-xs text-slate-500 font-mono">Arts. 1194-1196 Cód. Comercio & C.P.C.</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Swords className="w-8 h-8 text-indigo-600" />
            Duelo Procesal: Fijación de Litis & Pliego de Posiciones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Cruza la Demanda vs Contestación en segundos: mapea la carga de la prueba (Onus Probandi), destruye excepciones de la contraria y formula posiciones confesionales que acorralan al absolvente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCargarEjemplo}
            className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Cargar Ejemplo Litigioso
          </button>
          {resultado && (
            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Generando...' : 'Descargar Pliego (.docx)'}
            </button>
          )}
        </div>
      </div>

      {/* Selector de Expediente y Parámetros */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Configuración del Combate Procesal</h3>
              <p className="text-xs text-slate-400">Vincula un expediente activo o ingresa los datos de radicación para el pliego</p>
            </div>
          </div>

          <div className="w-full md:w-80">
            <select
              value={selectedCaseId}
              onChange={(e) => handleSelectCase(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Vincular con expediente existente (opcional) --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number ? `${c.case_number} - ` : ''}{c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Materia Procesal</label>
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="Mercantil">Mercantil (Cód. Comercio)</option>
              <option value="Civil">Civil (Códigos Civiles Estatales)</option>
              <option value="Familiar">Familiar</option>
              <option value="Laboral">Laboral (Ley Federal del Trabajo)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Rol de Nuestro Cliente</label>
            <select
              value={rolUsuario}
              onChange={(e) => setRolUsuario(e.target.value as 'actor' | 'demandado')}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="actor">Parte Actora (Acreedor / Demandante)</option>
              <option value="demandado">Parte Demandada (Deudor / Defensor)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Número de Expediente</label>
            <input
              type="text"
              placeholder="Ej. 1420/2024"
              value={expedienteNum}
              onChange={(e) => setExpedienteNum(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Partes (Actor vs Demandado)</label>
            <input
              type="text"
              placeholder="Ej. Juan Pérez vs Pedro López"
              value={partes}
              onChange={(e) => setPartes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Formulario de Entrada Dual: Demanda vs Contestación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Izquierdo: Demanda Inicial */}
        <div className="bg-[#121214] p-5 rounded-xl border border-[#27272A] shadow-md flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></span>
              <h3 className="font-bold text-sm text-[#D4AF37]">1. Hechos de la Demanda Inicial</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{textoDemanda.length} caracteres</span>
          </div>
          <p className="text-xs text-slate-400">
            Pega el capítulo de hechos, prestaciones y documentos base de la acción formulados por la actora.
          </p>
          <textarea
            rows={10}
            value={textoDemanda}
            onChange={(e) => setTextoDemanda(e.target.value)}
            placeholder="Pega aquí los hechos numerados de la demanda, las fechas clave, montos y títulos exhibidos..."
            className="w-full p-3 border border-[#27272A] bg-[#070A0F] rounded-lg text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-[#D4AF37] resize-none font-mono"
          />
        </div>

        {/* Panel Derecho: Contestación y Excepciones */}
        <div className="bg-[#121214] p-5 rounded-xl border border-[#27272A] shadow-md flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5C058]"></span>
              <h3 className="font-bold text-sm text-[#E5C058]">2. Contestación, Excepciones y Defensas</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{textoContestacion.length} caracteres</span>
          </div>
          <p className="text-xs text-slate-400">
            Pega la contestación a cada hecho (admite, niega o ignora) y el capítulo de excepciones opuestas.
          </p>
          <textarea
            rows={10}
            value={textoContestacion}
            onChange={(e) => setTextoContestacion(e.target.value)}
            placeholder="Pega aquí cómo contestó la contraparte a cada hecho, sus evasivas y las excepciones de fondo..."
            className="w-full p-3 border border-slate-300 rounded-lg text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
          />
        </div>
      </div>

      {/* Instrucciones tácticas adicionales y Botón de Ejecución */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Instrucciones Tácticas Particulares (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ej. Forzar la confesión sobre la entrega del dinero y preparar objeciones a la excepción de prescripción..."
            value={instruccionesExtra}
            onChange={(e) => setInstruccionesExtra(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleEjecutarDuelo}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#E5C058] text-black font-black text-sm shadow-lg shadow-[#D4AF37]/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Ejecutando Duelo Forense con Gemini 3.8 Flash...
              </>
            ) : (
              <>
                <Swords className="w-5 h-5 text-amber-300" />
                Ejecutar Duelo Procesal & Fijar la Litis
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTADOS DEL DUELO PROCESAL */}
      {resultado && (
        <div className="space-y-6 pt-4">
          {/* Resumen Ejecutivo de la Litis */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-xl border border-indigo-700/40 shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Diagnóstico Forense de la Controversia
            </div>
            <h2 className="text-lg md:text-xl font-bold leading-snug">Núcleo Central de la Litis</h2>
            <p className="text-sm text-slate-200 leading-relaxed pt-1">
              {resultado.resumenLitis}
            </p>
          </div>

          {/* Navegación por Pestañas de Resultados */}
          <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('litis')}
              className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'litis'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              1. Hechos Controvertidos & Carga Probatoria ({resultado.hechosControvertidos.length})
            </button>

            <button
              onClick={() => setActiveTab('excepciones')}
              className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'excepciones'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              2. Radar de Excepciones ({resultado.excepcionesDetectadas.length})
            </button>

            <button
              onClick={() => setActiveTab('posiciones')}
              className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'posiciones'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              3. Pliego de Posiciones Confesionales ({resultado.pliegoPosicionesConfesional.length})
            </button>

            <button
              onClick={() => setActiveTab('testigos')}
              className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'testigos'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              4. Interrogatorio Testimonial ({resultado.interrogatorioTestigos.length})
            </button>

            <button
              onClick={() => setActiveTab('escrito')}
              className={`pb-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'escrito'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              5. Memorial Formal (Word .docx)
            </button>
          </div>

          {/* TAB 1: HECHOS CONTROVERTIDOS & CARGA PROBATORIA */}
          {activeTab === 'litis' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-800">Matriz de la Litis: Distribución de la Carga de la Prueba (Onus Probandi)</h3>
                  <p className="text-xs text-slate-500">Conforme al Art. 1194 del Código de Comercio: *El que afirma está obligado a probar. En consecuencia, el actor debe probar su acción y el reo sus excepciones*.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {resultado.hechosControvertidos.map((h) => (
                    <div key={h.numero} className="p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">
                            {h.numero}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{h.descripcion}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            h.cargaProbatoria === 'Actor' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Carga: {h.cargaProbatoria}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            h.nivelRiesgo === 'alto' 
                              ? 'bg-rose-100 text-rose-800' 
                              : h.nivelRiesgo === 'medio'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            Riesgo: {h.nivelRiesgo}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                          <span className="font-bold text-blue-900 block mb-1">Postura de la Parte Actora:</span>
                          <p className="text-slate-700">{h.posturaActor}</p>
                        </div>
                        <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-100">
                          <span className="font-bold text-amber-900 block mb-1">Postura de la Parte Demandada:</span>
                          <p className="text-slate-700">{h.posturaDemandado}</p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
                        <strong>Fundamento Jurídico:</strong> {h.fundamentoCarga}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hechos admitidos */}
              {resultado.hechosAdmitidosOConfesos?.length > 0 && (
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Hechos Admitidos o Confesados Expresamente (Ventaja Procesal Plena)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {resultado.hechosAdmitidosOConfesos.map((ha, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <p className="font-semibold text-slate-800">{ha.descripcion}</p>
                        <p className="text-emerald-700 font-medium">Relevancia: {ha.impactoProcesal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXCEPCIONES Y DEFENSAS */}
          {activeTab === 'excepciones' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resultado.excepcionesDetectadas.map((exc, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      {exc.nombre}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      exc.probabilidadExitoContraria === 'alta'
                        ? 'bg-rose-100 text-rose-800'
                        : exc.probabilidadExitoContraria === 'media'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Éxito Contraria: {exc.probabilidadExitoContraria}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-slate-600 block">Argumento de la Contraparte:</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">{exc.argumentoContraria}</p>
                  </div>

                  <div className="text-xs space-y-1 bg-indigo-50/70 p-3 rounded-lg border border-indigo-200 text-indigo-950">
                    <span className="font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Estrategia de Desvirtuación Tanaka Legal IQ:
                    </span>
                    <p className="leading-relaxed">{exc.estrategiaDesvirtuacion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PLIEGO DE POSICIONES CONFESIONALES */}
          {activeTab === 'posiciones' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Pliego de Posiciones Confesionales para Desahogo en Audiencia</h3>
                  <p className="text-xs text-slate-500">Articuladas en sentido afirmativo, precisas, no insidiosas y orientadas a obtener confesión expresa.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 font-bold text-xs">
                  {resultado.pliegoPosicionesConfesional.length} Posiciones
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {resultado.pliegoPosicionesConfesional.map((pos) => (
                  <div key={pos.numero} className="p-4 hover:bg-indigo-50/30 transition-colors space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {pos.numero}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-slate-900 leading-relaxed font-serif">
                          "{pos.posicion}"
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="text-indigo-700 font-medium">🎯 Objetivo: {pos.objetivoProcesal}</span>
                          <span className="text-slate-400">| Hecho Vinculado #{pos.hechoRelacionado}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: INTERROGATORIO TESTIMONIAL */}
          {activeTab === 'testigos' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Interrogatorio Directo para Testigos</h3>
                  <p className="text-xs text-slate-500">Formuladas de manera no inductiva para acreditar circunstancias de modo, tiempo y lugar.</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-700 font-bold text-xs">
                  {resultado.interrogatorioTestigos.length} Preguntas
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {resultado.interrogatorioTestigos.map((t) => (
                  <div key={t.numero} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {t.numero}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold text-sm text-slate-900 leading-relaxed font-serif">
                          "{t.pregunta}"
                        </p>
                        <p className="text-xs text-slate-500">🎯 {t.objetivoProcesal}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ESCRITO JUDICIAL COMPLETO (WORD) */}
          {activeTab === 'escrito' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Memorial Judicial Oficial (Pliego en Sobre Cerrado / Audiencia)</h3>
                  <p className="text-xs text-slate-500">Documento listo para imprimir y presentar ante el juzgado conforme al Cód. de Comercio.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado al Portapapeles' : 'Copiar Texto'}
                  </button>
                  <button
                    onClick={handleExportDocx}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExporting ? 'Descargando...' : 'Descargar en Word (.docx)'}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50">
                <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg border border-slate-200 shadow-sm font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap selection:bg-indigo-100">
                  {resultado.escritoJudicialWord}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
