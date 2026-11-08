import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, AlertCircle, FileText, CheckCircle2, BrainCircuit, File as FileIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as mammoth from 'mammoth';

export default function DocumentScanner() {
  const [fileData, setFileData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const isValidImage = file.type.startsWith('image/');
    const isValidPdf = file.type === 'application/pdf';
    const isValidTxt = file.type === 'text/plain' || file.name.endsWith('.txt');
    const isValidDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
    const isValidDoc = file.type === 'application/msword' || file.name.endsWith('.doc');

    if (!isValidImage && !isValidPdf && !isValidTxt && !isValidDocx && !isValidDoc) {
      setError('Por favor sube un archivo válido (PDF, Word, TXT o Imágenes)');
      return;
    }

    setError(null);
    setFileName(file.name);

    if (isValidTxt) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        try {
          const base64Data = btoa(unescape(encodeURIComponent(text)));
          setMimeType('text/plain');
          setFileData(base64Data);
          setResult(null);
        } catch (e) {
          setError('Error al procesar el archivo de texto.');
        }
      };
      reader.readAsText(file);
    } else if (isValidDocx) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const base64Data = btoa(unescape(encodeURIComponent(text)));
          setMimeType('text/plain');
          setFileData(base64Data);
          setResult(null);
        } catch (err) {
          setError('Error al leer el archivo DOCX. Intenta guardarlo como PDF.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (isValidDoc) {
      // Basic extraction for older .doc files
      const reader = new FileReader();
      reader.onloadend = () => {
        const binaryString = reader.result as string;
        // Extract printable characters roughly
        const text = binaryString.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').replace(/\s+/g, ' ');
        try {
          const base64Data = btoa(unescape(encodeURIComponent(text)));
          setMimeType('text/plain');
          setFileData(base64Data);
          setResult(null);
        } catch (e) {
          setError('Error al procesar el archivo DOC.');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // Image or PDF
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setFileData(base64Data);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const analyzeDocument = async () => {
    if (!fileData) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/ocr-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ fileData, mimeType })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al analizar el documento');
      }

      setResult(data.result || 'No se pudo generar un análisis.');
    } catch (err: any) {
      console.error('Error analyzing document:', err);
      setError(err.message || 'Ocurrió un error al analizar el documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escáner OCR y Análisis Forense</h1>
          <p className="text-slate-500">Sube fotos o PDFs de demandas, escritos o evidencias para extraer texto (OCR) y realizar un análisis jurídico.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ImageIcon className="text-amber-500" size={20} />
            Documento o Imagen a Analizar
          </h2>

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging ? 'border-amber-500 bg-amber-100' :
              fileData ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400 bg-slate-50'
            }`}
          >
            {fileData ? (
              <div className="space-y-4">
                {mimeType.startsWith('image/') ? (
                  <img 
                    src={`data:${mimeType};base64,${fileData}`} 
                    alt="Documento subido" 
                    className="max-h-64 mx-auto rounded-lg shadow-sm object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileIcon size={64} className="text-amber-500 mb-4" />
                    <p className="text-sm font-medium text-slate-700">{fileName}</p>
                    <p className="text-xs text-slate-500">
                      {mimeType === 'application/pdf' ? 'Documento PDF' : 
                       mimeType === 'text/plain' ? 'Documento de Texto' : 'Documento'}
                    </p>
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setFileData(null);
                      setResult(null);
                      setFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Cambiar Archivo
                  </button>
                  <button
                    onClick={analyzeDocument}
                    disabled={loading}
                    className="px-5 py-2.5 text-xs font-black text-black bg-[#D4AF37] hover:bg-[#E5C058] rounded-xl shadow-md shadow-[#D4AF37]/20 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin text-black" /> : <CheckCircle2 size={16} />}
                    {loading ? 'Analizando...' : 'Extraer Texto y Analizar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-[#070A0F] rounded-full flex items-center justify-center mx-auto shadow-md border border-[#D4AF37]/40">
                  <Upload className="text-[#D4AF37]" size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">Arrastra tu documento aquí o haz clic en el botón</p>
                  <p className="text-xs text-slate-400 mt-1">Soporta archivos PDF, Word (.docx), TXT e Imágenes de acuerdos</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 text-xs font-black text-black bg-[#D4AF37] hover:bg-[#E5C058] rounded-xl shadow-md shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Upload size={16} />
                  Cargar desde PC / USB
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.doc,.docx,.txt,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full min-h-[400px]">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="text-amber-500" size={20} />
            Resultado OCR y Análisis
          </h2>

          <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                <Loader2 size={32} className="animate-spin text-amber-500" />
                <p className="text-sm font-medium animate-pulse">Tanaka Legal IQ está extrayendo el texto y analizando...</p>
              </div>
            ) : result ? (
              <div className="prose prose-sm prose-amber max-w-none markdown-body">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <BrainCircuit size={48} className="opacity-20" />
                <p className="text-sm text-center max-w-xs">
                  Sube un archivo y haz clic en "Extraer Texto y Analizar" para ver la transcripción y el reporte forense aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
