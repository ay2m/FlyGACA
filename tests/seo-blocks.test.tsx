import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyFacts } from '@/components/KeyFacts';
import { Faq } from '@/components/Faq';

// The answer-first SEO blocks shared by guide pages: a "Key facts" definition
// list (each fact tagged with its governing GACAR citation) and an FAQ accordion
// whose visible text backs the page's FAQPage JSON-LD.

describe('KeyFacts', () => {
  it('renders each fact as a label + value + citation tag', () => {
    render(
      <KeyFacts
        title="Key facts"
        facts={[
          { label: 'Minimum age', value: '17 years old', ref: 'GACAR Part 61' },
          { label: 'Medical', value: 'A current Class 2 medical', ref: 'GACAR Part 67' },
        ]}
      />,
    );
    // Labels (dt) and citation tags (span) are standalone nodes; values share
    // their dd with the ref tag, so match them loosely.
    expect(screen.getByText('Minimum age')).toBeInTheDocument();
    expect(screen.getByText('Medical')).toBeInTheDocument();
    expect(screen.getByText(/17 years old/)).toBeInTheDocument();
    expect(screen.getByText('GACAR Part 61')).toBeInTheDocument();
    expect(screen.getByText('GACAR Part 67')).toBeInTheDocument();
    // The block is a labelled complementary landmark.
    expect(screen.getByRole('complementary', { name: 'Key facts' })).toBeInTheDocument();
  });
});

describe('Faq', () => {
  it('renders a heading and one disclosure per question/answer pair', () => {
    render(
      <Faq
        title="Frequently asked questions"
        items={[
          { q: 'How old must I be?', a: 'At least 17 under GACAR Part 61.' },
          { q: 'What medical do I need?', a: 'A current Class 2 medical.' },
        ]}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Frequently asked questions' }),
    ).toBeInTheDocument();
    expect(screen.getByText('How old must I be?')).toBeInTheDocument();
    expect(screen.getByText('At least 17 under GACAR Part 61.')).toBeInTheDocument();
    expect(screen.getByText('What medical do I need?')).toBeInTheDocument();
    expect(screen.getByText('A current Class 2 medical.')).toBeInTheDocument();
  });
});
