# Audit Linee Guida di Sviluppo — Thesis Dashboard

> Data: 2026-03-09
> Stato: Post-refactoring DRY

---

## Riepilogo Scorecard

| Principio | Voto | Status | Note |
|---|---|---|---|
| **DRY Compliant** | 8/10 | RISOLTO | Refactoring completato. Residui minori in Chat.tsx |
| **Best Practices** | 4/10 | DA FARE | `alert()`/`prompt()`, nessun test, nessun custom hook |
| **Critici e Accurati** | 5/10 | DA FARE | Mancano error boundary, strict mode TS |
| **Production Ready** | 2/10 | CRITICO | Nessuna autenticazione API, nessun rate limiting |
| **Backward Compatible** | 9/10 | OK | Nessun breaking change rilevato |
| **Clean Architecture** | 5/10 | PARZIALE | Chat.tsx è ancora un god component (327 righe) |
| **State of the Art** | 5/10 | DA FARE | Stack moderno, ma manca state management e toast |
| **Risolvere non aggirare** | 5/10 | DA FARE | `alert()`/`prompt()` sono workaround, non soluzioni |

**Voto complessivo: 5.4/10** (precedente: 4.4/10, migliorato +1.0 dopo refactoring DRY)

---

## 1. DRY Compliant — 8/10 RISOLTO

### Cosa è stato fatto

#### Backend: `api/_lib/handler.ts` (nuovo)
- `createHandler()` — elimina il boilerplate di method routing ripetuto in 9 file API
- `withErrorHandler()` — elimina 13 blocchi try-catch identici
- `extractId()` — elimina 3 occorrenze di URL parsing duplicato

**Tutti i 9 file API** (`files.ts`, `files/[id].ts`, `citations.ts`, `citations/[id].ts`, `chat/sessions.ts`, `chat/sessions/[id].ts`, `chat.ts`, `search.ts`, `clear.ts`) sono stati refactorati per usare queste utility.

#### Frontend Data Layer: `src/lib/db.ts`
- Creati `apiGet<T>()`, `apiPost()`, `apiDelete()` — elimina 7 blocchi di error handling duplicati
- Eliminati tutti i tipi `any` — ora usa `Record<string, unknown>` con cast espliciti

#### Frontend Formatting: `src/lib/format.ts` (nuovo)
- `formatDate()` — sostituisce 3+ occorrenze di `new Date(x).toLocaleDateString()` inline
- `formatFileSize()` — estratto da `Library.tsx` dove era definito localmente

#### Frontend UI Components: `src/components/ui/` (nuova directory)
| Componente | Sostituisce |
|---|---|
| `EmptyState.tsx` | 3 blocchi empty state identici (Library, Citations, Chat) |
| `DeleteButton.tsx` | 3 bottoni delete con stessa classe CSS (Library, Citations, Chat) |
| `Card.tsx` | 2+ card con hover shadow identiche (Library, Citations) |
| `SectionHeader.tsx` | 3 header h2+descrizione identici (Library, Citations, Settings) |
| `PageLayout.tsx` | 3 wrapper pagina identici (Library, Citations, Settings) |

#### Bug fix
- **Citations.tsx**: la logica di filtro per categoria era calcolata 2 volte (righe 33-35 E 55-57). Ora calcolata una sola volta come `filteredCitations` e riusata in `exportCitations()`.

### Residui DRY minori (non bloccanti)

| Residuo | File | Note |
|---|---|---|
| `fetch('/api/chat', ...)` diretto in componente | `Chat.tsx:83-95` | Bypassa l'astrazione di `db.ts`. Giustificato dalla complessità della request (history, optimistic update), ma idealmente andrebbe in un service dedicato |
| Delete button della chat sidebar | `Chat.tsx:196-201` | Usa classi leggermente diverse (dimensione 3.5 vs 4) rispetto a `DeleteButton`, non unificabile senza over-engineering |

---

## 2. Best Practices — 4/10 DA FARE

### Problemi aperti

