import { useState, useEffect } from 'react';
import { Save, Trash2, Database, Key, Cpu } from 'lucide-react';
import { getFiles, getCitations, getChatSessions, clearAll } from '../lib/db';

export function Settings() {
  const [fileCount, setFileCount] = useState(0);
  const [citationCount, setCitationCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const files = await getFiles();
    const citations = await getCitations();
    const chats = await getChatSessions();
    setFileCount(files.length);
    setCitationCount(citations.length);
    setChatCount(chats.length);
  };

  const handleClearData = async () => {
    await clearAll();
    await loadStats();
    alert('Tutti i dati sono stati eliminati.');
  };

  return (
    <div className="flex-1 h-full bg-zinc-50 p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Impostazioni</h2>
          <p className="text-zinc-500 mt-2">Gestisci le preferenze della tua dashboard per la tesi.</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              Modello AI
            </h3>
            <p className="text-sm text-zinc-500 mt-1">Il modello utilizzato per l'analisi dei documenti.</p>
          </div>
          <div className="p-6 bg-zinc-50/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">Claude Sonnet 4.6</p>
                <p className="text-sm text-zinc-500">Modello avanzato per l'analisi e la scrittura accademica.</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">Attivo</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" />
              API Key
            </h3>
            <p className="text-sm text-zinc-500 mt-1">Le chiavi API sono gestite tramite le variabili d'ambiente di Vercel.</p>
          </div>
          <div className="p-6 bg-zinc-50/50">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-zinc-100 border border-zinc-200 rounded-lg px-4 py-2.5 text-sm text-zinc-500 font-mono truncate">
                ****************************************
              </div>
              <button disabled className="px-4 py-2.5 bg-zinc-200 text-zinc-500 rounded-lg text-sm font-medium cursor-not-allowed">
                Gestita
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-red-100 bg-red-50/30">
            <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <Database className="w-5 h-5 text-red-500" />
              Gestione Dati
            </h3>
            <p className="text-sm text-red-600/80 mt-1">Gestisci i dati salvati.</p>
          </div>
          <div className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900">Dati salvati</p>
                <p className="text-sm text-zinc-500">
                  Hai {fileCount} file, {citationCount} citazioni e {chatCount} chat salvate.
                </p>
              </div>
              <button
                onClick={handleClearData}
                disabled={fileCount === 0 && citationCount === 0 && chatCount === 0}
                className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Elimina tutti i dati
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
