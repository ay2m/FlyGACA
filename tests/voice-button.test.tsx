import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { VoiceButton } from '@/components/chat/VoiceButton';

/** A controllable Web Speech API double. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = false;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn(() => {
    FakeRecognition.last = this;
  });
  stop = vi.fn();
}

afterEach(() => {
  cleanup();
  FakeRecognition.last = null;
  vi.unstubAllGlobals();
});

describe('VoiceButton — unsupported', () => {
  it('renders nothing when SpeechRecognition is unavailable', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    const { container } = render(<VoiceButton onTranscript={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('VoiceButton — supported', () => {
  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
  });

  it('renders a mic button and starts listening on click', () => {
    render(<VoiceButton onTranscript={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(btn);
    expect(FakeRecognition.last?.start).toHaveBeenCalled();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('hands the recognised transcript back through onTranscript', () => {
    const onTranscript = vi.fn();
    render(<VoiceButton onTranscript={onTranscript} />);
    fireEvent.click(screen.getByRole('button'));

    act(() => {
      FakeRecognition.last!.onresult!({ results: [[{ transcript: 'cleared for takeoff' }]] });
    });
    expect(onTranscript).toHaveBeenCalledWith('cleared for takeoff');
  });

  it('returns to idle when recognition ends', () => {
    render(<VoiceButton onTranscript={() => {}} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      FakeRecognition.last!.onend!();
    });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('stops the recogniser when toggled off', () => {
    render(<VoiceButton onTranscript={() => {}} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // start
    const rec = FakeRecognition.last!;
    fireEvent.click(btn); // stop
    expect(rec.stop).toHaveBeenCalled();
  });

  it('releases the mic on unmount', () => {
    const { unmount } = render(<VoiceButton onTranscript={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    const rec = FakeRecognition.last!;
    unmount();
    expect(rec.stop).toHaveBeenCalled();
  });
});
