import React, { useState, useRef, useEffect } from 'react';
import { 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  FileSearch, 
  Loader2, 
  Upload, 
  FileText,
  BadgeCheck,
  Copy,
  Download,
  PenTool,
  Printer,
  Sparkles,
  Check,
  RotateCcw,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import Markdown from 'react-markdown';
import * as mammoth from 'mammoth';
import { useAuth } from '../context/AuthContext';
import { generateJudicialDocx, downloadDocxBlob } from '../utils/docxExport';

const Auditor = () => {
  const { user } = useAuth();
  const [documentText, setDocumentText] = useState('');
  const [materia, setMateria] = useState('Civil');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // New State variables for the Correction and Armoring function
  const [activeTab, setActiveTab] = useState<'report' | 'shield'>('report');
  const [shieldedText, setShieldedText] = useState<string | null>(null);
  const [shieldedLoading, setShieldedLoading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  
  // Signature and Seal states
  const [signatureType, setSignatureType] = useState<'canvas' | 'text'>('canvas');
  const [typedName, setTypedName] = useState('CEO. LIC. MARCO PERALES');
  const [isSigned, setIsSigned] = useState(false);
  const [sealHash, setSealHash] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Generate random hash for authentic cryptographic seal look
  useEffect(() => {
    if (isSigned && !sealHash) {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let hash = 'LMC-IQ-';
      for (let i = 0; i < 8; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setSealHash(hash);
    }
  }, [isSigned, sealHash]);

  // Adjust canvas drawing coordinates for styling
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale factor in case canvas was stretched visually
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Blue-900 look for ink pen

    const coords = getCanvasCoords(e);
    if (!coords) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    if ('touches' in e) {
      e.preventDefault();
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
    setSealHash('');
  };

  // Process uploaded documents
  const processFile = async (file: File) => {
    const isValidPdf = file.type === 'application/pdf';
    const isValidTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
    const isValidDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
    const isValidDoc = file.type === 'application/msword' || file.name.endsWith('.doc');

    if (!isValidPdf && !isValidTxt && !isValidDocx && !isValidDoc) {
      setResult('**Error:** Por favor sube un archivo válido (PDF, Word o TXT)');
      return;
    }

    setUploading(true);
    setResult(null);
    setShieldedText(null);
    setIsSigned(false);
    setSealHash('');
    
    try {
      if (isValidTxt) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setDocumentText(e.target?.result as string);
          setUploading(false);
        };
        reader.readAsText(file);
      } else if (isValidDocx) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const res = await mammoth.extractRawText({ arrayBuffer });
            setDocumentText(res.value);
          } catch (err) {
            setResult('**Error:** No se pudo extraer el texto del archivo Word.');
          } finally {
            setUploading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (isValidPdf) {
        setResult('**Aviso:** Para PDFs con imágenes o formato complejo, usa el "Escáner de Documentos". Para texto simple, por favor copia y pega el contenido aquí.');
        setUploading(false);
      } else if (isValidDoc) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const binaryString = e.target?.result as string;
          const text = binaryString.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ');
          setDocumentText(text);
          setUploading(false);
        };
        reader.readAsBinaryString(file);
      }
    } catch (err) {
      console.error(err);
      setResult('**Error:** Ocurrió un problema al procesar el archivo.');
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Run the document evaluation (REAF Audit) server-side
  const handleAudit = async () => {
    if (!documentText.trim()) return;
    setLoading(true);
    setResult(null);
    setShieldedText(null);
    setIsSigned(false);
    setSealHash('');
    setActiveTab('report');

    try {
      const res = await fetch('/api/ai/audit-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentText, materia }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
      } else {
        setResult(`**Error en la auditoría:** ${data.error || 'Ocurrió un problema al conectar con el servidor.'}`);
      }
    } catch (error: any) {
      console.error('Error during audit:', error);
      setResult(`**Error en la auditoría:** ${error.message || 'Ocurrió un problema al conectar con Lexmarcorp IQ.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Run the Document Armoring / Shielding (Redrafting) server-side
  const handleShield = async () => {
    if (!documentText.trim()) return;
    setShieldedLoading(true);
    setIsSigned(false);
    setSealHash('');
    setActiveTab('shield');

    try {
      const res = await fetch('/api/ai/shield-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentText, 
          materia,
          auditReport: result 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShieldedText(data.shieldedText);
      } else {
        setShieldedText(`Error al reconstruir el escrito: ${data.error || 'Ocurrió un problema al conectar con el servidor.'}`);
      }
    } catch (error: any) {
      console.error('Error during document armoring:', error);
      setShieldedText(`Error al reconstruir el escrito: ${error.message || 'Ocurrió un problema al conectar con Lexmarcorp IQ.'}`);
    } finally {
      setShieldedLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shieldedText) return;
    navigator.clipboard.writeText(shieldedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!shieldedText) return;
    const element = document.createElement("a");
    const file = new Blob([shieldedText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `escrito_blindado_${materia.toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadDocx = async () => {
    if (!shieldedText) return;
    setDownloadingDocx(true);
    try {
      const blob = await generateJudicialDocx(shieldedText, {
        title: `Escrito Blindado - Materia ${materia}`,
        materia,
        firmante: signatureType === 'text' ? typedName : (user?.name || 'LIC. MARCO PERALES'),
        selloCripto: isSigned ? sealHash : undefined,
      });
      downloadDocxBlob(blob, `escrito_blindado_${materia.toLowerCase()}_formato_juzgado.docx`);
    } catch (err) {
      console.error('Error al generar DOCX:', err);
      alert('Ocurrió un error al generar el archivo Word.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  // Handles printing only the document
  const handlePrint = () => {
    if (!shieldedText) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Style print beautifully
    printWindow.document.write(`
      <html>
        <head>
          <title>Escrito Judicial Blindado - Lexmarcorp IQ</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              line-height: 1.8;
              color: #000;
              padding: 40px;
              margin: 40px;
            }
            .paper {
              white-space: pre-wrap;
              font-size: 13pt;
              text-align: justify;
            }
            .seal-block {
              margin-top: 50px;
              border: 1px double #1e3a8a;
              padding: 15px;
              font-size: 10pt;
              display: inline-block;
              max-width: 400px;
              font-family: monospace;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="paper">${shieldedText}</div>
          ${isSigned ? `
            <div class="seal-block">
              <strong>LEXMARCORP IQ SECURE-CORE CERTIFICATION</strong><br/>
              Sello de Validación: ${sealHash}<br/>
              Fecha de Firma: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}<br/>
              Firmante: ${typedName}<br/>
              Materia: ${materia}<br/>
              Protección: Nivel de Blindaje Forense TSJ Coahuila Integrado.
            </div>
          ` : ''}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <BrainCircuit size={24} />
            </div>
            <h1 id="auditor-title-header" className="text-2xl font-bold text-slate-900">Lexmarcorp IQ</h1>
          </div>
          <p className="text-slate-500">Auditor Forense Jurídico Senior - Especialista en Coahuila</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".doc,.docx,.txt,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />
          <button
            id="btn-upload-file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} className="text-amber-500" />}
            Subir Escrito (Word/TXT)
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Input Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 id="auditor-input-heading" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileSearch size={20} className="text-slate-400" />
              Documento a Auditar
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Materia del Escrito</label>
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-slate-900"
                >
                  <option value="Civil">Civil</option>
                  <option value="Familiar">Familiar</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="Penal">Penal</option>
                  <option value="Amparo">Amparo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Texto del Documento</label>
                <textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder="Pega aquí el contenido de tu demanda, contestación, agravios, acusación, etc..."
                  className="w-full h-96 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none resize-none font-mono text-sm text-slate-800"
                />
              </div>

              <button
                id="btn-run-audit"
                onClick={handleAudit}
                disabled={loading || !documentText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-950 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analizando Silogismo Jurídico...
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} className="text-amber-500" />
                    Ejecutar Auditoría Forense
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Output Area with Tabs */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[600px] flex flex-col">
            {/* Elegant Tab Headers */}
            {result ? (
              <div id="reaf-output-header-tabs" className="flex border-b border-slate-200 mb-4">
                <button
                  id="tab-btn-report"
                  onClick={() => setActiveTab('report')}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center flex justify-center items-center gap-2 ${
                    activeTab === 'report' ? 'border-amber-500 text-slate-900 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <AlertTriangle size={16} className={activeTab === 'report' ? 'text-amber-500' : 'text-slate-400'} />
                  1. Reporte REAF (Auditoría)
                </button>
                <button
                  id="tab-btn-shield"
                  onClick={() => {
                    setActiveTab('shield');
                    // Automatically trigger armoring if tab clicked and text is not built
                    if (!shieldedText && !shieldedLoading) {
                      handleShield();
                    }
                  }}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 text-center flex justify-center items-center gap-2 ${
                    activeTab === 'shield' ? 'border-amber-500 text-slate-900 font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Sparkles size={16} className={activeTab === 'shield' ? 'text-amber-500' : 'text-slate-400'} />
                  2. Escrito Blindado y Listo 🛡️
                </button>
              </div>
            ) : (
              <h2 id="auditor-output-heading-empty" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-transparent pb-3">
                <AlertTriangle size={20} className="text-amber-500" />
                Reporte de Evaluación Activa Forense (REAF)
              </h2>
            )}

            {/* Container body */}
            <div className="flex-1 flex flex-col">
              {loading ? (
                /* Report analyzer state */
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-6 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <BrainCircuit size={48} className="animate-pulse text-amber-500/50" />
                  <p className="text-sm font-medium text-center max-w-xs">
                    Lexmarcorp IQ está revisando la vigencia de ley, buscando contradicciones fácticas y simulando el ataque de la contraparte...
                  </p>
                </div>
              ) : result ? (
                /* Active reports view */
                <div className="flex-1 flex flex-col">
                  {activeTab === 'report' ? (
                    /* REGULAR AUDIT REPORT TAB */
                    <div id="tab-content-report" className="flex-1 flex flex-col">
                      <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-6 max-h-[500px] overflow-y-auto">
                        <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-a:text-amber-600">
                          <Markdown>{result}</Markdown>
                        </div>
                      </div>

                      {/* Prominent armoring trigger CTA at the bottom */}
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck size={20} className="text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">¿Listo para blindar tu documento?</h4>
                            <p className="text-xs text-slate-600">Reconstruye el escrito con corrección procesal, fundado bajo las leyes vigentes de Coahuila.</p>
                          </div>
                        </div>
                        <button
                          id="btn-goto-shield"
                          onClick={() => {
                            setActiveTab('shield');
                            handleShield();
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm shrink-0 whitespace-nowrap transition-all"
                        >
                          Generar Escrito Blindado
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* SHIELDED / CORRECTED LEGAL WRITING TAB */
                    <div id="tab-content-shield" className="flex-1 flex flex-col space-y-4">
                      {shieldedLoading ? (
                        <div className="flex-1 h-[450px] bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center space-y-4 text-slate-400">
                          <Loader2 size={40} className="animate-spin text-amber-500" />
                          <p className="text-sm font-black text-slate-800">Reescribiendo Escrito Legal...</p>
                          <p className="text-xs text-slate-500 max-w-sm text-center">
                            Aplicando Silogismo de Juez, subsanando oscuridad procesal y fundamentando con el Código de Coahuila...
                          </p>
                        </div>
                      ) : shieldedText ? (
                        <>
                          {/* Options Toolbar */}
                          <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
                              <BadgeCheck size={14} className="text-emerald-500" />
                              Versión Corregida e Inmune
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Download Word (.docx) */}
                              <button
                                onClick={handleDownloadDocx}
                                disabled={downloadingDocx}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                                title="Descargar como documento Word con formato judicial de juzgado (.docx)"
                              >
                                {downloadingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                <span>{downloadingDocx ? 'Generando...' : 'Descargar Word (.docx)'}</span>
                              </button>
                              {/* Copy */}
                              <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                title="Copiar escrito"
                              >
                                {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                {isCopied ? 'Copiado' : 'Copiar'}
                              </button>
                              {/* Download TXT */}
                              <button
                                onClick={handleDownload}
                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-600 hover:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                title="Descargar como TXT plano"
                              >
                                <Download size={14} />
                                TXT
                              </button>
                              {/* Print */}
                              <button
                                onClick={handlePrint}
                                className="p-2 hover:bg-white border border-transparent hover:border-slate-200 text-slate-700 hover:text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                title="Imprimir"
                              >
                                <Printer size={14} className="text-slate-600" />
                                Imprimir
                              </button>
                            </div>
                          </div>

                          {/* Interactive Judicial Paper Canvas (Styled Textarea) */}
                          <div className="relative border border-slate-300 rounded-xl overflow-hidden shadow-inner flex-1 flex">
                            {/* Margin vertical red court lines */}
                            <div className="absolute left-[34px] top-0 bottom-0 w-[2px] bg-red-400 opacity-30 h-full pointer-events-none" />
                            <div className="absolute left-[38px] top-0 bottom-0 w-[1px] bg-red-400 opacity-20 h-full pointer-events-none" />
                            
                            {/* Simple line number guide on left margin */}
                            <div className="w-[30px] bg-slate-50/50 py-4 text-right pr-2 text-[10px] font-mono text-slate-300 select-none border-r border-slate-100 flex flex-col leading-6 space-y-0.5">
                              {Array.from({ length: 45 }).map((_, i) => (
                                <div key={i}>{i + 1}</div>
                              ))}
                            </div>

                            {/* Actual editable brief sheet */}
                            <textarea
                              value={shieldedText}
                              onChange={(e) => setShieldedText(e.target.value)}
                              className="flex-1 w-full h-[450px] p-6 pl-8 bg-slate-50 border-0 outline-none resize-none font-serif leading-6 text-slate-800 text-sm overflow-y-auto selection:bg-amber-100"
                              placeholder="Aquí se mostrará el escrito ya perfeccionado e inmune para su firma..."
                            />
                          </div>

                          {/* INTERACTIVE DRAWING SIGNATURE BLOCK */}
                          <div id="legal-signature-container-block" className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
                              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <PenTool size={16} className="text-slate-500" />
                                Estampar Firma y Sello de Presentación
                              </h3>
                              <div className="flex items-center gap-1 border border-slate-200 bg-white p-0.5 rounded-lg text-[10px]">
                                <button
                                  onClick={() => { setSignatureType('canvas'); setIsSigned(false); }}
                                  className={`px-2 py-1 rounded-md font-semibold transition-all ${signatureType === 'canvas' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                  Firma en Pantalla
                                </button>
                                <button
                                  onClick={() => { setSignatureType('text'); setIsSigned(false); }}
                                  className={`px-2 py-1 rounded-md font-semibold transition-all ${signatureType === 'text' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                  Firma por Cédula
                                </button>
                              </div>
                            </div>

                            {/* Signature Input Container */}
                            {!isSigned ? (
                              <div className="space-y-3">
                                {signatureType === 'canvas' ? (
                                  <div className="space-y-2">
                                    <p className="text-[11px] text-slate-500">Dibuja la firma en el área de abajo usando mouse o touch screen:</p>
                                    <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-white h-32 flex items-center justify-center">
                                      <canvas
                                        ref={canvasRef}
                                        width={480}
                                        height={128}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={endDrawing}
                                        onMouseLeave={endDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={endDrawing}
                                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                                      />
                                      <div className="absolute right-2 bottom-2 flex gap-2">
                                        <button
                                          onClick={clearCanvas}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] flex items-center gap-1 font-semibold transition-all shadow-sm"
                                        >
                                          <RotateCcw size={10} />
                                          Restaurar
                                        </button>
                                        <button
                                          onClick={() => setIsSigned(true)}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                        >
                                          <Check size={10} />
                                          Estampar Firma
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Nombre Completo de Autorización Legal</label>
                                      <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all text-slate-900"
                                        placeholder="CEO. LIC. MARCO PERALES"
                                      />
                                    </div>
                                    <button
                                      onClick={() => setIsSigned(true)}
                                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                                    >
                                      <Check size={12} />
                                      Estampar y Sellar por Firma Electrónica Patrono
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Signed and Sealed Visual Seal block */
                              <div id="verified-seal-visual" className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 flex flex-col md:flex-row items-center gap-4 animate-fade-in">
                                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                  <ShieldCheck size={32} />
                                </div>
                                <div className="flex-1 space-y-1 text-center md:text-left">
                                  <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">LexmarCorp IQ Secure Shield Certified</h4>
                                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full mx-auto md:mx-0 w-fit">VERIFICADO</span>
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-relaxed font-mono">
                                    Escrito jurídico corregido y blindado bajo la legislación del Estado de Coahuila de Zaragoza.
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 text-[9px] font-mono text-slate-500">
                                    <div>
                                      <span className="font-bold block text-slate-400">SELLO:</span>
                                      {sealHash}
                                    </div>
                                    <div>
                                      <span className="font-bold block text-slate-400">FIRMANTE:</span>
                                      {signatureType === 'text' ? typedName : 'FIRMA AUTÓGRAFA'}
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <span className="font-bold block text-slate-400">REGISTRO:</span>
                                      {new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX')}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={() => { setIsSigned(false); setSealHash(''); }}
                                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors uppercase font-mono tracking-wider font-bold py-1 px-2 border border-slate-200 hover:border-slate-300 rounded bg-white mt-2 md:mt-0 shadow-sm"
                                >
                                  Retirar
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 h-[450px] bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
                          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-full animate-bounce">
                            <Sparkles size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">¿Deseas corregir y blindar tu escrito?</h3>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">
                              Nuestro motor reestructurará tu demanda original corrigiendo el silogismo fáctico y aplicando las leyes precisas de Coahuila para inmunizarlo ante recursos contrarios.
                            </p>
                          </div>
                          <button
                            id="btn-trigger-inline-shield"
                            onClick={handleShield}
                            className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5"
                          >
                            <ShieldCheck size={14} className="text-amber-500" />
                            Aplicar Re-Escritura Forense
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Empty output state */
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <CheckCircle2 size={48} className="text-slate-200 animate-pulse" />
                  <p className="text-sm font-medium text-center max-w-xs">El reporte y el escrito corregido de la auditoría aparecerán aquí una vez ejecutado el análisis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auditor;
