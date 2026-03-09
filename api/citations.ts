import { supabase } from './_lib/supabase';

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
      .from('citations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return Response.json(data ?? []);
  } catch (err) {
    console.error('Error listing citations:', err);
    return Response.json(
      { error: 'Failed to list citations' },
      { status: 500 }
    );
  }
}

async function handlePost(req: Request): Promise<Response> {
  try {
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
  } catch (err) {
    console.error('Error saving citation:', err);
    return Response.json(
      { error: 'Failed to save citation' },
      { status: 500 }
    );
  }
}
