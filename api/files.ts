import { supabase } from './_lib/supabase.js';
import { chunkText } from './_lib/chunking.js';
import { createHandler, withErrorHandler, parseBody } from './_lib/handler.js';

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
    const body = await parseBody<{ id: string; name: string; type: string; size: number; content: string }>(req);
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

    const rows = chunks.map((text, i) => ({
      id: `${id}_${i}`,
      file_id: id,
      content: text,
      chunk_index: i,
    }));

    // Batch-insert in groups of 500 to stay within Supabase payload limits
    for (let i = 0; i < rows.length; i += 500) {
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert(rows.slice(i, i + 500));

      if (chunkError) throw chunkError;
    }

    return Response.json({ id, chunksProcessed: chunks.length });
  }),
});
