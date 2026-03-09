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
 * Parse request body, handling both Web API Request (.json()) and
 * Vercel Node.js runtime (pre-parsed .body).
 */
export async function parseBody<T = unknown>(req: Request): Promise<T> {
  if (typeof req.json === 'function') {
    return req.json() as Promise<T>;
  }
  return (req as unknown as { body: T }).body;
}

/**
 * Wrap an async operation with consistent error logging and 500 response.
 */
export async function withErrorHandler(
  operation: string,
  fn: () => Promise<Response>
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(`Error ${operation}:`, err);
    return Response.json(
      { error: `Failed to ${operation}` },
      { status: 500 }
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
