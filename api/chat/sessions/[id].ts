import { supabase } from '../../_lib/supabase.js';
import { createHandler, withErrorHandler, extractId } from '../../_lib/handler.js';

export default createHandler({
  GET: (req) => withErrorHandler('get chat session', async () => {
    const id = extractId(req);
    if (!id) {
      return Response.json({ error: 'Missing session ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return Response.json(data);
  }),

  DELETE: (req) => withErrorHandler('delete chat session', async () => {
    const id = extractId(req);
    if (!id) {
      return Response.json({ error: 'Missing session ID' }, { status: 400 });
    }

    await supabase.from('chat_sessions').delete().eq('id', id);
    return Response.json({ success: true });
  }),
});
