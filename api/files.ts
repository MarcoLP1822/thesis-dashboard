import { supabase } from './_lib/supabase';
import { chunkText } from './_lib/chunking';
import { getEmbedding } from './_lib/embeddings';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return handleGet();
  }
  if (req.method === 'POST') {
    return handlePost(req);
  }
  return Response.json(
    { error: `Method ${req.method} not allowed` },
    { status: 405 }
  );
}

async function handleGet(): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('id, name, type, size, storage_path, uploaded_at')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return Response.json(data ?? []);
  } catch (err) {
    console.error('Error listing files:', err);
    return Response.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

async function handlePost(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { id, name, type, size, content } = body;

    if (!id || !name || !content) {
      return Response.json(
        { error: 'Missing required fields: id, name, content' },
        { status: 400 }
      );
    }

    // 1. Insert file metadata
    const { error: fileError } = await supabase
      .from('files')
      .insert({ id, name, type, size });

    if (fileError) throw fileError;

    // 2. Chunk text
    const chunks = chunkText(content);

    // 3. Generate embeddings and insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${id}_${i}`;
      const embedding = await getEmbedding(chunks[i]);

      // pgvector expects string format: [0.1,0.2,...]
      const embeddingStr = `[${embedding.join(',')}]`;

      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          id: chunkId,
          file_id: id,
          content: chunks[i],
          chunk_index: i,
          embedding: embeddingStr,
        });

      if (chunkError) throw chunkError;
    }

    return Response.json({ id, chunksProcessed: chunks.length });
  } catch (err) {
    console.error('Error processing file:', err);
    return Response.json(
      { error: 'Failed to process file and generate embeddings' },
      { status: 500 }
    );
  }
}
