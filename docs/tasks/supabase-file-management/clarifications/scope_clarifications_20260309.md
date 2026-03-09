# Scope Clarifications: Supabase File Management + RAG

**Concept**: Migrate from SQLite + IndexedDB to Supabase (Postgres + pgvector + Storage) for Vercel deployment
**Confirmed Boundaries**: Single user, no auth, Vercel + Supabase free tier, PDF/DOCX/TXT support

---

## Questions

### 1. File size limits
Your current setup stores files locally. On Supabase free tier, Storage has a 1GB limit and 50MB max per file. Are your thesis files (papers, books, etc.) generally under 50MB each?

<response>Yes, all under 50MB</response>

### 2. DOCX parsing
You want DOCX support (new). Should we handle DOCX parsing during this scope, or is it okay to add the storage plumbing now and handle DOCX text extraction as a follow-up?

<response>Parse everything in this scope</response>

### 3. Chat history persistence
Right now chat sessions live in IndexedDB. Should chat history move to Supabase too (persists across devices/browsers), or is it okay to keep it browser-local for now?

<response>Persistent chat history in Supabase</response>

### 4. Existing data
You mentioned 10-100 files. Do you have files already uploaded that you need to migrate, or is starting fresh acceptable?

<response>Fresh start is fine</response>

### 5. API route structure on Vercel
Your current Express server handles embedding generation, vector search, and chat. On Vercel, these become serverless API routes. Are you okay with the Express server being fully replaced by Vercel API routes (Next.js style or plain serverless functions)?

<response>Yes, replace Express entirely</response>
