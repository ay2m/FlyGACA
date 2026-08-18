import { describe, expect, it, afterEach, vi } from 'vitest';
import { ttsSupported, pickTtsLang, toSpeechText } from '@/calc/chat/textToSpeech';

afterEach(() => vi.unstubAllGlobals());

describe('pickTtsLang', () => {
  it('mirrors the voice-input language mapping', () => {
    expect(pickTtsLang('ar')).toBe('ar-SA');
    expect(pickTtsLang('en')).toBe('en-US');
  });
});

describe('ttsSupported', () => {
  it('is true when speechSynthesis is present', () => {
    vi.stubGlobal('window', { speechSynthesis: {} });
    expect(ttsSupported()).toBe(true);
  });

  it('is false when the engine is absent', () => {
    vi.stubGlobal('window', {});
    expect(ttsSupported()).toBe(false);
  });
});

describe('toSpeechText (re-exported for SpeakButton)', () => {
  it('strips markdown so the engine speaks clean prose', () => {
    expect(toSpeechText('see **GACAR** at `91.155`')).toBe('see GACAR at 91.155.');
  });
});
