import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ZuluDial } from '@/components/ZuluDial';

describe('<ZuluDial />', () => {
  it('renders a labelled clock face with a live Zulu readout', () => {
    const { container, getByText } = render(<ZuluDial />);
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    // Digital Zulu reads HH:MM:SSZ (the seconds + Z distinguish it from KSA).
    expect(getByText(/\d{2}:\d{2}:\d{2}Z/)).toBeTruthy();
  });
});
