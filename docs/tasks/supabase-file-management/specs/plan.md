# Implementation Plan: Supabase File Management + Persistent RAG

**Depth**: Standard
**Architecture**: Full API-First (Option B)
**Data flow**: Component → `db.ts` (fetch wrapper) → `/api/*` (Vercel serverless) → Supabase

---

## Overview

Migrate the thesis dashboard from SQLite + IndexedDB + Express to Supabase + Vercel with Claude Sonnet 4.6 for chat. The frontend never touches Supabase directly — all data flows through Vercel API routes. The `db.ts` abstraction layer keeps the same function signatures but internally calls `fetch('/api/...')`, so components require minimal changes.

---

## Current State

| Layer | Technology | Problem |
|-------|-----------|---------|
| Frontend storage | IndexedDB (idb-keyval) | Browser-local, lost on clear |
| Backend storage | SQLite + sqlite-vss | No persistent filesystem on Vercel |
| Server | Express on port 3000 | Can't run on Vercel (serverless) |
| Chat AI | Gemini 3.1 Pro (client-side) | API key exposed in frontend bundle |
| Embeddings | Gemini text-embedding-004 | Works, keeping it |
| File parsing | PDF only (pdfjs-dist) | No DOCX support |

**Key files**:
- `server.ts` — Express server with 3 API routes + SQLite/VSS logic
- `src/lib/db.ts` — IndexedDB CRUD (files, citations, chat sessions)
- `src/components/Chat.tsx` — RAG chat with Gemini, session management
- `src/components/Library.tsx` — File upload with text extraction
- `src/components/Citations.tsx` — Citation list/delete
- `src/components/Settings.tsx` — Data stats and clear

---

## Desired End State

| Layer | Technology |
|-------|-----------|
| Database | Supabase Postgres + pgvector |
| File storage | Supabase Storage |
| Server | Vercel API routes (serverless functions in `/api`) |
| Chat AI | Claude Sonnet 4.6 + Citations API (server-side) |
| Embeddings | Gemini text-embedding-004 (server-side) |
| File parsing | PDF (pdfjs-dist, client-side) + DOCX (mammoth, client-side) |
| Frontend | Same React + Vite + Tailwind (zero UI changes) |

**Architecture**:
```
┌─────────────────┐     fetch()     ┌──────────────────┐     supabase-js    ┌───────────────┐
│   React App     │ ──────────────> │  Vercel API      │ ─────────────────> │  Supabase     │
│                 │                 │  Routes           │                    │               │
│  Library.tsx    │  /api/files     │  api/files.ts     │  Postgres+pgvector │  files table  │
│  Chat.tsx       │  /api/chat      │  api/chat.ts      │  Storage           │  chunks table │
│  Citations.tsx  │  /api/citations │  api/citations.ts │                    │  chat_sessions│
│  Settings.tsx   │  /api/clear     │  api/clear.ts     │  Gemini embeddings │  citations    │
│                 │                 │                    │  Claude chat       │  storage/     │
│  db.ts          │                 │  lib/supabase.ts   │                    │               │
│  (fetch wrapper)│                 │  (server client)   │                    │               │
└─────────────────┘                 └──────────────────┘                    └───────────────┘
```

---

## Out of Scope

- Authentication / Row-Level Security
- Supabase Edge Functions, Realtime
- Next.js migration
- Data migration from existing SQLite/IndexedDB
- New AI features beyond current RAG
- UI/UX changes
- File versioning

---

## Technical Approach

### Phase 1: Foundation (Infrastructure + Schema)

**Goal**: Supabase project ready, Vercel configured, shared server-side utilities in place.

**1.1 — Supabase Setup**
- Create Supabase project (manual, one-time)
- Enable pgvector extension
- Run migration SQL to create tables: `files`, `chunks`, `chat_sessions` (with `messages jsonb`), `citations`
- Create Storage bucket: `thesis-files` (public: false)
- Save migration as `supabase/migrations/001_initial_schema.sql`

