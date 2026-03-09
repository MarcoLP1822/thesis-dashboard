# Task Context: Supabase File Management + Persistent RAG

**Feature**: Migrate from SQLite + IndexedDB + Express to Supabase + Vercel with Claude chat
**Scope doc**: `concepts/scope.md`

---

## Architecture Patterns (Current)

### Data Layer
- **Single abstraction file**: `src/lib/db.ts` — all CRUD via `save*()`, `get*()`, `delete*()`, `clear*()`
- **Types co-located** with data functions in `db.ts` (ThesisFile, Citation, ChatMessage, ChatSession)
- **Fetch-modify-write pattern**: always reads full array, modifies, writes back
- **Component-level state**: `useState` hooks, no global store. Components reload full data after mutations

### API Calls
- Simple `fetch()` with JSON body, `.ok` check, try-catch
- Fire-and-forget for non-critical ops (server sync on file upload)
- Error messages saved as chat messages (no toast/notification system)

### File Upload Flow
1. Extract text client-side (PDF via pdfjs-dist, text via File.text())
2. Save to IndexedDB immediately (local-first)
3. POST to `/api/files` for server-side chunking + embedding (best-effort)
4. Sequential file processing, individual errors don't block others

### Chat Flow
1. Optimistic UI update → clear input → set loading
2. Load files from IndexedDB for context
3. POST `/api/search` for RAG vector search
4. Call Gemini API directly from frontend
5. Save session to IndexedDB
6. Reload all sessions

### Key Conventions
- Named exports (no default exports)
- Relative imports (path alias `@/*` defined but unused)
- Italian UI text (`"Analisi dei documenti in corso..."`)
- `cn()` utility for Tailwind class merging
- Loading states: boolean `useState` + Tailwind animate classes

---

## Dependencies & Touchpoints

### Files to modify/replace
| File | Action | Lines |
|------|--------|-------|
| `server.ts` | Delete (replaced by Vercel API routes) | 193 lines |
| `src/lib/db.ts` | Rewrite (IndexedDB → Supabase client) | 102 lines |
| `src/components/Chat.tsx` | Update API calls + session management | ~350 lines |
| `src/components/Library.tsx` | Update upload flow | ~262 lines |
| `src/components/Citations.tsx` | Update storage calls | ~120 lines |
| `src/components/Settings.tsx` | Update clear/stats calls | ~80 lines |
| `vite.config.ts` | Remove Express middleware, update env | 24 lines |
| `package.json` | Swap dependencies | - |

### New files
| File | Purpose |
|------|---------|
| `api/files.ts` | Upload processing + embedding generation |
| `api/files/[id].ts` | File deletion |
| `api/search.ts` | Vector similarity search |
| `api/chat.ts` | Claude chat with Citations API |
| `src/lib/supabase.ts` | Supabase client init |
| `vercel.json` | Deployment config |
| `.env.example` | Updated env vars |

---

## Implementation Approaches

### Vercel API Routes (Vite, NOT Next.js)
Files in `/api` directory become serverless functions automatically. Handler signature:

```typescript
// api/search.ts
export default async function handler(req: Request): Promise<Response> {
  const { query, limit } = await req.json();
  // ... logic
  return Response.json({ results });
}
```

**vercel.json** for SPA + API coexistence:
```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### Supabase Client Setup
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

Server-side (API routes) uses service role key:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### pgvector Similarity Search
```sql
-- Store embedding
INSERT INTO chunks (id, file_id, content, chunk_index, embedding)
VALUES ($1, $2, $3, $4, $5::vector);

-- Query (cosine distance)
SELECT c.content, f.name as source_file, c.embedding <=> $1::vector as distance
FROM chunks c JOIN files f ON c.file_id = f.id
ORDER BY distance ASC
LIMIT 5;
```

### Anthropic Citations API
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      // Pass RAG chunks as document sources
      {
        type: 'document',
        source: { type: 'text', media_type: 'text/plain', data: chunkContent },
        title: sourceFileName,
        context: `Chunk from ${sourceFileName}`
      },
      // ... more document chunks
      { type: 'text', text: userQuery }
    ]
  }]
});

// Response includes citations with exact source references
```

### DOCX Parsing
Use `mammoth` (lightweight, no native deps, works in serverless):
```typescript
import mammoth from 'mammoth';

const result = await mammoth.extractRawText({ buffer });
const text = result.value;
```

### Gemini Embeddings (kept)
```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getEmbedding(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'text-embedding-004',
    contents: text,
  });
  return result.embeddings[0].values;
}
```

---

## Impact Summary

### What changes
- **Storage layer**: IndexedDB + SQLite → Supabase (single source of truth)
- **Server**: Express → Vercel serverless API routes
- **Chat AI**: Gemini → Claude Sonnet 4.6 with Citations API
- **File parsing**: Add DOCX support via mammoth
- **Deployment**: AI Studio → Vercel

