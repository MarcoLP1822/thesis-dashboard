-- Migration: improve search_chunks_fts with 3-phase search
-- Phase 1: strict AND match (most precise)
-- Phase 2: OR match (broader recall — match ANY keyword)
-- Phase 3: ILIKE fallback (last resort for proper names / edge cases)

CREATE OR REPLACE FUNCTION search_chunks_fts(
  query TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  source_file TEXT,
  rank REAL
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  and_q  tsquery;
  or_q   tsquery;
  or_txt TEXT;
  cnt    INT := 0;
  phase_cnt INT := 0;
BEGIN
  -- Phase 1: strict AND match (websearch_to_tsquery requires ALL terms)
  BEGIN
    and_q := websearch_to_tsquery('italian', query);

    RETURN QUERY
      SELECT c.content, f.name, ts_rank(c.tsv, and_q)::real
      FROM chunks c
      JOIN files f ON f.id = c.file_id
      WHERE c.tsv @@ and_q
      ORDER BY ts_rank(c.tsv, and_q) DESC
      LIMIT match_count;

    GET DIAGNOSTICS cnt = ROW_COUNT;
    IF cnt >= match_count THEN RETURN; END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- skip to phase 2 on bad input
  END;

  -- Phase 2: OR match (match ANY stemmed keyword)
  BEGIN
    or_txt := plainto_tsquery('italian', query)::text;

    IF or_txt IS NOT NULL AND or_txt <> '' THEN
      -- Convert 'a' & 'b' & 'c' → 'a' | 'b' | 'c'
      or_q := replace(or_txt, ' & ', ' | ')::tsquery;

      RETURN QUERY
        SELECT c.content, f.name, ts_rank(c.tsv, or_q)::real
        FROM chunks c
        JOIN files f ON f.id = c.file_id
        WHERE c.tsv @@ or_q
          AND (and_q IS NULL OR NOT c.tsv @@ and_q)   -- exclude phase-1 rows
        ORDER BY ts_rank(c.tsv, or_q) DESC
        LIMIT match_count - cnt;

      GET DIAGNOSTICS phase_cnt = ROW_COUNT;
      cnt := cnt + phase_cnt;
      IF cnt >= match_count THEN RETURN; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Phase 3: ILIKE keyword fallback (handles proper names, edge cases)
  IF cnt = 0 THEN
    RETURN QUERY
      SELECT c.content, f.name, 0.0::real
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
