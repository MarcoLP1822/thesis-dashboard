import { supabase } from './supabase';
import { getEmbedding } from './embeddings';

export type SearchResult = {
  content: string;
  source_file: string;
  distance: number;
};

export async function searchChunks(query: string, limit: number = 5): Promise<SearchResult[]> {
  const queryEmbedding = await getEmbedding(query);

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
  });

  if (error) throw new Error(`Search failed: ${error.message}`);

  return data as SearchResult[];
}