**1.2 — Project Configuration**
- Create `vercel.json` with build command, output directory, and SPA+API rewrites
- Update `package.json`: remove `better-sqlite3`, `sqlite-vss`, `express`, `dotenv`; add `@supabase/supabase-js`, `@anthropic-ai/sdk`, `mammoth`
- Keep `@google/genai` (embeddings only — used server-side in API routes, remove from frontend)
- Keep `pdfjs-dist` (client-side PDF parsing stays)
- Update `.env.example` with new variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- Update `vite.config.ts`: remove Express dev middleware, remove `GEMINI_API_KEY` from define (no longer in frontend)

**1.3 — Server-Side Shared Utilities**
- Create `api/_lib/supabase.ts`: server-side Supabase client (service role key)
- Create `api/_lib/embeddings.ts`: `getEmbedding(text)` using Gemini text-embedding-004
- Create `api/_lib/chunking.ts`: `chunkText(content, maxTokens)` — reuse logic from current `server.ts`
- Create `api/_lib/search.ts`: `searchChunks(query, limit)` — shared search logic used by both `api/search.ts` and `api/chat.ts`

> **Note**: Files in `api/_lib/` are NOT deployed as API routes — they're shared utilities imported by route handlers. Vercel ignores files/folders starting with `_`.
> **Note**: File text extraction (PDF, DOCX, text) stays client-side — pdfjs-dist already works in browser, mammoth also works in browser. Server receives extracted text, not binary files.

---

### Phase 2: API Routes (Backend Logic)

**Goal**: All server-side logic implemented as Vercel serverless functions.

**2.1 — File Management Routes**

`api/files.ts` — Handles GET (list) and POST (upload + process):
```
GET  /api/files → Supabase query files table → return list
POST /api/files → receive { name, type, size, content (pre-extracted text) } →
  1. Upload raw file to Supabase Storage (thesis-files bucket) if binary provided
  2. Chunk text (already extracted client-side)
  3. Generate embeddings per chunk (Gemini)
  4. Insert file metadata + chunks with embeddings into Postgres
  5. Return { id, chunksProcessed }
```

`api/files/[id].ts` — Handles DELETE:
```
DELETE /api/files/:id →
  1. Delete from Supabase Storage
  2. Delete from files table (cascade deletes chunks)
  3. Return { success: true }
```

**2.2 — Search Route**

`api/search.ts` — Vector similarity search:
```
POST /api/search → receive { query, limit } →
  1. Generate query embedding (Gemini)
  2. pgvector cosine similarity: chunks <=> query_embedding
  3. Join with files for source_file name
  4. Return top-N results with content + source + distance
```

**2.3 — Chat Route**

`api/chat.ts` — Claude chat with Citations API:
```
POST /api/chat → receive { message, sessionId, history } →
  1. Import and call searchChunks() from _lib/search.ts for RAG context (no HTTP hop)
  2. Build Claude message with document content blocks (Citations API)
  3. Call Claude Sonnet 4.6 with system prompt + history + context + query
  4. Parse response: extract text + citations
  5. Return { text, citations: [{ quote, source, ... }] }
```

**System prompt**: Reuse existing academic thesis assistant prompt (Italian), adapted for Claude format.

**2.4 — Chat Session Routes**

`api/chat/sessions.ts` — GET (list) and POST (create/update):
```
GET  /api/chat/sessions → query chat_sessions (messages in jsonb column) → return sorted list
POST /api/chat/sessions → upsert session row (id, title, messages jsonb, updated_at) → return session
```

`api/chat/sessions/[id].ts` — DELETE:
```
DELETE /api/chat/sessions/:id → delete from chat_sessions → return success
```

**2.5 — Citation Routes**

`api/citations.ts` — GET and POST:
```
GET  /api/citations → query citations table → return sorted list
POST /api/citations → insert citation → return citation
```

`api/citations/[id].ts` — DELETE:
```
DELETE /api/citations/:id → delete from citations → return success
```

**2.6 — Utility Routes**

`api/clear.ts` — POST clear all data:
```
POST /api/clear → truncate all tables + clear storage bucket → return success
```

---

### Phase 3: Frontend Data Layer (db.ts Rewrite)

**Goal**: Same function signatures, new implementation using `fetch()`.

Rewrite `src/lib/db.ts` — every function becomes a fetch wrapper:

