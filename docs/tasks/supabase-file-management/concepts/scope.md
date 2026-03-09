# Scope: Supabase File Management + Persistent RAG

**Date**: 2026-03-09
**Status**: Draft
**Complexity**: M (Medium)

---

## The Problem

The thesis dashboard currently uses SQLite + IndexedDB for storage. This breaks on Vercel (serverless = no persistent filesystem) and data is lost when the app restarts. The user needs a single, persistent backend that works with Vercel deployment.

**Current pain**:
- Files disappear on app restart (SQLite DB wiped)
- Dual storage (IndexedDB + SQLite) creates fragility
- Express server can't run on Vercel
- No DOCX support

---

## Target User

Single user (the thesis author). No multi-tenancy, no auth.

---

## Success Criteria

- Files persist across deploys and browser sessions
- RAG chat works identically to current behavior (find info, clarify doubts, find citations)
- Chat history persists across sessions and devices
- PDF, DOCX, and text files all supported
- Deploys to Vercel with zero manual steps after initial setup
- Free tier covers all usage (10-100 files, single user)

---

## User Experience

No UX changes. The app should look and behave exactly the same — upload files, chat with them, save citations. The migration is invisible to the user.

**Key flows (unchanged)**:
1. Upload file → text extracted → chunked → embedded → searchable
2. Ask question → vector search → RAG context → AI response
3. Save citation from AI response → persisted
4. Browse chat history → resume previous conversations

---

## Scope Boundaries

### IN

| Item | Details |
|------|---------|
| **Supabase Postgres + pgvector** | Replace SQLite for files metadata, chunks, embeddings, citations, chat sessions |
| **Supabase Storage** | Store raw uploaded files (PDF, DOCX, TXT, MD, CSV, JSON) |
| **Vercel API routes** | Replace Express server with serverless functions |
| **DOCX text extraction** | New file type support (mammoth or similar) |
| **Chat history in DB** | Move from IndexedDB to Supabase Postgres |
| **Citations in DB** | Move from IndexedDB to Supabase Postgres |
| **Claude Sonnet 4.6 for chat** | Replace Gemini chat with `claude-sonnet-4-6` via `@anthropic-ai/sdk` |
| **Anthropic Citations API** | Return exact source quotes with document references — perfect for thesis citations |
| **Keep Gemini for embeddings only** | `text-embedding-004` stays — Anthropic has no embedding model, simplest path |
| **Keep Vite + React** | No framework migration — just add API routes for Vercel |

### OUT

| Item | Reason |
|------|--------|
| Authentication / RLS | Single user, no need |
| Supabase Edge Functions | Use Vercel API routes instead |
| Supabase Realtime | No live collaboration needed |
| Next.js migration | Keep Vite + React, add `vercel.json` for API routes |
| Migration tooling | Fresh start, re-upload files |
| New AI features | Improve RAG later, just swap storage now |
| File versioning | Not needed for thesis workflow |

### MAYBE / FUTURE

| Item | Notes |
|------|-------|
| Full-text search | Postgres has it built-in, easy to add alongside vector search |
| Better chunking | Semantic chunking, overlapping windows — optimize later |
| Drop Gemini entirely | If Anthropic or Voyage AI release embeddings, consolidate to one provider |

---

## Constraints

- **Supabase free tier**: 500MB database, 1GB storage, 50MB max file size — sufficient for 10-100 thesis files
- **Vercel free tier**: 10s serverless function timeout — embedding generation must stay within this (or use background functions)
- **Embedding dimension**: 768 (text-embedding-004) — pgvector handles this natively
- **No framework change**: Stay on Vite + React, avoid Next.js migration complexity

---

## Integration & Touchpoints

### Files to rewrite

| File | What changes |
|------|-------------|
| `server.ts` | **Delete entirely** — replaced by Vercel API routes |
| `src/lib/db.ts` | **Rewrite** — IndexedDB functions → Supabase client calls |
| `src/components/Library.tsx` | Update file upload to use Supabase Storage + API |
| `src/components/Chat.tsx` | Update to use Supabase for sessions + API for search |
| `src/components/Citations.tsx` | Update storage calls to Supabase |
| `src/components/Settings.tsx` | Update clear/stats to Supabase |
| `vite.config.ts` | Remove Express dev middleware, update env vars |
| `package.json` | Remove `better-sqlite3`, `sqlite-vss`, `express`, `idb-keyval`, `@google/genai`; add `@supabase/supabase-js`, `@anthropic-ai/sdk` |

### New files

| File | Purpose |
|------|---------|
| `api/files.ts` | Vercel serverless: upload processing, embedding generation |
| `api/files/[id].ts` | Vercel serverless: file deletion |
| `api/search.ts` | Vercel serverless: vector similarity search |
| `api/chat.ts` | Vercel serverless: Claude chat with Citations API |
| `src/lib/supabase.ts` | Supabase client initialization |
| `vercel.json` | Deployment configuration |
| `supabase/migrations/*.sql` | Database schema (pgvector tables) |

### Supabase schema (target)

```sql
-- Enable pgvector
create extension if not exists vector;

-- Files metadata
create table files (
  id text primary key,
  name text not null,
  type text not null,
  size integer not null,
  storage_path text,
  uploaded_at timestamptz default now()
);

-- Text chunks with embeddings
create table chunks (
  id text primary key,
  file_id text references files(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  embedding vector(768)
);

-- Chat sessions (messages stored as jsonb array — same shape as current IndexedDB)
create table chat_sessions (
  id text primary key,
  title text not null,
  messages jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- Citations
create table citations (
  id text primary key,
  text text not null,
  source text,
  category text,
  created_at timestamptz default now()
);

-- No vector index needed at this scale (<5K chunks). pgvector exact search is fast enough.
-- Add ivfflat or hnsw index later if query latency becomes an issue.
```

### Environment variables (new)

| Variable | Where |
|----------|-------|
| `SUPABASE_URL` | Vercel API routes only |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel API routes only |
| `ANTHROPIC_API_KEY` | Vercel API routes only (chat + citations) |
| `GEMINI_API_KEY` | Vercel API routes only (embeddings) |

**Note**: Zero frontend env vars. All credentials server-side only (API-First architecture).

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase over raw Postgres | Free tier, managed pgvector, Storage included, zero ops |
| pgvector over separate vector DB | Same database, no extra service, simple queries |
| Vercel API routes over Edge Functions | Co-located with frontend, simpler deploy |
| Keep Vite (no Next.js) | Avoid framework migration, `vercel.json` handles routing |
| Chat messages as jsonb column | Same shape as current IndexedDB, simpler queries, no joins needed for single-user scale |
| Fresh start (no migration) | 10-100 files, re-upload is faster than building migration tooling |
| Claude Sonnet 4.6 for chat | Best quality/speed/cost balance for single-user thesis tool |
| Anthropic Citations API | Returns exact source quotes with document refs — native citation support |
| Keep Gemini for embeddings only | Anthropic has no embedding model; Gemini text-embedding-004 is free and already integrated |
| Move all API keys server-side only | Security — don't expose in frontend bundle |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Vercel 10s timeout for embedding large files | Chunk processing: embed in batches, or use Vercel Pro for 60s |
| Supabase free tier limits | 500MB DB + 1GB storage is plenty for 100 files |
| sqlite-vss → pgvector query differences | pgvector syntax is simpler, well-documented |
| DOCX parsing in serverless | Use `mammoth` (lightweight, no native deps) |

---

## Next Steps

1. **`/spectre:plan`** — Create detailed implementation plan with task ordering
2. **`/spectre:create_tasks`** — Break into executable development tasks
