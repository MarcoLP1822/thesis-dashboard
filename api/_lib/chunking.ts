export function chunkText(content: string, maxTokens: number = 500): string[] {
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    // Approximation: 1 token ~ 4 characters
    if (currentChunk.length + p.length > maxTokens * 4) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks.filter(Boolean);
}
