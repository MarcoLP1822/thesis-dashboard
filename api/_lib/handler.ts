type MethodHandler = (req: Request) => Promise<Response>;

type MethodHandlers = {
  GET?: MethodHandler;
  POST?: MethodHandler;
  DELETE?: MethodHandler;
  PUT?: MethodHandler;
  PATCH?: MethodHandler;
};

/**
 * Route a request to the correct method handler, returning 405 for unsupported methods.
 */
export function createHandler(handlers: MethodHandlers) {
  return async (req: Request): Promise<Response> => {
    const method = req.method as keyof MethodHandlers;
    const handler = handlers[method];
    if (!handler) {
      return Response.json(
        { error: `Method ${req.method} not allowed` },
        { status: 405 }
      );
    }
    return handler(req);
  };
}

/**
 * Parse request body, handling both Vercel Node.js runtime (pre-parsed .body)
 * and standard Web API Request (.json()).
 */
export async function parseBody<T = unknown>(req: Request): Promise<T> {
  // Vercel Node.js runtime pre-parses the body — check this first
  const raw = (req as unknown as { body: unknown }).body;
  if (raw !== undefined && raw !== null) {
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
  }
  // Standard Web API Request
  return req.json() as Promise<T>;
}

/**
 * Wrap an async operation with consistent error logging, 500 response,
 * and a safety timeout so Vercel functions never hang for 300 s.
 */
export async function withErrorHandler(
  operation: string,
  fn: () => Promise<Response>,
  timeoutMs = 25_000
): Promise<Response> {
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${operation} exceeded ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  } catch (err) {
    console.error(`Error ${operation}:`, err);
    const status = err instanceof Error && err.message.startsWith('Timeout') ? 504 : 500;
    return Response.json(
      { error: `Failed to ${operation}` },
      { status }
    );
  }
}

/**
 * Extract the last path segment from a request URL (the dynamic [id] parameter).
 */
export function extractId(req: Request): string | null {
  const url = new URL(req.url);
  return url.pathname.split('/').pop() || null;
}
