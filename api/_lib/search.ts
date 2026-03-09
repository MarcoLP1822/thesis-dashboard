import { supabase } from './supabase';

export type SearchResult = {
  content: string;
  source_file: string;
  rank: number;
};

export async function searchChunks(query: string, limit: number = 5): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_chunks_fts', {
    query,
    match_count: limit,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);

  return data as SearchResult[];
}
