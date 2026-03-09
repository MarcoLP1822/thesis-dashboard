import { supabase } from './_lib/supabase';
import { createHandler, withErrorHandler } from './_lib/handler';

export default createHandler({
  POST: () => withErrorHandler('clear all data', async () => {
    // Delete tables in FK-safe order: chunks -> files -> chat_sessions -> citations
    const { error: chunksError } = await supabase
      .from('chunks')
      .delete()
      .neq('id', '');

    if (chunksError) throw chunksError;

    const { error: filesError } = await supabase
      .from('files')
      .delete()
      .neq('id', '');

    if (filesError) throw filesError;

    const { error: sessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .neq('id', '');

    if (sessionsError) throw sessionsError;

    const { error: citationsError } = await supabase
      .from('citations')
      .delete()
      .neq('id', '');

    if (citationsError) throw citationsError;

    // Clear storage bucket
    const { data: storageFiles } = await supabase.storage
      .from('thesis-files')
      .list();

    if (storageFiles && storageFiles.length > 0) {
      const paths = storageFiles.map((f) => f.name);
      await supabase.storage
        .from('thesis-files')
        .remove(paths);
    }

    return Response.json({ success: true });
  }),
});
