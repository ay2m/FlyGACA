import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import styles from './HeroAmbient.module.css';

/**
 * Ambient hero polish from the landing comp, all scoped to the parent
 * `<section>` and skipped entirely under reduced-motion:
 *   • a drifting teal/sage particle field behind the copy,
 *   • a soft glow that tracks the cursor across the hero,
 *   • magnetic lean on any `[data-magnetic]` control (the hero CTAs).
 * Rendered as the first child of the hero section; purely decorative, so the
 * whole layer is `aria-hidden`.
 */
export function HeroAmbient() {
  const reduce = usePrefersReducedMotion();
  const layerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const layer = layerRef.current;
    const field = fieldRef.current;
    const glow = glowRef.current;
    const hero = layer?.parentElement;
    if (!layer || !field || !glow || !hero) return;

    // Spawn the particle field (varying size, speed, drift, opacity).
    const COUNT = 22;
    for (let i = 0; i < COUNT; i++) {
      const p = document.createElement('span');
      p.className = styles.particle;
      // Vary by index so it stays deterministic (no Math.random reliance issues).
      const size = 2 + ((i * 7) % 5);
      const dur = 7 + ((i * 13) % 9);
      p.style.inlineSize = `${size}px`;
      p.style.blockSize = `${size}px`;
      p.style.insetInlineStart = `${(i * 53) % 100}%`;
      p.style.insetBlockStart = `${60 + ((i * 29) % 45)}%`;
      p.style.background = i % 2 ? 'var(--teal-bright)' : 'var(--sage-bright)';
      p.style.setProperty('--p-op', (0.25 + ((i * 17) % 40) / 100).toFixed(2));
      p.style.setProperty('--p-dx', `${((i * 11) % 40) - 20}px`);
      p.style.animationDuration = `${dur}s`;
      p.style.animationDelay = `${-((i * 31) % (dur * 100)) / 100}s`;
      field.appendChild(p);
    }

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      glow.style.opacity = '1';
      glow.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    };
    const onLeave = () => {
      glow.style.opacity = '0';
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);

    // Magnetic lean on the hero CTAs.
    const magnets = Array.from(hero.querySelectorAll<HTMLElement>('[data-magnetic]'));
    const cleanups = magnets.map((el) => {
      el.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)';
      const move = (ev: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (ev.clientX - (r.left + r.width / 2)) * 0.3;
        const dy = (ev.clientY - (r.top + r.height / 2)) * 0.4;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      };
      const reset = () => {
        el.style.transform = 'translate(0, 0)';
      };
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', reset);
      return () => {
        el.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', reset);
        el.style.transform = '';
        el.style.transition = '';
      };
    });

    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      cleanups.forEach((fn) => fn());
      field.replaceChildren();
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      <div ref={fieldRef} className={styles.field} />
      <div ref={glowRef} className={styles.glow} />
    </div>
  );
}
