-- Migration: add page tracking to chunks and return page info in search

-- 1. Add page_start column
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS page_start INTEGER;

-- 2. Extract page numbers from existing chunks that have embedded markers
UPDATE chunks SET
  page_start = (regexp_match(content, '--- Pagina (\d+) ---'))[1]::integer
WHERE content LIKE '%--- Pagina%'
  AND page_start IS NULL;

-- 3. Strip page markers from existing chunk content
UPDATE chunks SET
  content = trim(regexp_replace(content, E'\n?--- Pagina \\d+ ---\n?', E'\n\n', 'g'))
WHERE content LIKE '%--- Pagina%';

-- 4. Refresh tsvector after cleaning content
UPDATE chunks SET tsv = to_tsvector('italian', content);

-- 5. Drop old function (return type changed, CREATE OR REPLACE cannot handle that)
DROP FUNCTION IF EXISTS search_chunks_fts(text, integer);

-- 6. Recreate search function with page_start in return type
CREATE OR REPLACE FUNCTION search_chunks_fts(
  query TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  source_file TEXT,
  rank REAL,
  page_start INT
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  and_q     tsquery;
  or_q      tsquery;
  or_txt    TEXT;
  cnt       INT := 0;
  phase_cnt INT := 0;
BEGIN
  -- Phase 1: strict AND match
  BEGIN
    and_q := websearch_to_tsquery('italian', query);

    RETURN QUERY
      SELECT c.content, f.name, ts_rank(c.tsv, and_q)::real, c.page_start
      FROM chunks c
      JOIN files f ON f.id = c.file_id
      WHERE c.tsv @@ and_q
      ORDER BY ts_rank(c.tsv, and_q) DESC
      LIMIT match_count;

    GET DIAGNOSTICS cnt = ROW_COUNT;
    IF cnt >= match_count THEN RETURN; END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Phase 2: OR match (match ANY stemmed keyword)
  BEGIN
    or_txt := plainto_tsquery('italian', query)::text;

    IF or_txt IS NOT NULL AND or_txt <> '' THEN
      or_q := replace(or_txt, ' & ', ' | ')::tsquery;

      RETURN QUERY
        SELECT c.content, f.name, ts_rank(c.tsv, or_q)::real, c.page_start
        FROM chunks c
        JOIN files f ON f.id = c.file_id
        WHERE c.tsv @@ or_q
          AND (and_q IS NULL OR NOT c.tsv @@ and_q)
        ORDER BY ts_rank(c.tsv, or_q) DESC
        LIMIT match_count - cnt;

      GET DIAGNOSTICS phase_cnt = ROW_COUNT;
      cnt := cnt + phase_cnt;
      IF cnt >= match_count THEN RETURN; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Phase 3: ILIKE keyword fallback
  IF cnt = 0 THEN
    RETURN QUERY
      SELECT c.content, f.name, 0.0::real, c.page_start
      FROM chunks c
      JOIN files f ON f.id = c.file_id
      WHERE EXISTS (
        SELECT 1
        FROM unnest(string_to_array(
          regexp_replace(lower(trim(query)), '[^a-zàèéìòù]+', ' ', 'g'), ' '
        )) AS kw
        WHERE length(kw) > 3
          AND lower(c.content) LIKE '%' || kw || '%'
      )
      ORDER BY (
        SELECT count(*)
        FROM unnest(string_to_array(
          regexp_replace(lower(trim(query)), '[^a-zàèéìòù]+', ' ', 'g'), ' '
        )) AS kw
        WHERE length(kw) > 3
          AND lower(c.content) LIKE '%' || kw || '%'
      ) DESC
      LIMIT match_count;
  END IF;
END;
$$;
