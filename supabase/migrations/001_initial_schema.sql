-- Thesis Dashboard: initial schema
-- Migrates from SQLite + IndexedDB to Supabase + pgvector

-- Enable pgvector for embedding storage and similarity search
create extension if not exists vector;

-- ============================================================
-- files: uploaded thesis documents (replaces SQLite files table)
-- storage_path references the object in Supabase Storage bucket
-- ============================================================
create table files (
  id text primary key,
  name text not null,
  type text not null,
  size integer not null,
  storage_path text,
  uploaded_at timestamptz default now()
);

-- ============================================================
-- chunks: text segments with embeddings for RAG retrieval
-- embedding dimension 768 matches Gemini text-embedding-004
-- No vector index: exact search is fast enough for <5K chunks
-- ============================================================
create table chunks (
  id text primary key,
  file_id text references files(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  embedding vector(768)
);

-- ============================================================
-- chat_sessions: conversation history (replaces IndexedDB store)
-- messages stored as jsonb array, same shape as the frontend:
--   [{ "id": "...", "role": "user"|"model", "text": "..." }, ...]
-- ============================================================
create table chat_sessions (
  id text primary key,
  title text not null,
  messages jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- ============================================================
-- citations: saved quotes extracted from documents
-- ============================================================
create table citations (
  id text primary key,
  text text not null,
  source text,
  category text,
  created_at timestamptz default now()
);

-- ============================================================
-- match_chunks: pgvector similarity search for RAG retrieval
-- Called from api/_lib/search.ts via supabase.rpc()
-- ============================================================
create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  content text,
  source_file text,
  distance float
)
language sql stable
as $$
  select
    c.content,
    f.name as source_file,
    c.embedding <=> query_embedding as distance
  from chunks c
  join files f on f.id = c.file_id
  order by distance asc
  limit match_count;
$$;

-- ============================================================
-- Supabase Storage bucket configuration (manual setup required)
--
-- Create via Supabase Dashboard > Storage > New bucket:
--   Bucket name:    thesis-files
--   Public:         OFF (private access, no public URLs)
--   File size limit: 50MB (matches Supabase free tier)
--
-- Files are uploaded/downloaded through the API layer only.
-- The files.storage_path column stores the object path within
-- this bucket (e.g. "uploads/<file-id>/<filename>").
-- ============================================================
