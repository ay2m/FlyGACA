import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SunArc } from '@/components/SunArc';

/** The sun rides a semicircle: R=88 about centre (100,100). */
describe('<SunArc />', () => {
  it('parks the sun at solar noon (apex) when progress is null', () => {
    const { container } = render(<SunArc progress={null} label="sun path" />);
    const sun = container.querySelector('g[style]') as SVGGElement;
    expect(sun.style.getPropertyValue('--x')).toBe('100.0px');
    expect(sun.style.getPropertyValue('--y')).toBe('12.0px');
  });

  it('places the sun at the left horizon at sunrise (progress 0)', () => {
    const { container } = render(<SunArc progress={0} label="sun path" />);
    const sun = container.querySelector('g[style]') as SVGGElement;
    expect(sun.style.getPropertyValue('--x')).toBe('12.0px');
    expect(sun.style.getPropertyValue('--y')).toBe('100.0px');
  });
});
