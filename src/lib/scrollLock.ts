/**
 * Ref-counted body scroll lock shared by every overlay (More sheet, command
 * palette, onboarding tour). Overlays can overlap and close in any order —
 * per-overlay save/restore of body.style.overflow strands 'hidden' on <body>
 * when the outer overlay unmounts first, freezing scroll app-wide.
 */
let locks = 0;

export function lockBodyScroll(): void {
  if (locks === 0) document.body.style.overflow = 'hidden';
  locks += 1;
}

export function unlockBodyScroll(): void {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = '';
}
