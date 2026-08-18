import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@/i18n';
import { GroundingBadge } from '@/components/chat/GroundingBadge';

// GroundingBadge surfaces the brain's grounding verdict. The legacy rule —
// render nothing for `na`/missing/unknown kinds — is the part most likely to
// regress, so it is pinned alongside the refusal §class rendering.

afterEach(cleanup);

describe('<GroundingBadge />', () => {
  it('renders the verdict label with a status role', () => {
    render(<GroundingBadge kind="grounded" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-state', 'grounded');
    expect(badge).toHaveTextContent('Grounded');
  });

  it('renders nothing for na, missing or unknown kinds', () => {
    const { container: a } = render(<GroundingBadge kind="na" />);
    expect(a).toBeEmptyDOMElement();
    const { container: b } = render(<GroundingBadge />);
    expect(b).toBeEmptyDOMElement();
    // An unknown kind has no label key and must also render nothing.
    const { container: c } = render(<GroundingBadge kind={'bogus' as unknown as 'grounded'} />);
    expect(c).toBeEmptyDOMElement();
  });

  it('shows the cited §class on a refusal, but only when supplied', () => {
    render(<GroundingBadge kind="refusal" refusalClass="61.51" />);
    expect(screen.getByText('§61.51')).toBeInTheDocument();
    cleanup();
    render(<GroundingBadge kind="refusal" />);
    expect(screen.queryByText(/§/)).not.toBeInTheDocument();
  });
});
