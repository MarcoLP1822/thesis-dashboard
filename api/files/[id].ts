import { supabase } from '../_lib/supabase';
import { createHandler, withErrorHandler, extractId } from '../_lib/handler';

export default createHandler({
  DELETE: (req) => withErrorHandler('delete file', async () => {
    const id = extractId(req);
    if (!id) {
      return Response.json({ error: 'Missing file ID' }, { status: 400 });
    }

    const { data: file } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (file?.storage_path) {
      await supabase.storage.from('thesis-files').remove([file.storage_path]);
    }

    await supabase.from('files').delete().eq('id', id);
    return Response.json({ success: true });
  }),
});
