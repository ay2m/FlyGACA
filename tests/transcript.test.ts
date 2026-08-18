import { describe, expect, it } from 'vitest';
import {
  transcriptToMarkdown,
  type TranscriptMessage,
  type TranscriptLabels,
} from '@/calc/chat/transcript';

const labels: TranscriptLabels = {
  title: 'Captain Adel — conversation',
  disclaimer: 'Educational AI — verify against GACA.',
  you: 'You',
  adel: 'Captain Adel',
  sources: 'Sources',
};

describe('transcriptToMarkdown', () => {
  it('renders a header, then each turn with speaker labels', () => {
    const messages: TranscriptMessage[] = [
      { role: 'user', text: 'What is night currency?' },
      { role: 'assistant', text: 'Three takeoffs and landings in 90 days.' },
    ];
    const md = transcriptToMarkdown(messages, labels);
    expect(md).toContain('# Captain Adel — conversation');
    expect(md).toContain('_Educational AI — verify against GACA._');
    expect(md).toContain('**You:** What is night currency?');
    expect(md).toContain('**Captain Adel:** Three takeoffs and landings in 90 days.');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('lists assistant sources as bullets with optional URLs', () => {
    const messages: TranscriptMessage[] = [
      {
        role: 'assistant',
        text: 'See the rule.',
        sources: [{ citation: '61.57(b)' }, { citation: 'AIP', url: 'https://x/aip' }],
      },
    ];
    const md = transcriptToMarkdown(messages, labels);
    expect(md).toContain('Sources:\n- 61.57(b)\n- AIP (https://x/aip)');
  });

  it('skips pending, error and empty turns', () => {
    const messages: TranscriptMessage[] = [
      { role: 'user', text: '  ' },
      { role: 'assistant', text: 'thinking', pending: true },
      { role: 'assistant', text: 'failed', error: true },
      { role: 'user', text: 'Real question' },
    ];
    const md = transcriptToMarkdown(messages, labels);
    expect(md).toContain('**You:** Real question');
    expect(md).not.toContain('thinking');
    expect(md).not.toContain('failed');
  });
});
