import { supabase } from '../../_lib/supabase';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'DELETE') {
    return Response.json(
      { error: `Method ${req.method} not allowed` },
      { status: 405 }
    );
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.pathname.split('/').pop();

    if (!sessionId) {
      return Response.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error deleting chat session:', err);
    return Response.json(
      { error: 'Failed to delete chat session' },
      { status: 500 }
    );
  }
}
