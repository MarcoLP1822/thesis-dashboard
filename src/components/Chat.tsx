import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Trash2, Plus, MessageSquare, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { saveChatSession, getChatSessions, deleteChatSession, ChatSession, ChatMessage, saveCitation } from '../lib/db';
import { cn } from '../lib/utils';

export function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sessionsReady, setSessionsReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const loaded = await getChatSessions();
    setSessions(loaded);
    if (loaded.length > 0 && !currentSessionId) {
      setCurrentSessionId(loaded[0].id);
    }
    setSessionsReady(true);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
    };

    let sessionToUpdate = currentSession;
    
    if (!sessionToUpdate) {
      sessionToUpdate = {
        id: crypto.randomUUID(),
        title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [userMessage],
        updatedAt: Date.now(),
      };
      setCurrentSessionId(sessionToUpdate.id);
    } else {
      sessionToUpdate = {
        ...sessionToUpdate,
        messages: [...sessionToUpdate.messages, userMessage],
        updatedAt: Date.now(),
      };
    }

    // Optimistic update
    setSessions(prev => {
      const index = prev.findIndex(s => s.id === sessionToUpdate!.id);
      if (index >= 0) {
        const newSessions = [...prev];
        newSessions[index] = sessionToUpdate!;
        return newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [sessionToUpdate!, ...prev];
    });

    setInput('');
    setIsLoading(true);

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId: sessionToUpdate.id,
          history: sessionToUpdate.messages.slice(0, -1).map(m => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!chatRes.ok) throw new Error('Chat request failed');

      const reader = chatRes.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              fullText += data.text;
              setStreamingText(fullText);
            }
          } catch { /* ignore malformed chunks */ }
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: fullText || 'Nessuna risposta generata.',
      };

      const finalSession = {
        ...sessionToUpdate,
        messages: [...sessionToUpdate.messages, assistantMessage],
        updatedAt: Date.now(),
      };

      setSessions(prev => {
        const idx = prev.findIndex(s => s.id === finalSession.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = finalSession;
          return updated.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [finalSession, ...prev];
      });
      setStreamingText('');

      await saveChatSession(finalSession);
      
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Si è verificato un errore durante la generazione della risposta. Riprova.',
      };
      
      const errorSession = {
        ...sessionToUpdate,
        messages: [...sessionToUpdate.messages, errorMessage],
        updatedAt: Date.now(),
      };
      
      await saveChatSession(errorSession);
      await loadSessions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Using a custom modal or just deleting directly since window.confirm can be problematic in iframes
    await deleteChatSession(id);
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
    await loadSessions();
  };

  const handleSaveCitation = async (text: string) => {
    const category = prompt('Inserisci una categoria per questa citazione (es. "Introduzione", "Metodologia"):') || 'Generale';
    
    await saveCitation({
      id: crypto.randomUUID(),
      text: text,
      source: 'Chat con Claude',
      category: category,
      createdAt: Date.now()
    });
    
    alert('Citazione salvata con successo!');
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar History */}
      <div className="w-64 border-r border-zinc-200 bg-zinc-50 hidden md:flex md:flex-col">
        <div className="h-16 border-b border-zinc-200 flex items-center px-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white border border-zinc-200 hover:border-indigo-500 hover:text-indigo-600 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuova Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors",
                currentSessionId === session.id
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className={cn("w-4 h-4 shrink-0", currentSessionId === session.id ? "text-indigo-500" : "text-zinc-400")} />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {currentSession ? currentSession.title : 'Nuova Conversazione'}
            </h2>
            <p className="text-xs text-zinc-500">Chatta con i tuoi documenti</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
          {!sessionsReady ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-indigo-200">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900">Come posso aiutarti con la tesi oggi?</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Carica i tuoi documenti nella Libreria, poi chiedimi di riassumerli, trovare citazioni specifiche, o aiutarti a strutturare i capitoli.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      message.role === 'user' 
                        ? "bg-indigo-600 text-white" 
                        : "bg-white border border-zinc-200 text-indigo-600"
                    )}
                  >
                    {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={cn(
                        "rounded-2xl p-5 shadow-sm",
                        message.role === 'user'
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm"
                      )}
                    >
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-zinc prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {message.role === 'assistant' && (
                      <div className="flex justify-start">
                        <button
                          onClick={() => handleSaveCitation(message.text)}
                          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Salva come citazione
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 flex-row">
                  <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm p-5 shadow-sm max-w-[80%]">
                    {streamingText ? (
                      <div className="prose prose-sm max-w-none prose-zinc prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                        <ReactMarkdown>{streamingText}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-sm font-medium animate-pulse">Analisi dei documenti in corso...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-zinc-200">
          <div className="max-w-4xl mx-auto relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi un riassunto, una citazione o un consiglio per la tesi..."
              className="w-full max-h-48 min-h-14 bg-zinc-50 border border-zinc-200 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none transition-all text-zinc-900 placeholder:text-zinc-400 shadow-sm"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="text-center mt-3">
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">
              Claude può commettere errori. Verifica sempre le citazioni importanti.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
