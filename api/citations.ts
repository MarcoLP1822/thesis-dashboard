import { supabase } from './_lib/supabase.js';
import { createHandler, withErrorHandler, parseBody } from './_lib/handler.js';

export default createHandler({
  GET: () => withErrorHandler('list citations', async () => {
    const { data, error } = await supabase
      .from('citations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  }),

  POST: (req) => withErrorHandler('save citation', async () => {
    const body = await parseBody<{ id: string; text: string; source: string; category: string }>(req);
    const { id, text, source, category } = body;

    if (!id || !text || !source || !category) {
      return Response.json(
        { error: 'Missing required fields: id, text, source, category' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('citations')
      .insert({ id, text, source, category })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  }),
});