| Problema | File | Righe | Severità |
|---|---|---|---|
| `alert()` usato per notifiche | `Chat.tsx:164`, `Library.tsx:51,68`, `Settings.tsx:28` | 4 occorrenze | ALTA |
| `prompt()` usato per input | `Chat.tsx:154` | 1 occorrenza | ALTA |
| `console.error` in codice frontend | `Chat.tsx:116`, `Library.tsx:67`, `pdf-parser.ts:25` | 3 occorrenze | MEDIA |
| `any` type residuo | `pdf-parser.ts:18` | `item: any` nel map di PDF.js | MEDIA |
| TypeScript strict mode non attivo | `tsconfig.json` | Manca `"strict": true` | MEDIA |
| Nessun test nell'intero codebase | — | 0 file di test | ALTA |
| Nessun custom hook per data fetching | Tutti i componenti | Pattern `useEffect + load` ripetuto | MEDIA |
| Nessun linter/formatter configurato | — | No ESLint, no Prettier | BASSA |

### Raccomandazioni prioritarie
1. Sostituire `alert()`/`prompt()` con sistema toast + modal (es. Sonner per toast, dialog headless)
2. Abilitare `"strict": true` in `tsconfig.json`
3. Creare custom hooks: `useFiles()`, `useCitations()`, `useChatSessions()`
4. Aggiungere almeno test unitari per `db.ts`, `format.ts`, `chunking.ts`

---

## 3. Critici e Accurati — 5/10 DA FARE

### Problemi aperti

| Problema | Impatto | File |
|---|---|---|
| Nessun Error Boundary React | Un errore in un componente crasha tutta l'app (schermo bianco) | `main.tsx`, `App.tsx` |
| Nessuna validazione env vars a runtime | L'app crasha con errore criptico se mancano le chiavi API | `api/_lib/supabase.ts:3-4` (usa `!` assertion) |
| Nessuno schema validation lato API | I body delle request non sono validati con schema (Zod) | Tutti i file `api/` |
| Nessun file size limit lato client | L'utente può caricare file enormi senza limiti | `Library.tsx` |
| Delete senza conferma | La cancellazione avviene senza chiedere conferma | `Citations.tsx:28-31`, `Library.tsx:92-95` |

---

## 4. Production Ready — 2/10 CRITICO

### Bloccanti per la produzione

| Problema | Severità | Dettaglio |
|---|---|---|
| **Nessuna autenticazione API** | CRITICO | Tutte le 9 API routes sono pubbliche. Chiunque può leggere, scrivere e cancellare dati |
| **`POST /api/clear` aperto** | CRITICO | Chiunque può cancellare TUTTI i dati con una singola richiesta |
| **Nessun rate limiting** | CRITICO | Le chiamate a Claude e Gemini non hanno limiti — rischio di costi incontrollati |
| **Env vars non validate** | ALTO | `supabase.ts` usa `process.env.SUPABASE_URL!` — crash a runtime se mancante |
| **Nessun Error Boundary** | ALTO | Un errore JS crasha l'intera app senza possibilità di recovery |
| **Nessun CSP header** | MEDIO | Nessun Content-Security-Policy definito in `vercel.json` |

### Non bloccanti ma importanti

| Problema | Severità | Dettaglio |
|---|---|---|
| Nessun lazy loading | MEDIO | Bundle monolitico (1.3MB JS), tutti i componenti caricati insieme |
| Loading state mancante | MEDIO | `Citations.tsx` e `Settings.tsx` non mostrano loading durante il fetch iniziale |
| Nessun `useMemo` per filtri | BASSO | `filteredFiles` e `filteredCitations` ricalcolati ad ogni render |
| Modello AI hardcoded | BASSO | `'claude-sonnet-4-6'` in `api/chat.ts:105` — dovrebbe essere env var |

---

## 5. Backward Compatible — 9/10 OK

Nessun problema rilevato. L'app ha:
- Schema DB stabile con migrazioni (`supabase/migrations/001_initial_schema.sql`)
- API RESTful coerenti con contratti stabili
- Cascade delete configurato correttamente nel DB

Unica nota: non esiste un sistema di versioning delle API (es. `/api/v1/`), ma per un'app single-tenant non è un problema attuale.

---

## 6. Clean Architecture — 5/10 PARZIALE

