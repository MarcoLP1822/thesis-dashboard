import { supabase } from './_lib/supabase.js';

export default async function handler(
  _req: unknown,
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
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

  res.status(200).json({
    ok: dbStatus === 'ok',
    node: process.version,
    db: { status: dbStatus, error: dbError || undefined },
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    },
  });
}
