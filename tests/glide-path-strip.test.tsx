import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlidePathStrip } from '@/components/study/GlidePathStrip';
import { emptyBins, glidePathBins } from '@/calc/study/glidePath';

describe('<GlidePathStrip />', () => {
  it('renders nothing for an empty deck', () => {
    const { container } = render(<GlidePathStrip bins={emptyBins()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the accessible summary and per-stage counts', () => {
    const bins = glidePathBins({ '1': { box: 5, due: '2026-01-01' } }, ['0', '1']);
    render(<GlidePathStrip bins={bins} />);
    // Summary carries the meaning; the stage row itself is decorative.
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.getByText(/1 new/)).toBeInTheDocument();
    expect(screen.getByText(/1 mastered/)).toBeInTheDocument();
  });
});
