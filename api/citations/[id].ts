import { supabase } from '../_lib/supabase';
import { createHandler, withErrorHandler, extractId } from '../_lib/handler';

export default createHandler({
  DELETE: (req) => withErrorHandler('delete citation', async () => {
    const id = extractId(req);
    if (!id) {
      return Response.json({ error: 'Missing citation ID' }, { status: 400 });
    }

    await supabase.from('citations').delete().eq('id', id);
    return Response.json({ success: true });
  }),
});
