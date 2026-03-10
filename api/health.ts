import { supabase } from './_lib/supabase.js';

export default async function handler(): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let dbStatus = 'unknown';
  let dbError = '';

  try {
    const { error } = await supabase.from('files').select('id').limit(1);
    dbStatus = error ? 'error' : 'ok';
    if (error) dbError = error.message;
  } catch (err) {
    dbStatus = 'unreachable';
    dbError = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    env: {
      SUPABASE_URL: supabaseUrl ? `${supabaseUrl.slice(0, 20)}...` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: hasKey ? 'set' : 'MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    },
    db: { status: dbStatus, error: dbError || undefined },
  });
}