### What stays the same
- React + Vite + Tailwind frontend
- Component structure and UI
- Embedding model (Gemini text-embedding-004)
- RAG flow (search → context → AI response)
- Data layer abstraction pattern (`db.ts` functions)
- Italian UI language

### Architecture shift
- **Before**: Local-first (IndexedDB primary, server sync optional)
- **After**: Server-first (Supabase primary, no local cache needed)
- `db.ts` keeps same function signatures but calls Supabase instead of IndexedDB
- Components don't need to change their calling patterns

---

## External Research

### Best practices
- Supabase + pgvector: Use `ivfflat` index for <100K vectors, `hnsw` for larger datasets
- Vercel serverless: 10s timeout on free tier; embedding large files may need chunked processing
- mammoth.js: Best DOCX parser for serverless (no native deps, small bundle)
- Anthropic Citations API: Pass documents as content blocks, get citations in response

### Common pitfalls
- Vercel API routes with Vite need explicit `rewrites` in vercel.json (SPA catch-all must exclude `/api/`)
- Supabase pgvector requires `create extension vector` before creating tables
- Large file uploads to Supabase Storage: use client-side upload with signed URLs, not through API route
- Gemini API key must NOT be in frontend bundle on Vercel (currently exposed via Vite define)

---

## Selected Architecture: Full API-First (Option B)

**Strategy**: All data flows through Vercel API routes. Frontend never touches Supabase directly.

**Data flow**: Component → `db.ts` (fetch wrapper) → `/api/*` → Supabase

### Why API-First
- **Clean Architecture**: Frontend knows nothing about Supabase — only API endpoints
- **Security**: Zero credentials in frontend bundle. No Supabase URL, no anon key, no API keys
- **DRY**: Single data access pattern (fetch → API → DB). No mixing of Supabase client + API calls
- **Production Ready**: Standard pattern for Vercel apps. Easy to add auth/RLS later if needed
- **Testable**: API routes are independently testable. Frontend testable with mock fetch

### Architecture layers
1. **Frontend** (`src/lib/db.ts`): Same function signatures, internally calls `fetch('/api/...')`
2. **API Routes** (`api/*.ts`): Vercel serverless functions — all business logic, Supabase access, AI calls
3. **Database** (Supabase): Postgres + pgvector + Storage — never accessed from frontend

### API Routes needed
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/files` | GET | List all files |
| `/api/files` | POST | Process pre-extracted text (chunk, embed, store) |
| `/api/files/[id]` | DELETE | Delete file + cleanup chunks/embeddings |
| `/api/search` | POST | Vector similarity search (thin wrapper on `_lib/search.ts`) |
| `/api/chat` | POST | Claude chat with Citations API (imports search logic directly) |
| `/api/chat/sessions` | GET | List chat sessions (messages in jsonb column) |
| `/api/chat/sessions` | POST | Create/update chat session (upsert with jsonb messages) |
| `/api/chat/sessions/[id]` | DELETE | Delete chat session |
| `/api/citations` | GET | List citations |
| `/api/citations` | POST | Save citation |
| `/api/citations/[id]` | DELETE | Delete citation |
| `/api/clear` | POST | Clear all data |

### Shared server utilities (`api/_lib/`)
| File | Purpose |
|------|---------|
| `supabase.ts` | Server-side Supabase client (service role key) |
| `embeddings.ts` | `getEmbedding(text)` via Gemini text-embedding-004 |
| `chunking.ts` | `chunkText(content, maxTokens)` — paragraph-based splitting |
| `search.ts` | `searchChunks(query, limit)` — imported by both `api/search.ts` and `api/chat.ts` |

### Simplifications applied (from plan review)
- **S1**: Search logic in shared `_lib/search.ts`, imported directly by chat route (no HTTP hop between serverless functions)
- **S2**: Text extraction stays client-side (pdfjs-dist + mammoth work in browser; avoids serverless WebAssembly pain)
- **S3**: Chat messages as jsonb column in `chat_sessions` (no separate `chat_messages` table — same shape as current IndexedDB)
- **S4**: No vector index (exact search is fast enough for <5K chunks at this scale)
- **S5**: No `/api/stats` route (Settings.tsx uses existing `getFiles().length` etc.)

### Environment variables (simplified)
| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | Vercel env only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env only | DB access from API routes |
| `ANTHROPIC_API_KEY` | Vercel env only | Claude chat + citations |
| `GEMINI_API_KEY` | Vercel env only | Embeddings |

**Note**: NO `VITE_*` env vars needed. Frontend has zero external credentials.

### Development guidelines (user-specified)
All implementation must follow these principles:
- **DRY Compliant**: Reuse existing code, no duplication
- **Best Practices**: Follow web dev and software engineering standards
- **Critical & Accurate**: Evaluate every change critically, no quick & dirty
- **Production Ready**: Not a prototype
- **Backward Compatible**: Zero breaking changes to existing features
- **Clean Architecture**: Separation of concerns, readable, maintainable
- **State of the Art**: Modern, consolidated patterns
- **Solve, don't workaround**: Fix problems properly, only constraint is don't break the app
