import { IS_FLAVOR_APP } from '../flavors/current';

/**
 * Builds a deep link into Captain Adel pre-primed with a question. Mirrors the
 * legacy FGCalc "Ask Captain Adel to explain" affordance, which passes the
 * prompt as ?q= to the chat page.
 *
 * Standalone prep-app (flavor) builds ship without the chat surface, so this
 * returns null there — every "Ask Captain Adel" affordance already null-checks
 * it, which removes the buttons across the app with no per-surface changes.
 */
export function adelLink(prompt: string | null | undefined): string | null {
  if (IS_FLAVOR_APP || !prompt) return null;
  return `/chat?q=${encodeURIComponent(prompt)}`;
}
