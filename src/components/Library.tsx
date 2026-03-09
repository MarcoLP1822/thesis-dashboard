import { useState, useCallback, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, File as FileIcon, BookOpen, Search, Filter } from 'lucide-react';
import { saveFile, getFiles, deleteFile, ThesisFile } from '../lib/db';
import { extractTextFromPDF } from '../lib/pdf-parser';
import mammoth from 'mammoth';
import { cn } from '../lib/utils';

export function Library() {
  const [files, setFiles] = useState<ThesisFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const loadedFiles = await getFiles();
    setFiles(loadedFiles);
  };

  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      let content = '';

      try {
        if (file.type === 'application/pdf') {
          content = await extractTextFromPDF(file);
        } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
        } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
          content = await file.text();
        } else {
          alert(`Tipo di file non supportato: ${file.name}. Carica PDF, DOCX o file di testo.`);
          continue;
        }

        const newFile: ThesisFile = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          content,
          uploadedAt: Date.now(),
        };

        await saveFile(newFile);
        
      } catch (error) {
        console.error('Error processing file', file.name, error);
        alert(`Errore durante l'elaborazione di ${file.name}`);
      }
    }

    await loadFiles();
    setIsUploading(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    await loadFiles();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || (
      filterType === 'pdf' ? file.type === 'application/pdf' :
      filterType === 'text' ? (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json')) : true
    );
    
    let matchesDate = true;
    if (filterDate !== 'all') {
      const now = Date.now();
      const diff = now - file.uploadedAt;
      const days = diff / (1000 * 60 * 60 * 24);
      if (filterDate === 'today') matchesDate = days <= 1;
      else if (filterDate === 'week') matchesDate = days <= 7;
      else if (filterDate === 'month') matchesDate = days <= 30;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="flex-1 h-full bg-zinc-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Libreria Documenti</h2>
          <p className="text-zinc-500 mt-2">Carica i PDF, articoli e appunti per la tua tesi. Claude li leggerà per aiutarti.</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200",
            isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-zinc-300 bg-white hover:border-zinc-400",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-medium text-zinc-900">Trascina i tuoi file qui</p>
              <p className="text-sm text-zinc-500 mt-1">Supporta PDF, DOCX, TXT, MD, CSV</p>
            </div>
            <label className="mt-4 inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm">
              <span>Seleziona File</span>
              <input
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.txt,.md,.csv,.json,.docx"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={isUploading}
              />
            </label>
            {isUploading && <p className="text-sm text-indigo-600 font-medium animate-pulse mt-4">Elaborazione file in corso...</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-400" />
              File Caricati ({filteredFiles.length})
            </h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cerca file..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">Tutti i tipi</option>
                    <option value="pdf">PDF</option>
                    <option value="text">Testo</option>
                  </select>
                </div>
                
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="all">Qualsiasi data</option>
                  <option value="today">Oggi</option>
                  <option value="week">Ultimi 7 giorni</option>
                  <option value="month">Ultimi 30 giorni</option>
                </select>
              </div>
            </div>
          </div>
          
          {filteredFiles.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
              <FileIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">
                {files.length === 0 
                  ? "Nessun file caricato. Inizia aggiungendo del materiale per la tua tesi." 
                  : "Nessun file corrisponde ai criteri di ricerca."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Elimina file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-medium text-zinc-900 truncate" title={file.name}>{file.name}</h4>
                  <div className="mt-auto pt-4 flex items-center justify-between text-xs text-zinc-500">
                    <span>{formatSize(file.size)}</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
