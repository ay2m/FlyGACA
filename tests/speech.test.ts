import { describe, expect, it } from 'vitest';
import { pickSpeechLang } from '@/calc/chat/speech';

describe('pickSpeechLang', () => {
  it('maps Arabic to ar-SA', () => {
    expect(pickSpeechLang('ar')).toBe('ar-SA');
    expect(pickSpeechLang('AR')).toBe('ar-SA');
  });

  it('falls back to en-US for everything else', () => {
    expect(pickSpeechLang('en')).toBe('en-US');
    expect(pickSpeechLang('fr')).toBe('en-US');
    expect(pickSpeechLang('')).toBe('en-US');
  });
});