### Miglioramenti rispetto al precedente audit
- Shared UI components in `src/components/ui/` (separazione presentazione)
- Shared formatting utilities in `src/lib/format.ts`
- Shared API utilities in `api/_lib/handler.ts`
- Data layer pulito in `src/lib/db.ts` con helpers DRY

### Problemi aperti

| Problema | Dettaglio |
|---|---|
| **Chat.tsx è un god component (327 righe)** | Gestisce: UI sidebar, message list, input, session management, API calls, optimistic updates, citation saving, scroll management. Dovrebbe essere 4-5 file |
| **Library.tsx (237 righe)** | Mescola file processing (PDF, DOCX parsing), drag-and-drop, filtering, rendering. Dovrebbe separare la logica di upload |
| **Nessun service layer** | La business logic è nei componenti. Manca `src/services/` |
| **Nessun custom hook** | Pattern `useEffect + setState + loadData` ripetuto in 4 componenti. Mancano hooks come `useFiles()`, `useChatSessions()` |
| **Nessuno state management** | Ogni componente gestisce il proprio stato isolatamente. Nessun Context, Zustand o React Query |
| **`fetch` diretto in Chat.tsx:83** | Bypassa il data layer `db.ts` per la chiamata al chat endpoint |
| **Tipo `Citation` duplicato** | Definito sia in `src/lib/db.ts:13-19` che in `api/chat.ts:13-17` con campi diversi |

### Refactoring suggerito (priorità)
1. Estrarre `Chat.tsx` in: `ChatSidebar`, `MessageList`, `ChatInput`, `useChatSession` hook
2. Creare `src/services/ChatService.ts` per la logica di comunicazione con `/api/chat`
3. Creare custom hooks di data fetching per ogni entità
4. Condividere i tipi tra frontend e backend (package `shared/types.ts` o barrel export)

---

## 7. State of the Art — 5/10 DA FARE

### Stack positivo
- React 19, Vite 6, Tailwind CSS 4, TypeScript 5.8
- Supabase + pgvector per RAG
- Vercel serverless functions
- Anthropic Claude SDK + Google Gemini embeddings

### Gap rispetto allo stato dell'arte

| Mancanza | Alternativa moderna |
|---|---|
| `alert()`/`prompt()` per notifiche | Sonner, react-hot-toast |
| Nessun state management | React Query (TanStack Query) per server state, Zustand per UI state |
| Nessun form validation | Zod + react-hook-form |
| Nessun schema validation API | Zod server-side |
| Nessun test framework | Vitest + Testing Library |
| Nessun logging strutturato | Pino, o almeno un wrapper `logger.ts` |
| Nessun code splitting | `React.lazy()` + `Suspense` |
| No CI/CD pipeline | GitHub Actions con lint + type check + test + build |

---

## 8. Risolvere, non aggirare — 5/10 DA FARE

| Pattern "aggirato" | Cosa andrebbe fatto |
|---|---|
| `alert()` per notifiche | Implementare un vero sistema toast |
| `prompt()` per input categoria | Implementare un modal/dropdown di selezione |
| `// window.confirm can be blocked in iframes, so we delete directly` | Implementare un dialog di conferma custom |
| `console.error` come unico error handling | Implementare error reporting + UI feedback |
| No auth perché "è un prototipo" | Implementare Supabase Auth (RLS policies) |
| `any` in pdf-parser.ts | Tipizzare con i tipi di pdfjs-dist `TextItem` |

---

## 9. Accessibilità — 2/10 DA FARE

| Problema | File | Dettaglio |
|---|---|---|
| Bottoni icon-only senza `aria-label` | `Chat.tsx:309-314` | Bottone Send ha solo l'icona |
| File input senza label associata | `Library.tsx:144-151` | `<input type="file">` dentro un `<label>` ma senza testo accessibile |
| Textarea senza `aria-label` | `Chat.tsx:301-307` | Ha solo `placeholder` |
| Nessun `<nav>` per la sidebar | `Sidebar.tsx` | Usa `<div>` invece di `<nav>` |
| Nessun `<main>` semantico con `aria-label` | `App.tsx:20` | Ha `<main>` ma senza label |
| Nessun focus management nella chat | `Chat.tsx` | Dopo l'invio il focus non torna alla textarea |
| Nessun skip-to-content link | `App.tsx` | Manca per navigation da tastiera |

