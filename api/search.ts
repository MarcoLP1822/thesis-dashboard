import { searchChunks } from './_lib/search.js';
import { createHandler, withErrorHandler } from './_lib/handler.js';

export default createHandler({
  POST: (req) => withErrorHandler('search', async () => {
    const { query, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    const results = await searchChunks(query, limit);
    return Response.json(results);
  }),
});
