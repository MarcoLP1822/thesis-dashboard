/* eslint-disable @typescript-eslint/no-explicit-any */

type MethodHandler = (req: any) => Promise<Response>;

type MethodHandlers = {
  GET?: MethodHandler;
  POST?: MethodHandler;
  DELETE?: MethodHandler;
  PUT?: MethodHandler;
  PATCH?: MethodHandler;
};

/**
 * Route a request to the correct method handler.
 * Bridges Web API Response → Vercel Node.js (req, res) format,
 * because Vercel's runtime doesn't reliably handle `return Response`.
 */
export function createHandler(handlers: MethodHandlers) {
  return async (req: any, res: any) => {
    const method = req.method as keyof MethodHandlers;
    const handler = handlers[method];
    if (!handler) {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    try {
      const response: Response = await handler(req);

      // Copy status + headers
      res.status(response.status);
      response.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      if (!response.body) {
        return res.end();
      }

      // Pipe body — works for both JSON and SSE streaming
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        res.end();
      }
    } catch (err) {
      console.error('Unhandled error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.end();
      }
    }
  };
}

/**
 * Parse request body — Vercel Node.js runtime pre-parses req.body.
 */
export async function parseBody<T = unknown>(req: any): Promise<T> {
  const raw = req.body;
  if (raw !== undefined && raw !== null) {
    return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
  }
  // Fallback for standard Web API Request
  if (typeof req.json === 'function') {
    return req.json() as Promise<T>;
  }
  throw new Error('Unable to parse request body');
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
export function extractId(req: any): string | null {
  const url: string = req.url || '';
  return url.split('/').pop()?.split('?')[0] || null;
}
