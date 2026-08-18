import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CountUp } from '@/components/CountUp';

/**
 * Under reduce-motion the counter renders its final figure immediately, which
 * makes the formatting contract deterministic to assert (no timers/rAF).
 */
function stubReduceMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('<CountUp />', () => {
  it('renders whole numbers by default', () => {
    stubReduceMotion();
    const { container } = render(<CountUp to={123.4} />);
    expect(container.textContent).toBe('123');
  });

  it('renders to the requested decimal places, padding trailing zeros', () => {
    stubReduceMotion();
    const { container } = render(<CountUp to={12} decimals={1} />);
    expect(container.textContent).toBe('12.0');
  });
});
