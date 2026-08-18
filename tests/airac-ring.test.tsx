import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AiracRing } from '@/components/AiracRing';

describe('<AiracRing />', () => {
  it('fills the arc to the fraction and labels the centre', () => {
    const { container, getByText } = render(
      <AiracRing id="2609" dayInCycle={15} fraction={0.5} label="cycle" />,
    );
    const arc = container.querySelector('circle[style*="--offset"]') as SVGCircleElement;
    const circ = Number(arc.style.getPropertyValue('--circ'));
    expect(Number(arc.style.getPropertyValue('--offset'))).toBeCloseTo(circ * 0.5, 1);
    expect(getByText('2609')).toBeTruthy();
    expect(container.textContent).toContain('15 / 28');
  });
});
