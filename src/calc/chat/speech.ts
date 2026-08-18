/**
 * Pure helper for the voice composer: map an app language code to a
 * SpeechRecognition BCP-47 locale. Kept separate from the component so it stays
 * unit-testable (the Web Speech API itself isn't available under jsdom).
 */

/** `'ar' → 'ar-SA'` (Saudi Arabic, matching the GACAR corpus); everything else → `'en-US'`. */
export function pickSpeechLang(lang: string): string {
  return lang.toLowerCase().startsWith('ar') ? 'ar-SA' : 'en-US';
}