---

## 10. Sicurezza — 1/10 CRITICO

| Vulnerabilità | Severità | Dettaglio |
|---|---|---|
| **API completamente aperte** | CRITICO | Nessuna autenticazione su nessun endpoint |
| **`/api/clear` senza protezione** | CRITICO | Cancella tutto il database con un POST |
| **Nessun CORS configurato** | ALTO | Le API accettano richieste da qualsiasi origine |
| **Env vars con `!` assertion** | ALTO | `supabase.ts:3-4` — crash silenzioso se mancanti |
| **Nessun rate limiting** | ALTO | Chiamate illimitate a Claude/Gemini = costi illimitati |
| **Nessun CSP header** | MEDIO | Nessuna protezione XSS via Content-Security-Policy |
| **Nessuna validazione input** | MEDIO | I body delle API request non sono validati con schema |

---

## Piano di intervento suggerito

### Fase 1 — Sicurezza e Produzione (BLOCCANTE)
1. Implementare autenticazione con Supabase Auth + RLS policies
2. Aggiungere rate limiting sugli endpoint AI (`/api/chat`, `/api/files` POST)
3. Validare env vars all'avvio con fallback graceful
4. Aggiungere Error Boundary React in `App.tsx`

### Fase 2 — Best Practices
5. Sostituire `alert()`/`prompt()` con toast + modal
6. Abilitare TypeScript strict mode
7. Aggiungere schema validation con Zod lato API
8. Creare custom hooks per data fetching

### Fase 3 — Clean Architecture
9. Estrarre Chat.tsx in sotto-componenti + service
10. Creare service layer (`src/services/`)
11. Adottare React Query o Zustand per state management
12. Unificare i tipi condivisi frontend/backend

### Fase 4 — Performance e Qualità
13. Code splitting con `React.lazy()` + `Suspense`
14. Aggiungere `useMemo` per filtri costosi
15. Aggiungere test con Vitest + Testing Library
16. Configurare ESLint + Prettier

### Fase 5 — Accessibilità
17. Aggiungere `aria-label` a tutti i bottoni icon-only
18. Usare HTML semantico (`<nav>`, `<aside>`, `<article>`)
19. Implementare focus management nella chat
20. Aggiungere skip-to-content link

---

## Struttura file attuale

```
src/
├── components/
│   ├── ui/                  # [NUOVO] Componenti UI riutilizzabili
│   │   ├── Card.tsx
│   │   ├── DeleteButton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── PageLayout.tsx
│   │   └── SectionHeader.tsx
│   ├── Chat.tsx             # 327 righe — necessita refactoring
│   ├── Library.tsx          # 237 righe — usa componenti shared
│   ├── Citations.tsx        # 148 righe — usa componenti shared
│   ├── Settings.tsx         # 107 righe — usa componenti shared
│   └── Sidebar.tsx          # 54 righe
├── lib/
│   ├── db.ts                # Data layer con apiGet/apiPost/apiDelete DRY
│   ├── format.ts            # [NUOVO] formatDate, formatFileSize
│   ├── pdf-parser.ts
│   └── utils.ts             # cn() utility
├── App.tsx
├── main.tsx
└── index.css

api/
├── _lib/
│   ├── handler.ts           # [NUOVO] createHandler, withErrorHandler, extractId
│   ├── supabase.ts
│   ├── chunking.ts
│   ├── embeddings.ts
│   └── search.ts
├── chat.ts                  # Usa createHandler + withErrorHandler
├── chat/
│   ├── sessions.ts          # Usa createHandler + withErrorHandler
│   └── sessions/[id].ts     # Usa createHandler + withErrorHandler + extractId
├── files.ts                 # Usa createHandler + withErrorHandler
├── files/[id].ts            # Usa createHandler + withErrorHandler + extractId
├── citations.ts             # Usa createHandler + withErrorHandler
├── citations/[id].ts        # Usa createHandler + withErrorHandler + extractId
├── search.ts                # Usa createHandler + withErrorHandler
└── clear.ts                 # Usa createHandler + withErrorHandler
```
