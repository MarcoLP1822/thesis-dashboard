export default function handler(req: Request): Response {
  return Response.json({
    ok: true,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    },
  });
}
