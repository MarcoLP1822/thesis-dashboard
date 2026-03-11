import { useState, useEffect } from 'react';
import { Quote, Download, Tag } from 'lucide-react';
import { getCitations, deleteCitation, Citation } from '../lib/db';
import { formatDate } from '../lib/format';
import { PageLayout } from './ui/PageLayout';
import { SectionHeader } from './ui/SectionHeader';
import { EmptyState } from './ui/EmptyState';
import { DeleteButton } from './ui/DeleteButton';
import { Card } from './ui/Card';

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
    await deleteCitation(id);
    setCitations(prev => prev.filter(c => c.id !== id));
  };

  const filteredCitations = selectedCategory === 'all'
    ? citations
    : citations.filter(c => c.category === selectedCategory);

  const exportCitations = () => {
    if (filteredCitations.length === 0) return;

    let content = "Citazioni Tesi\n\n";

    filteredCitations.forEach(c => {
      content += `"${c.text}"\n`;
      if (c.source) content += `Fonte: ${c.source}\n`;
      if (c.category) content += `Categoria: ${c.category}\n`;
      content += `Data: ${formatDate(c.createdAt)}\n\n`;
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

  return (
    <PageLayout>
      <SectionHeader
        title="Citazioni Salvate"
        description="Gestisci ed esporta le citazioni estratte dai tuoi documenti."
      >
        <button
          onClick={exportCitations}
          disabled={filteredCitations.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Esporta TXT
        </button>
      </SectionHeader>

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
        <EmptyState
          icon={Quote}
          message="Nessuna citazione trovata. Salva le citazioni direttamente dalla Chat."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCitations.map((citation) => (
            <Card key={citation.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Quote className="w-6 h-6 text-indigo-300" />
                <DeleteButton
                  onClick={() => handleDelete(citation.id)}
                  title="Elimina citazione"
                />
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
                  <span>{formatDate(citation.createdAt)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
