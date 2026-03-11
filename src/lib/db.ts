// Data layer: all CRUD operations via API routes

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

export interface ChatSource {
  file: string;
  page: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

// --- Shared fetch helpers ---

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch ${url}`);
  }
  return res.json();
}

async function apiPost(url: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to post to ${url}`);
  }
}

async function apiDelete(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete ${url}`);
  }
}

// --- Files ---

export async function saveFile(file: ThesisFile): Promise<void> {
  await apiPost('/api/files', {
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    content: file.content,
  });
}

export async function getFiles(): Promise<ThesisFile[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/files');
  return data.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    type: f.type as string,
    size: f.size as number,
    uploadedAt: new Date(f.uploaded_at as string).getTime(),
    storagePath: f.storage_path as string | undefined,
  }));
}

export async function deleteFile(id: string): Promise<void> {
  await apiDelete(`/api/files/${id}`);
}

// --- Citations ---

export async function saveCitation(citation: Citation): Promise<void> {
  await apiPost('/api/citations', {
    id: citation.id,
    text: citation.text,
    source: citation.source,
    category: citation.category,
  });
}

export async function getCitations(): Promise<Citation[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/citations');
  return data.map((c) => ({
    id: c.id as string,
    text: c.text as string,
    source: c.source as string,
    category: c.category as string,
    createdAt: new Date(c.created_at as string).getTime(),
  }));
}

export async function deleteCitation(id: string): Promise<void> {
  await apiDelete(`/api/citations/${id}`);
}

// --- Chats ---

export async function saveChatSession(session: ChatSession): Promise<void> {
  await apiPost('/api/chat/sessions', {
    id: session.id,
    title: session.title,
    messages: session.messages,
  });
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/chat/sessions');
  return data.map((s) => ({
    id: s.id as string,
    title: s.title as string,
    messages: s.messages as ChatMessage[],
    updatedAt: new Date(s.updated_at as string).getTime(),
  }));
}

export async function deleteChatSession(id: string): Promise<void> {
  await apiDelete(`/api/chat/sessions/${id}`);
}

// --- Utility ---

export async function clearAll(): Promise<void> {
  await apiPost('/api/clear', {});
}
