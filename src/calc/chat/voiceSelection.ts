/**
 * Pure voice ranker for Captain Adel's read-aloud. The Web Speech Synthesis API
 * exposes a list of voices that varies wildly per platform; if you never set
 * `utter.voice`, the browser falls back to its *default* engine — which on many
 * systems is a harsh, robotic voice (e.g. eSpeak). This picks the best-sounding
 * voice for the target language so Captain Adel sounds like a person.
 *
 * Kept pure (no DOM, no Web Speech objects) so it is unit-testable: it accepts a
 * plain array of {@link VoiceInfo} and returns the chosen element. The component
 * passes the live `SpeechSynthesisVoice[]` (structurally a `VoiceInfo`) and gets
 * the real voice back to assign to the utterance.
 */

export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

/** Marketing names of the natural, high-quality voices across browsers/OSes. */
const QUALITY = /natural|neural|online|enhanced|premium|google|microsoft|siri/i;
/** Known low-quality/robotic engine — the thing we're trying to avoid. */
const ROBOTIC = /espeak/i;

/** The primary subtag, lower-cased: `'en-US' → 'en'`, `'ar-SA' → 'ar'`. */
function primary(lang: string): string {
  return lang.toLowerCase().split('-')[0];
}

/**
 * Pick the best voice whose language matches `targetLang` (by primary subtag).
 * Returns `null` when no voice matches that language, so the caller can leave the
 * browser default in place rather than forcing a wrong-language voice. Generic so
 * the live `SpeechSynthesisVoice[]` flows straight through and back.
 */
export function pickVoice<T extends VoiceInfo>(voices: readonly T[], targetLang: string): T | null {
  const want = primary(targetLang);
  const candidates = voices.filter((v) => primary(v.lang) === want);
  if (candidates.length === 0) return null;

  const score = (v: T) => {
    let s = 0;
    if (QUALITY.test(v.name)) s += 10; // natural voice — the big win
    if (ROBOTIC.test(v.name)) s -= 10; // demote eSpeak & friends
    if (v.lang.toLowerCase() === targetLang.toLowerCase()) s += 3; // exact region
    if (!v.localService) s += 1; // cloud voices are usually the nicer ones
    if (v.default) s += 1; // mild tie-breaker toward the platform default
    return s;
  };

  // Highest score wins; ties keep the engine's original order (stable reduce).
  return candidates.reduce((best, v) => (score(v) > score(best) ? v : best));
}
