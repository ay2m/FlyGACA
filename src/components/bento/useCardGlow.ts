import { useCallback, useRef } from 'react';

/**
 * Cursor-tracking border-glow. On pointer move it writes the cursor's local
 * coordinates into the `--glow-x` / `--glow-y` custom properties on the card
 * element; the CSS module consumes them in a radial-gradient so the perimeter
 * illumination follows the cursor. Style is mutated directly (no React state)
 * so there is zero re-render per move — cheap enough to stay at 120fps.
 */
export function useCardGlow<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    // Hover-capable pointers only — a touch drag must not paint (and then
    // strand) the glow. Belt-and-braces with the CSS @media (hover: hover) gate.
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
  }, []);

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Park the glow centre off-card so the gradient fades out cleanly.
    el.style.setProperty('--glow-x', '50%');
    el.style.setProperty('--glow-y', '-40%');
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
