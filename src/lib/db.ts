// Data layer: all CRUD operations via API routes
// Same function signatures as before — internals changed from IndexedDB to fetch()

export interface ThesisFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string; // Present during upload only, not returned by GET
  uploadedAt: number;
  storagePath?: string;
}

export interface Citation {
  id: string;
  text: string;
  source: string;
  category: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

// --- Files ---

export async function saveFile(file: ThesisFile): Promise<void> {
  const res = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      content: file.content,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save file');
  }
}

export async function getFiles(): Promise<ThesisFile[]> {
  const res = await fetch('/api/files');
  if (!res.ok) throw new Error('Failed to fetch files');
  const data = await res.json();
  return data.map((f: any) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    size: f.size,
    uploadedAt: new Date(f.uploaded_at).getTime(),
    storagePath: f.storage_path,
  }));
}

export async function deleteFile(id: string): Promise<void> {
  const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete file');
  }
}

// --- Citations ---

export async function saveCitation(citation: Citation): Promise<void> {
  const res = await fetch('/api/citations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: citation.id,
      text: citation.text,
      source: citation.source,
      category: citation.category,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save citation');
  }
}

export async function getCitations(): Promise<Citation[]> {
  const res = await fetch('/api/citations');
  if (!res.ok) throw new Error('Failed to fetch citations');
  const data = await res.json();
  return data.map((c: any) => ({
    id: c.id,
    text: c.text,
    source: c.source,
    category: c.category,
    createdAt: new Date(c.created_at).getTime(),
  }));
}

export async function deleteCitation(id: string): Promise<void> {
  const res = await fetch(`/api/citations/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete citation');
  }
}

// --- Chats ---

export async function saveChatSession(session: ChatSession): Promise<void> {
  const res = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: session.id,
      title: session.title,
      messages: session.messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save chat session');
  }
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const res = await fetch('/api/chat/sessions');
  if (!res.ok) throw new Error('Failed to fetch chat sessions');
  const data = await res.json();
  return data.map((s: any) => ({
    id: s.id,
    title: s.title,
    messages: s.messages,
    updatedAt: new Date(s.updated_at).getTime(),
  }));
}

export async function deleteChatSession(id: string): Promise<void> {
  const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete chat session');
  }
}

// --- Utility ---

export async function clearAll(): Promise<void> {
  const res = await fetch('/api/clear', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to clear all data');
  }
}
