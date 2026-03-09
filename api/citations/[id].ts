import { supabase } from '../_lib/supabase';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') {
    return Response.json(
      { error: `Method ${req.method} not allowed` },
      { status: 405 }
    );
  }

  try {
    const url = new URL(req.url);
    const citationId = url.pathname.split('/').pop();

    if (!citationId) {
      return Response.json(
        { error: 'Missing citation ID' },
        { status: 400 }
      );
    }

    await supabase
      .from('citations')
      .delete()
      .eq('id', citationId);

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error deleting citation:', err);
    return Response.json(
      { error: 'Failed to delete citation' },
      { status: 500 }
    );
  }
}
