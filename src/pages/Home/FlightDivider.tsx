import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import styles from './FlightDivider.module.css';

/**
 * A section divider shaped like a flight plan: a dashed great-circle arc with
 * the Fly GACA falcon tracking along it. Idle, the falcon flies a slow CSS
 * loop; once the user scrolls it scrubs to their scroll position through the
 * section (the comp's signature touch). Reduced-motion leaves it parked and
 * static. Decorative — hidden from assistive tech.
 */
export function FlightDivider() {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const falconRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (reduce) return;
    const wrap = ref.current;
    const falcon = falconRef.current;
    if (!wrap || !falcon) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // 0 as the divider enters from the bottom → 1 as it leaves past the top.
      const frac = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      falcon.style.animation = 'none';
      falcon.style.insetInlineStart = `${(frac * 100).toFixed(2)}%`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduce]);

  return (
    <div ref={ref} className={styles.divider} aria-hidden="true">
      <svg viewBox="0 0 1200 88" preserveAspectRatio="none" className={styles.path}>
        <path className={styles.line} d="M0 44 Q 300 18 600 44 T 1200 44" />
      </svg>
      <img
        ref={falconRef}
        className={styles.falcon}
        src="/img/flygaca-mark.png"
        alt=""
        width="26"
        height="26"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
