/**
 * Pure Markdown serialization of a Captain Adel conversation, so a whole thread
 * can be copied or downloaded. No DOM imports → unit-testable. Mirrors the
 * logbook CSV-export approach (`src/calc/pilot/logbook.ts`): the page owns the
 * clipboard/Blob, this owns the text.
 */

export interface TranscriptSource {
  citation?: string;
  url?: string;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  text: string;
  sources?: TranscriptSource[];
  pending?: boolean;
  error?: boolean;
}

export interface TranscriptLabels {
  /** Document heading, e.g. "Captain Adel — conversation". */
  title: string;
  /** The educational disclaimer line. */
  disclaimer: string;
  /** Speaker label for the human, e.g. "You". */
  you: string;
  /** Speaker label for the assistant, e.g. "Captain Adel". */
  adel: string;
  /** Heading for a turn's source list, e.g. "Sources". */
  sources: string;
}

/**
 * Render finalized turns as Markdown. Pending/error turns are skipped so an
 * exported thread only contains real exchanges. Each assistant turn that carries
 * sources gets a trailing bulleted `Sources` list (citation + optional URL).
 */
export function transcriptToMarkdown(
  messages: TranscriptMessage[],
  labels: TranscriptLabels,
): string {
  const blocks: string[] = [`# ${labels.title}`, `_${labels.disclaimer}_`];

  for (const m of messages) {
    if (m.pending || m.error) continue;
    const text = m.text.trim();
    if (!text) continue;
    const who = m.role === 'user' ? labels.you : labels.adel;
    blocks.push(`**${who}:** ${text}`);

    if (m.role === 'assistant' && m.sources && m.sources.length > 0) {
      const lines = m.sources
        .map((s) => {
          const cite = (s.citation || s.url || '').trim();
          if (!cite) return '';
          return s.url && s.url !== cite ? `- ${cite} (${s.url})` : `- ${cite}`;
        })
        .filter(Boolean);
      if (lines.length) blocks.push(`${labels.sources}:\n${lines.join('\n')}`);
    }
  }

  return blocks.join('\n\n') + '\n';
}
