import { searchChunks } from './_lib/search';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { query, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'Missing or invalid query' }, { status: 400 });
    }

    const results = await searchChunks(query, limit);
    return Response.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return Response.json(
      { error: 'Search failed' },
      { status: 500 },
    );
  }
}
