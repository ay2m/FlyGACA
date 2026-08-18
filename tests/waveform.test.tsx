import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Waveform } from '@/components/chat/Waveform';

describe('<Waveform />', () => {
  it('renders the requested number of decorative bars', () => {
    const { container } = render(<Waveform bars={5} />);
    const wave = container.firstElementChild as HTMLElement;
    expect(wave.getAttribute('aria-hidden')).toBe('true');
    expect(wave.children.length).toBe(5);
  });

  it('defaults to four bars', () => {
    const { container } = render(<Waveform />);
    expect((container.firstElementChild as HTMLElement).children.length).toBe(4);
  });
});
