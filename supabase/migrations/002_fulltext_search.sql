-- Migration: replace pgvector semantic search with PostgreSQL full-text search
-- This removes the Gemini embedding dependency entirely.

-- 1. Drop the old embedding-based search function
drop function if exists match_chunks(vector(768), int);

-- 2. Remove the embedding column (no longer needed)
alter table chunks drop column if exists embedding;

-- 3. Add a tsvector column for full-text search
alter table chunks add column if not exists tsv tsvector;

-- 4. Populate tsvector for any existing rows
update chunks set tsv = to_tsvector('italian', content) where tsv is null;

-- 5. Create a GIN index for fast full-text search
create index if not exists chunks_tsv_idx on chunks using gin(tsv);

-- 6. Auto-update tsvector on insert/update via trigger
create or replace function chunks_tsv_trigger() returns trigger as $$
begin
  new.tsv := to_tsvector('italian', new.content);
  return new;
end;
$$ language plpgsql;

drop trigger if exists chunks_tsv_update on chunks;
create trigger chunks_tsv_update
  before insert or update of content on chunks
  for each row execute function chunks_tsv_trigger();

-- 7. New search function: full-text search with ranking
create or replace function search_chunks_fts(
  query text,
  match_count int default 5
)
returns table (
  content text,
  source_file text,
  rank real
)
language sql stable
as $$
  select
    c.content,
    f.name as source_file,
    ts_rank(c.tsv, websearch_to_tsquery('italian', query)) as rank
  from chunks c
  join files f on f.id = c.file_id
  where c.tsv @@ websearch_to_tsquery('italian', query)
  order by rank desc
  limit match_count;
$$;

-- 8. pgvector extension is no longer needed (optional: drop if no other use)
-- Uncomment the next line if you want to remove it entirely:
-- drop extension if exists vector;
