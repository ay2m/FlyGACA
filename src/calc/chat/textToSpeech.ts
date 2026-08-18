/**
 * Tiny helpers for reading Captain Adel's answers aloud via the Web Speech
 * Synthesis API. Kept out of the component so support detection stays
 * unit-testable. Language selection reuses {@link pickSpeechLang} (the same
 * EN/AR → BCP-47 mapping the voice *input* uses), so speech in and out stay in
 * sync. The actual speak/cancel calls live in the SpeakButton component since
 * they touch live browser objects.
 */

export { pickSpeechLang as pickTtsLang } from './speech';
export { toSpeechText } from './markdown';

/** True when the browser exposes a usable speech-synthesis engine. */
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}
