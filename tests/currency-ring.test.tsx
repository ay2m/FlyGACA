import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CurrencyRing } from '@/components/CurrencyRing';

describe('<CurrencyRing />', () => {
  it('draws the status glyph and a partial arc for an expiring item', () => {
    const { container } = render(<CurrencyRing item={{ status: 'expiring', daysLeft: 45 }} />);
    // Half the 90-day horizon → offset is half the (element-reported) circumference.
    const arc = container.querySelector('circle[style*="--offset"]') as SVGCircleElement;
    const circ = Number(arc.style.getPropertyValue('--circ'));
    expect(Number(arc.style.getPropertyValue('--offset'))).toBeCloseTo(circ * 0.5, 1);
    expect(container.textContent).toContain('!');
  });

  it('reads empty with the ✕ glyph for an expired item', () => {
    const { container } = render(<CurrencyRing item={{ status: 'expired', daysLeft: -3 }} />);
    const arc = container.querySelector('circle[style*="--offset"]') as SVGCircleElement;
    const circ = Number(arc.style.getPropertyValue('--circ'));
    expect(Number(arc.style.getPropertyValue('--offset'))).toBeCloseTo(circ, 1); // fully hidden
    expect(container.textContent).toContain('✕');
  });
});
