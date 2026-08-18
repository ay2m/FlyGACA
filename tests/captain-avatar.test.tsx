import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@/i18n';

// Captain Adel's portrait swaps to an animated idle loop (`avatar-live.webp`)
// only when he is presented as live, the caller opts into `animated`, and the
// user allows motion — otherwise (and on any load failure) it stays a still.
// `useReducedMotion` is mocked so the motion branch is deterministic in jsdom.
const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => motion.reduce }));

import { CaptainAvatar } from '@/components/CaptainAvatar';

const imgOf = (c: HTMLElement) => c.querySelector('img') as HTMLImageElement;

afterEach(() => {
  cleanup();
  motion.reduce = false;
});

describe('<CaptainAvatar />', () => {
  it('renders a still portrait by default (not live, not animated)', () => {
    const { container } = render(<CaptainAvatar />);
    expect(imgOf(container).getAttribute('src')).toBe('/img/captain/avatar-256.png');
  });

  it('plays the animated loop only when live + animated + motion allowed', () => {
    const { container } = render(<CaptainAvatar live animated />);
    expect(imgOf(container).getAttribute('src')).toBe('/img/captain/avatar-live.webp');
  });

  it('stays a still when animated but not live', () => {
    const { container } = render(<CaptainAvatar animated />);
    expect(imgOf(container).getAttribute('src')).not.toContain('avatar-live.webp');
  });

  it('honours reduced motion — the still, never the loop', () => {
    motion.reduce = true;
    const { container } = render(<CaptainAvatar live animated />);
    expect(imgOf(container).getAttribute('src')).not.toContain('avatar-live.webp');
  });

  it('falls back to the still if the loop fails to load', () => {
    const { container } = render(<CaptainAvatar live animated />);
    const img = imgOf(container);
    expect(img.getAttribute('src')).toBe('/img/captain/avatar-live.webp');
    fireEvent.error(img);
    expect(imgOf(container).getAttribute('src')).toBe('/img/captain/avatar-256.png');
  });
});
