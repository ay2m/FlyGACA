import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ProgressRing } from '@/components/ProgressRing';

describe('<ProgressRing />', () => {
  it('sweeps the arc proportionally to the value', () => {
    const { container } = render(<ProgressRing value={0.25} />);
    const arc = container.querySelector('circle[style*="--offset"]') as SVGCircleElement;
    const circ = Number(arc.style.getPropertyValue('--circ'));
    // A quarter filled → three quarters of the circumference stays hidden.
    expect(Number(arc.style.getPropertyValue('--offset'))).toBeCloseTo(circ * 0.75, 1);
  });

  it('clamps out-of-range values to a full ring', () => {
    const { container } = render(<ProgressRing value={2} />);
    const arc = container.querySelector('circle[style*="--offset"]') as SVGCircleElement;
    expect(Number(arc.style.getPropertyValue('--offset'))).toBeCloseTo(0, 1);
  });

  it('is decorative without a label and a progressbar with one', () => {
    const { container: plain } = render(<ProgressRing value={0.5} />);
    expect(plain.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(plain.querySelector('[role="progressbar"]')).toBeNull();

    const { getByRole } = render(<ProgressRing value={0.5} label="Saving" />);
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  });
});
