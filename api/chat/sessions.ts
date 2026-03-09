import { supabase } from '../_lib/supabase';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return handleGet();
  }
  if (req.method === 'POST') {
    return handlePost(req);
  }
  return Response.json(
    { error: `Method ${req.method} not allowed` },
    { status: 405 }
  );
}

async function handleGet(): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, messages, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return Response.json(data ?? []);
  } catch (err) {
    console.error('Error listing chat sessions:', err);
    return Response.json(
      { error: 'Failed to list chat sessions' },
      { status: 500 }
    );
  }
}

async function handlePost(req: Request): Promise<Response> {
  try {
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
  } catch (err) {
    console.error('Error saving chat session:', err);
    return Response.json(
      { error: 'Failed to save chat session' },
      { status: 500 }
    );
  }
}
