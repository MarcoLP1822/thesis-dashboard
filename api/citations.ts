import { supabase } from './_lib/supabase';
import { createHandler, withErrorHandler } from './_lib/handler';

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
    const body = await req.json();
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
