import { supabase } from './_lib/supabase';
import { chunkText } from './_lib/chunking';
import { createHandler, withErrorHandler } from './_lib/handler';

export default createHandler({
  GET: () => withErrorHandler('list files', async () => {
    const { data, error } = await supabase
      .from('files')
      .select('id, name, type, size, storage_path, uploaded_at')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  }),

  POST: (req) => withErrorHandler('process file', async () => {
    const body = await req.json();
    const { id, name, type, size, content } = body;

    if (!id || !name || !content) {
      return Response.json(
        { error: 'Missing required fields: id, name, content' },
        { status: 400 }
      );
    }

    const { error: fileError } = await supabase
      .from('files')
      .insert({ id, name, type, size });

    if (fileError) throw fileError;

    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${id}_${i}`;

      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          id: chunkId,
          file_id: id,
          content: chunks[i],
          chunk_index: i,
        });

      if (chunkError) throw chunkError;
    }

    return Response.json({ id, chunksProcessed: chunks.length });
  }),
});
