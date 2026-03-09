import { supabase } from '../_lib/supabase.js';
import { createHandler, withErrorHandler } from '../_lib/handler.js';

export default createHandler({
  GET: () => withErrorHandler('list chat sessions', async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  }),

  POST: (req) => withErrorHandler('save chat session', async () => {
    const body = await req.json();
    const { id, title, messages } = body;

    if (!id || !title || !messages) {
      return Response.json(
        { error: 'Missing required fields: id, title, messages' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert(
        { id, title, messages, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  }),
});
