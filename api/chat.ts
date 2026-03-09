import Anthropic from '@anthropic-ai/sdk';
import { searchChunks, type SearchResult } from './_lib/search';
import { createHandler, withErrorHandler } from './_lib/handler';
import type { MessageParam, ContentBlockParam, TextBlock } from '@anthropic-ai/sdk/resources/messages/messages';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "Sei un assistente accademico esperto. Il tuo compito è aiutare lo studente a organizzare, scrivere e ricercare materiale per la sua tesi di laurea. Usa i documenti forniti come fonte primaria di verità. Fornisci risposte chiare, strutturate e accademiche. Cita sempre il nome del file quando usi un'informazione specifica.";

type HistoryEntry = { role: string; text: string };

type Citation = {
  quote: string;
  source: string;
  cited_text: string;
};

function buildDocumentBlocks(chunks: SearchResult[]): ContentBlockParam[] {
  return chunks.map((chunk) => ({
    type: 'document' as const,
    source: {
      type: 'text' as const,
      media_type: 'text/plain' as const,
      data: chunk.content,
    },
    title: chunk.source_file,
    context: `Estratto da ${chunk.source_file}`,
    citations: { enabled: true },
  }));
}

function mapHistory(history: HistoryEntry[]): MessageParam[] {
  return history.map((m) => ({
    role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
    content: m.text,
  }));
}

function extractCitations(response: Anthropic.Message, chunks: SearchResult[]): { text: string; citations: Citation[] } {
  let fullText = '';
  const citations: Citation[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      const textBlock = block as TextBlock;
      fullText += textBlock.text;

      if (textBlock.citations) {
        for (const citation of textBlock.citations) {
          const docTitle =
            citation.document_title ??
            chunks[citation.document_index]?.source_file ??
            'Sconosciuto';

          citations.push({
            quote: citation.cited_text,
            source: docTitle,
            cited_text: citation.cited_text,
          });
        }
      }
    }
  }

  return { text: fullText, citations };
}

export default createHandler({
  POST: (req) => withErrorHandler('chat', async () => {
    const { message, sessionId, history = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Missing or invalid message' }, { status: 400 });
    }

    // RAG: retrieve relevant chunks
    let searchResults: SearchResult[] = [];
    try {
      searchResults = await searchChunks(message, 10);
    } catch (searchError) {
      console.error('Search failed, proceeding without RAG context:', searchError);
    }

    // Build the user content: document blocks + text query
    const userContent: ContentBlockParam[] = [];

    if (searchResults.length > 0) {
      userContent.push(...buildDocumentBlocks(searchResults));
    }

    userContent.push({
      type: 'text' as const,
      text: searchResults.length > 0
        ? message
        : `${message}\n\n(Nota: non ho trovato documenti rilevanti nella libreria. Rispondi in base alle tue conoscenze generali e avvisa che non ci sono riscontri nei documenti caricati.)`,
    });

    const messages: MessageParam[] = [
      ...mapHistory(history),
      { role: 'user' as const, content: userContent },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const { text, citations } = extractCitations(response, searchResults);

    return Response.json({
      text: text || 'Nessuna risposta generata.',
      citations,
    });
  }),
});