```typescript
// Before (IndexedDB)
export async function getFiles(): Promise<ThesisFile[]> {
  const files = await get<ThesisFile[]>(FILES_KEY);
  return files || [];
}

// After (API-First)
export async function getFiles(): Promise<ThesisFile[]> {
  const res = await fetch('/api/files');
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}
```

**Functions to rewrite** (same signatures):
- `saveFile(file)` → POST `/api/files`
- `getFiles()` → GET `/api/files`
- `deleteFile(id)` → DELETE `/api/files/{id}`
- `saveCitation(citation)` → POST `/api/citations`
- `getCitations()` → GET `/api/citations`
- `deleteCitation(id)` → DELETE `/api/citations/{id}`
- `saveChatSession(session)` → POST `/api/chat/sessions`
- `getChatSessions()` → GET `/api/chat/sessions`
- `deleteChatSession(id)` → DELETE `/api/chat/sessions/{id}`
- `clearAll()` → POST `/api/clear` (replaces individual clear functions)

**Type updates**:
- `ChatMessage.role`: `'model'` → `'assistant'` (Anthropic convention)
- `ThesisFile`: remove `content` field from frontend type (text stays server-side only)
- Add `ThesisFile.storage_path` for Storage reference
- `ChatSession.messages` stays as nested array (jsonb column in DB — same shape as current IndexedDB)

**Remove**: `idb-keyval` import, all IndexedDB key constants

---

### Phase 4: Component Updates

**Goal**: Update components to work with new data layer and API-first chat.

**4.1 — Library.tsx**
- File upload: extract text client-side (PDF: pdfjs-dist, DOCX: mammoth, text: File.text()), then POST { name, type, size, content } to `/api/files`
- Add mammoth import for DOCX extraction (works in browser)
- DOCX files accepted in file input (`accept` attribute)
- Loading/error states stay the same

**4.2 — Chat.tsx** (biggest change)
- Replace direct Gemini API call with POST to `/api/chat`
- Receive structured response with text + citations
- Handle Citations API response: display cited quotes with source attribution
- Session save/load via `db.ts` (which calls API routes)
- Remove `@google/genai` import from frontend
- Update message role: `'model'` → `'assistant'`

**4.3 — Citations.tsx**
- No changes needed — already calls `getCitations()`, `deleteCitation()` from `db.ts`
- Consider: display citations from Claude Citations API differently (exact quotes with page refs)

**4.4 — Settings.tsx**
- Stats: call `getFiles()`, `getCitations()`, `getChatSessions()` and use `.length` (no dedicated stats endpoint needed — data is small)
- Update clear: call single `clearAll()` → POST `/api/clear`

---

### Phase 5: Cleanup + Deploy

**Goal**: Remove old code, verify, deploy.

**5.1 — Delete**
- `server.ts` — entirely replaced
- `thesis.db` — no longer needed
- Remove `idb-keyval` from package.json
- Remove `better-sqlite3`, `sqlite-vss`, `express`, `dotenv` from package.json

**5.2 — Verify**
- All env vars set in Vercel dashboard
- `vercel dev` works locally (API routes + frontend)
- File upload → text extraction → chunking → embedding → storage works end-to-end
- Chat with RAG returns cited responses
- Chat history persists across page reloads
- Citations save/load/delete work
- Settings clear all data works
- File deletion cleans up storage + chunks

**5.3 — Deploy**
- `vercel --prod` or connect Git repo
- Verify all API routes respond
- Upload test file, chat with it, save citation

---

## Critical Files for Implementation

1. **`src/lib/db.ts`** — Core rewrite: IndexedDB → fetch wrapper. Every component depends on this.
2. **`server.ts`** — Reference for current chunking, embedding, and search logic to port to API routes.
3. **`src/components/Chat.tsx`** — Biggest component change: Gemini → Claude, session management via API.
4. **`src/components/Library.tsx`** — File upload flow changes from JSON content to FormData binary.
5. **`api/_lib/supabase.ts`** — New shared server-side Supabase client — all API routes import this.
6. **`api/chat.ts`** — New: Claude Sonnet 4.6 + Citations API integration, most complex API route.
7. **`vite.config.ts`** — Remove Express middleware and frontend API key injection.
