import { describe, expect, it } from 'vitest';
import { pickVoice, type VoiceInfo } from '@/calc/chat/voiceSelection';

const v = (over: Partial<VoiceInfo>): VoiceInfo => ({
  name: 'Voice',
  lang: 'en-US',
  localService: true,
  default: false,
  ...over,
});

describe('pickVoice', () => {
  it('prefers a natural/Google voice over a default robotic one', () => {
    const robotic = v({ name: 'English (America)+eSpeak', default: true });
    const google = v({ name: 'Google US English', localService: false });
    expect(pickVoice([robotic, google], 'en-US')).toBe(google);
  });

  it('ranks an eSpeak voice below any non-eSpeak same-language voice', () => {
    const espeak = v({ name: 'eSpeak en-us' });
    const plain = v({ name: 'Daniel' });
    expect(pickVoice([espeak, plain], 'en-US')).toBe(plain);
  });

  it('prefers an exact-region match over a same-language other region', () => {
    const gb = v({ name: 'Daniel', lang: 'en-GB' });
    const us = v({ name: 'Alex', lang: 'en-US' });
    expect(pickVoice([gb, us], 'en-US')).toBe(us);
  });

  it('matches by primary subtag so en-GB is still usable for an en-US target', () => {
    const gb = v({ name: 'Daniel', lang: 'en-GB' });
    expect(pickVoice([gb], 'en-US')).toBe(gb);
  });

  it('stays within the target language even when another language scores higher', () => {
    const englishGoogle = v({ name: 'Google US English', lang: 'en-US', localService: false });
    const arabic = v({ name: 'Maged', lang: 'ar-SA' });
    expect(pickVoice([englishGoogle, arabic], 'ar-SA')).toBe(arabic);
  });

  it('returns null when no voice matches the language', () => {
    expect(pickVoice([v({ lang: 'en-US' })], 'ar-SA')).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(pickVoice([], 'en-US')).toBeNull();
  });
});
