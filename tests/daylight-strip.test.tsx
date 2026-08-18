import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DaylightStrip } from '@/components/aerodrome/DaylightStrip';

describe('<DaylightStrip />', () => {
  it('positions sunrise after dawn and sunset before dusk for OERK', () => {
    const { container } = render(<DaylightStrip lat={24.71} lon={46.68} />); // Riyadh
    const strip = container.querySelector('[role="img"]') as HTMLElement;
    expect(strip).not.toBeNull();
    const rise = parseFloat(strip.style.getPropertyValue('--rise'));
    const set = parseFloat(strip.style.getPropertyValue('--set'));
    // Riyadh's day sits inside the UTC axis (sunrise after 00Z, sunset before 24Z).
    expect(rise).toBeGreaterThan(0);
    expect(set).toBeLessThan(100);
    expect(set).toBeGreaterThan(rise);
  });

  it('renders nothing for non-finite coordinates', () => {
    const { container } = render(<DaylightStrip lat={NaN} lon={NaN} />);
    expect(container.firstChild).toBeNull();
  });
});
