import { useEffect, useRef } from 'react';
import styles from './ScrollProgress.module.css';

/**
 * A thin gradient bar pinned to the top of the viewport that fills as the
 * page scrolls — a quiet "you are here" cue lifted from the animated landing
 * comp. Scroll-driven (not an infinite animation), rAF-throttled, and inert
 * for keyboard/AT users (`aria-hidden`). It reads scroll position directly so
 * it carries no framer-motion onto the critical path.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const frac = max > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${frac})`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={styles.track} aria-hidden="true">
      <div ref={barRef} className={styles.bar} />
    </div>
  );
}
