/**
 * src/components/chat/SpeakButton.tsx — reads a Captain Adel answer aloud via the
 * Web Speech Synthesis API. Feature-detects `speechSynthesis` and renders nothing
 * when unavailable. Mirrors voice-button.test.tsx's global-double approach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SpeakButton } from '@/components/chat/SpeakButton';

function installSpeechSynthesis() {
  const synth = {
    getVoices: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  // The component constructs `new SpeechSynthesisUtterance(text)`.
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return synth;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SpeakButton — feature detection', () => {
  it('renders nothing when speechSynthesis is unavailable', () => {
    // jsdom has no speechSynthesis by default.
    const { container } = render(<SpeakButton text="Hello" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('SpeakButton — speaking', () => {
  let synth: ReturnType<typeof installSpeechSynthesis>;
  beforeEach(() => {
    synth = installSpeechSynthesis();
  });

  it('renders a Listen control when supported', () => {
    render(<SpeakButton text="Hello world" />);
    const btn = screen.getByRole('button', { name: 'Listen' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('speaks the cleaned text on click and flips to the stop state', () => {
    render(<SpeakButton text="**Bold** answer" />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utter = synth.speak.mock.calls[0][0] as { text: string };
    expect(utter.text).not.toContain('**'); // markdown stripped for speech
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cancels in-flight speech when toggled off', () => {
    render(<SpeakButton text="Hello" />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen' })); // start
    synth.cancel.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' })); // stop
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  });
});
