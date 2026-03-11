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

export type PagedChunk = {
  text: string;
  pageStart: number | null;
};

/**
 * Chunks content while tracking page numbers from "--- Pagina X ---" markers.
 * Markers are stripped from the final chunk text.
 * For content without markers (DOCX, TXT), pageStart is null.
 */
export function chunkTextWithPages(content: string, maxTokens = 500): PagedChunk[] {
  if (!/--- Pagina \d+ ---/.test(content)) {
    return chunkText(content, maxTokens).map(text => ({ text, pageStart: null }));
  }

  // Split by page markers. With capture group, result alternates:
  // [textBefore, pageNum, text, pageNum, text, ...]
  const parts = content.split(/\n?--- Pagina (\d+) ---\n?/);

  const segments: { page: number; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const page = parseInt(parts[i]);
    const text = (parts[i + 1] || '').trim();
    if (text) {
      segments.push({ page, text });
    }
  }

  const result: PagedChunk[] = [];
  let currentChunk = '';
  let currentPage: number | null = null;

  for (const seg of segments) {
    const paragraphs = seg.text.split(/\n\s*\n/);

    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > maxTokens * 4) {
        if (currentChunk) {
          result.push({ text: currentChunk.trim(), pageStart: currentPage });
        }
        currentChunk = trimmed;
        currentPage = seg.page;
      } else {
        if (!currentChunk) {
          currentPage = seg.page;
        }
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }
  }

  if (currentChunk.trim()) {
    result.push({ text: currentChunk.trim(), pageStart: currentPage });
  }

  return result.filter(c => c.text);
}
