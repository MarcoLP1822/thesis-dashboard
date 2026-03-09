import { useState, useEffect } from 'react';
import { Quote, Trash2, Download, Tag } from 'lucide-react';
import { getCitations, deleteCitation, Citation } from '../lib/db';

export function Citations() {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadCitations();
  }, []);

  const loadCitations = async () => {
    const loaded = await getCitations();
    setCitations(loaded.sort((a, b) => b.createdAt - a.createdAt));
    
    const uniqueCategories = Array.from(new Set(loaded.map(c => c.category).filter(Boolean)));
    setCategories(uniqueCategories);
  };

  const handleDelete = async (id: string) => {
    // window.confirm can be blocked in iframes, so we delete directly
    await deleteCitation(id);
    await loadCitations();
  };

  const exportCitations = () => {
    if (citations.length === 0) return;
    
    let content = "Citazioni Tesi\n\n";
    
    const filtered = selectedCategory === 'all' 
      ? citations 
      : citations.filter(c => c.category === selectedCategory);

    filtered.forEach(c => {
      content += `"${c.text}"\n`;
      if (c.source) content += `Fonte: ${c.source}\n`;
      if (c.category) content += `Categoria: ${c.category}\n`;
      content += `Data: ${new Date(c.createdAt).toLocaleDateString()}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `citazioni_tesi_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredCitations = selectedCategory === 'all' 
    ? citations 
    : citations.filter(c => c.category === selectedCategory);

  return (
    <div className="flex-1 h-full bg-zinc-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Citazioni Salvate</h2>
            <p className="text-zinc-500 mt-2">Gestisci ed esporta le citazioni estratte dai tuoi documenti.</p>
          </div>
          <button
            onClick={exportCitations}
            disabled={filteredCitations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Esporta TXT
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-zinc-800 text-white' 
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Tutte
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredCitations.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-zinc-200">
            <Quote className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">Nessuna citazione trovata. Salva le citazioni direttamente dalla Chat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCitations.map((citation) => (
              <div key={citation.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <Quote className="w-6 h-6 text-indigo-300" />
                  <button
                    onClick={() => handleDelete(citation.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Elimina citazione"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <blockquote className="text-zinc-800 italic mb-4 flex-1">
                  "{citation.text}"
                </blockquote>
                <div className="mt-auto pt-4 border-t border-zinc-100 flex flex-col gap-2">
                  {citation.source && (
                    <div className="text-sm font-medium text-zinc-700">
                      Fonte: <span className="text-zinc-500 font-normal">{citation.source}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    {citation.category ? (
                      <span className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-md">
                        <Tag className="w-3 h-3" />
                        {citation.category}
                      </span>
                    ) : (
                      <span>Senza categoria</span>
                    )}
                    <span>{new Date(citation.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
