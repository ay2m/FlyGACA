import { describe, expect, it, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import '@/i18n';
import { SourceList } from '@/components/chat/SourceList';
import { renderWithRouter } from './helpers/render';
import type { ChatSource } from '@/lib/api';

// SourceList renders the citation chips under an answer. The legacy behaviors
// most likely to regress are pinned: the FIRST verbatim passage arrives open
// (the reader should see the rule text without a click), a citation that names
// a known Part links into the Library reader, and an external url gets a
// target=_blank escape hatch.

afterEach(cleanup);

const VALID = new Set(['part-91']);

const src = (over: Partial<ChatSource> = {}): ChatSource => ({
  citation: 'GACAR Part 91 §91.155',
  url: '',
  ...over,
});

describe('<SourceList />', () => {
  it('opens only the first verbatim passage by default', () => {
    renderWithRouter(
      <SourceList
        sources={[
          src({ citation: 'GACAR Part 61', verbatim: 'First quoted rule.' }),
          src({ verbatim: 'Second quoted rule.' }),
        ]}
        valid={VALID}
      />,
    );
    const details = document.querySelectorAll('details');
    expect(details).toHaveLength(2);
    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(false);
    expect(screen.getByText('First quoted rule.')).toBeVisible();
  });

  it('links a citation naming a known Part into the Library reader', () => {
    renderWithRouter(<SourceList sources={[src()]} valid={VALID} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/library/part-91');
  });

  it('renders no Library link for an unknown Part, and an external link when url is set', () => {
    renderWithRouter(
      <SourceList
        sources={[src({ citation: 'GACAR Part 121', url: 'https://gaca.example/part-121' })]}
        valid={VALID}
      />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://gaca.example/part-121');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows the corpus revision on a verbatim row when supplied', () => {
    renderWithRouter(
      <SourceList
        sources={[src({ verbatim: 'Quoted rule.', corpusVersion: 'Rev 2026-05' })]}
        valid={VALID}
      />,
    );
    expect(screen.getByText('Rev 2026-05')).toBeInTheDocument();
  });
});
