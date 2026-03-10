export default function handler(
  req: { method: string },
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
  res.status(200).json({
    ok: true,
    node: process.version,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    },
  });
}
