import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Trash2, 
  MoreVertical,
  Tag,
  Clock,
  HardDrive,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Document {
  id: number;
  name: string;
  version: number;
  size: number;
  case_title: string;
  tags: string[];
  created_at: string;
  author_name: string;
}

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  
  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [documentName, setDocumentName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        
        const payload = {
          name: file.name,
          size: file.size,
          content: base64String,
          isBase64: true,
          mimeType: file.type,
          case_id: null
        };

        // 1. Extract text
        const extractRes = await fetch('/api/documents/extract-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        let extractedText = "";
        if (extractRes.ok) {
          const data = await extractRes.json();
          extractedText = data.text;
        }

        // 2. Classify with Gemini via Backend API
        let aiResult = { type: 'Documento General', tags: ['General'] };
        try {
          if (extractedText) {
            const token = localStorage.getItem('token');
            const classifyRes = await fetch('/api/ai/classify-document', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ text: extractedText.substring(0, 3000) })
            });
            if (classifyRes.ok) {
              aiResult = await classifyRes.json();
            }
          }
        } catch (e) {
          console.error("Error classifying document:", e);
        }

        const finalTags = Array.isArray(aiResult.tags) ? aiResult.tags : [];
        if (aiResult.type && !finalTags.includes(aiResult.type)) {
          finalTags.unshift(aiResult.type);
        }

        // 3. Upload
        const uploadPayload = {
          ...payload,
          tags: finalTags,
          type: aiResult.type
        };

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadPayload)
        });

        if (res.ok) {
          await fetchDocuments();
          setIsUploadModalOpen(false);
        } else {
          console.error("Upload failed");
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error uploading document:", err);
      setUploading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!pastedText.trim() || !documentName.trim()) return;
    
    setUploading(true);
    try {
      const payload = {
        name: documentName.endsWith('.txt') ? documentName : `${documentName}.txt`,
        size: new Blob([pastedText]).size,
        content: pastedText,
        isBase64: false,
        mimeType: 'text/plain',
        case_id: null
      };

      // 1. Classify with Gemini via Backend API
      let aiResult = { type: 'Documento General', tags: ['General'] };
      try {
        if (pastedText) {
          const token = localStorage.getItem('token');
          const classifyRes = await fetch('/api/ai/classify-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ text: pastedText.substring(0, 3000) })
          });
          if (classifyRes.ok) {
            aiResult = await classifyRes.json();
          }
        }
      } catch (e) {
        console.error("Error classifying document:", e);
      }

      const finalTags = Array.isArray(aiResult.tags) ? aiResult.tags : [];
      if (aiResult.type && !finalTags.includes(aiResult.type)) {
        finalTags.unshift(aiResult.type);
      }

      // 2. Upload
      const uploadPayload = {
        ...payload,
        tags: finalTags,
        type: aiResult.type
      };

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadPayload)
      });

      if (res.ok) {
        await fetchDocuments();
        setIsUploadModalOpen(false);
        setPastedText('');
        setDocumentName('');
      } else {
        console.error("Upload failed");
      }
    } catch (err) {
      console.error("Error uploading text document:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        const res = await fetch(`/api/documents/${documentToDelete.id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setDocs(docs.filter(d => d.id !== documentToDelete.id));
        }
      } catch (err) {
        console.error("Error deleting document:", err);
      } finally {
        setDocumentToDelete(null);
      }
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const totalSize = docs.reduce((acc, doc) => acc + (doc.size || 0), 0);
  const uniqueTags = new Set(docs.flatMap(doc => doc.tags || [])).size;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión Documental</h1>
          <p className="text-slate-500">Almacenamiento seguro y versionado de archivos legales.</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] text-black font-black rounded-xl shadow-md shadow-[#D4AF37]/20 hover:bg-[#E5C058] transition-all cursor-pointer"
        >
          <Upload size={18} />
          Subir Documento
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".pdf,.doc,.docx"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Total Documentos</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{docs.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Etiquetas Activas</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{uniqueTags}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">Almacenamiento</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatBytes(totalSize)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o etiqueta..." 
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              No se encontraron documentos.
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="group bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/5 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-amber-500">
                    <FileText size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(doc)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 truncate mb-1" title={doc.name}>{doc.name}</h4>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  <span>Versión {doc.version || 1}</span>
                  <span>•</span>
                  <span>{formatBytes(doc.size)}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <HardDrive size={14} className="text-slate-400" />
                    <span className="font-semibold truncate">{doc.case_title || 'Sin asignar'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {doc.tags && doc.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}</span>
                  <span className="truncate max-w-[100px]">{doc.author_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Eliminar Documento</h3>
              </div>
              <button onClick={() => setDocumentToDelete(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                ¿Estás seguro de que deseas eliminar el documento <span className="font-bold text-slate-900">{documentToDelete.name}</span>?
              </p>
              <p className="text-sm text-slate-500">
                Esta acción no se puede deshacer y el archivo será eliminado permanentemente del sistema.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setDocumentToDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Upload size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Subir Documento</h3>
              </div>
              <button onClick={() => !uploading && setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Archivo (PDF/Word)
                </button>
                <button 
                  onClick={() => setUploadMode('text')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${uploadMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Copiar y Pegar
                </button>
              </div>

              {uploadMode === 'file' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center mb-4">
                    Selecciona un archivo PDF o Word. La IA extraerá el texto y lo analizará automáticamente.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-12 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={32} className="animate-spin text-amber-500" />
                        <span className="font-medium text-slate-700">Analizando documento...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-slate-400" />
                        <span className="font-medium">Haz clic para seleccionar archivo</span>
                        <span className="text-xs text-slate-400">Soporta .pdf, .doc, .docx</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Documento</label>
                    <input 
                      type="text" 
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Ej. Contrato_Arrendamiento"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contenido del Documento</label>
                    <textarea 
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Pega aquí el texto del documento..."
                      className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm resize-none"
                      disabled={uploading}
                    />
                  </div>
                  <button 
                    onClick={handleTextUpload}
                    disabled={uploading || !pastedText.trim() || !documentName.trim()}
                    className="w-full py-3 bg-amber-500 text-slate-950 font-bold rounded-xl hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    {uploading ? 'Analizando...' : 'Guardar y Analizar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
