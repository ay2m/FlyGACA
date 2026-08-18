/** Estimate reading time in minutes from prose text at ~200 wpm (minimum 1). */
export function readingMinutes(text: string, wpm = 200): number {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / wpm));
}
