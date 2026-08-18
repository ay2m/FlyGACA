import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GaugeDial, gaugeAngle } from '@/components/calc/GaugeDial';

describe('gaugeAngle', () => {
  it('maps min → −120°, mid → 0°, max → +120°', () => {
    expect(gaugeAngle(0, 0, 100)).toBe(-120);
    expect(gaugeAngle(50, 0, 100)).toBe(0);
    expect(gaugeAngle(100, 0, 100)).toBe(120);
  });
  it('clamps values outside the range', () => {
    expect(gaugeAngle(-50, 0, 100)).toBe(-120);
    expect(gaugeAngle(900, 0, 100)).toBe(120);
  });
  it('parks at min for garbage input or an empty range', () => {
    expect(gaugeAngle(NaN, 0, 100)).toBe(-120);
    expect(gaugeAngle(10, 100, 100)).toBe(-120);
  });
});

describe('GaugeDial', () => {
  it('renders the formatted value and unit, hidden from AT', () => {
    const { container } = render(
      <GaugeDial label="True airspeed" value={12500} min={0} max={20000} unit="FT" />,
    );
    expect(screen.getByText('12,500')).toBeInTheDocument();
    expect(screen.getByText('FT')).toBeInTheDocument();
    expect(screen.getByText('True airspeed')).toBeInTheDocument();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
  it('shows a placeholder when there is no value yet', () => {
    render(<GaugeDial label="TAS" value={null} min={0} max={400} unit="KT" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
